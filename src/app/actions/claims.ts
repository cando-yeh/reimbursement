'use server';

import { prisma } from '@/lib/prisma';
import { ClaimStatus, ClaimType } from '@/types/prisma';
import { Claim, ClaimHistory, ClaimItem } from '@/types';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { formatDateOnly, formatOptionalDate } from '@/utils/date';
import { APPROVER_REQUIRED_MESSAGE } from '@/utils/messages';

// --- Helpers ---
export async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

function normalizeClaimForClient(claim: any): Claim {
    return {
        ...claim,
        lineItems: (claim.lineItems || []).map((li: any) => ({
            ...li,
            date: formatDateOnly(li.date)
        })),
        history: (claim.history || []).map((h: any) => ({
            ...h,
            timestamp: h.timestamp.toISOString()
        })),
        paymentDetails: claim.paymentDetails ? (claim.paymentDetails as any) : undefined,
        serviceDetails: claim.serviceDetails ? (claim.serviceDetails as any) : undefined,
        date: formatDateOnly(claim.date),
        datePaid: formatOptionalDate(claim.datePaid),
    };
}

function dashboardCacheTag(applicantId?: string | null) {
    return applicantId ? `dashboard:${applicantId}` : 'dashboard:unknown';
}

function claimsCacheTag(applicantId?: string | null) {
    return applicantId ? `claims:list:${applicantId}` : 'claims:list:all';
}

function reviewCountsCacheTag() {
    return 'claims:review-counts';
}

function normalizeStatusKey(status?: string | string[]) {
    if (!status) return 'all';
    if (Array.isArray(status)) {
        return status.slice().sort().join(',');
    }
    return status;
}

function revalidateDashboardTag(applicantId?: string | null) {
    revalidateTag(dashboardCacheTag(applicantId), 'default');
}

function revalidateClaimsTag(applicantId?: string | null) {
    revalidateTag(claimsCacheTag(applicantId), 'default');
}

function revalidateReviewCountsTag() {
    revalidateTag(reviewCountsCacheTag(), 'default');
}

export async function getClaims(filters?: {
    status?: string | string[];
    applicantId?: string;
    page?: number;
    pageSize?: number;
    compact?: boolean;
    cache?: boolean;
    type?: string;
    payee?: string;
    excludeDraft?: boolean;
}) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const compact = filters?.compact ?? false;
    const shouldCache = filters?.cache ?? false;
    const payeeQuery = filters?.payee?.trim();

    const whereClause: any = {};
    if (filters?.status) {
        if (Array.isArray(filters.status)) {
            whereClause.status = { in: filters.status as ClaimStatus[] };
        } else {
            whereClause.status = filters.status as ClaimStatus;
        }
    } else if (filters?.excludeDraft) {
        whereClause.status = { not: 'draft' as ClaimStatus };
    }
    if (filters?.applicantId) {
        whereClause.applicantId = filters.applicantId;
    }
    if (filters?.type) {
        whereClause.type = filters.type as ClaimType;
    }
    if (payeeQuery) {
        whereClause.payee = { contains: payeeQuery, mode: 'insensitive' };
    }

    const fetchClaims = async () => {
        try {
            // Fetch count and data in parallel
            const [totalCount, rawClaims] = await Promise.all([
                (prisma.claim as any).count({ where: whereClause }),
                (prisma.claim as any).findMany({
                    where: whereClause,
                    orderBy: { date: 'desc' },
                    skip: skip,
                    take: pageSize,
                    ...(compact
                        ? {
                            select: {
                                id: true,
                                type: true,
                                payee: true,
                                payeeId: true,
                                applicantId: true,
                                date: true,
                                status: true,
                                description: true,
                                amount: true,
                                noReceiptReason: true,
                                paymentDetails: true,
                                applicant: {
                                    select: { name: true, email: true, roleName: true }
                                }
                            }
                        }
                        : {
                            include: {
                                applicant: {
                                    select: { name: true, email: true, roleName: true }
                                },
                                lineItems: true,
                                history: true
                            }
                        })
                })
            ]);

            // Safe Cast JSON fields
            const claims: Claim[] = rawClaims.map(normalizeClaimForClient);

            return {
                success: true,
                data: claims,
                pagination: {
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                    currentPage: page,
                    pageSize
                }
            };
        } catch (error: any) {
            console.error('Error fetching claims:', error);
            return { success: false, error: '無法取得申請單資料' };
        }
    };

    if (!shouldCache) {
        return fetchClaims();
    }

    const statusKey = normalizeStatusKey(filters?.status);
    const cacheKey = [
        'claims',
        filters?.applicantId ?? 'all',
        statusKey,
        filters?.type ?? 'all',
        payeeQuery ?? 'all',
        filters?.excludeDraft ? 'exclude-draft' : 'include-draft',
        String(page),
        String(pageSize),
        compact ? 'compact' : 'full',
        'v1'
    ];
    const cachedFetch = unstable_cache(fetchClaims, cacheKey, {
        revalidate: 30,
        tags: [claimsCacheTag(filters?.applicantId)]
    });

    return cachedFetch();
}

export async function getClaimById(id: string) {
    try {
        const claim = await (prisma.claim as any).findUnique({
            where: { id },
            include: {
                applicant: {
                    select: { name: true, email: true, roleName: true }
                },
                lineItems: true,
                history: true
            }
        });

        if (!claim) {
            return { success: false, error: 'Claim not found' };
        }

        return { success: true, data: normalizeClaimForClient(claim) };
    } catch (error: any) {
        console.error('Error fetching claim by id:', error);
        return { success: false, error: '無法取得申請單資料' };
    }
}

export async function createClaim(data: any) {
    try {
        const user = await getCurrentUser();
        if (!user) return { success: false, error: '請先登入' };

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email || '' }
        });

        if (!dbUser) return { success: false, error: '找不到使用者資料' };

        // Support both 'items' (from frontend) and 'lineItems'
        const itemsToCreate = data.lineItems || data.items || [];
        const calculatedAmount = itemsToCreate.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        const initialStatus = 'pending_approval';
        const requestedStatus = data.status || initialStatus;
        if (requestedStatus !== 'draft' && !dbUser.approverId) {
            return { success: false, error: APPROVER_REQUIRED_MESSAGE };
        }
        const id = Math.random().toString(36).substring(2, 10);

        const newClaim = await (prisma.claim as any).create({
            data: {
                id: id,
                type: data.type as ClaimType,
                payee: data.payee,
                payeeId: data.payeeId,
                applicantId: dbUser.id,
                date: new Date(data.date),
                status: requestedStatus as ClaimStatus,
                description: data.description,
                amount: data.amount || calculatedAmount,
                lineItems: {
                    create: itemsToCreate.map((item: any) => ({
                        date: new Date(item.date),
                        amount: item.amount,
                        description: item.description,
                        category: item.category,
                        invoiceNumber: item.invoiceNumber,
                        notes: item.notes,
                        fileUrl: item.fileUrl
                    }))
                },
                paymentDetails: data.paymentDetails ? (data.paymentDetails as any) : undefined,
                serviceDetails: data.serviceDetails ? (data.serviceDetails as any) : undefined,
                evidenceFiles: data.evidenceFiles || [],
                noReceiptReason: data.noReceiptReason,
                history: {
                    create: [
                        {
                            timestamp: new Date().toISOString(),
                            actorId: dbUser.id,
                            actorName: dbUser.name,
                            action: (data.status === 'draft') ? 'draft' : 'submitted',
                        }
                    ]
                }
            },
            include: {
                lineItems: true,
                history: true
            }
        });

        revalidatePath('/');
        revalidateDashboardTag(dbUser.id);
        revalidateClaimsTag(dbUser.id);
        revalidateReviewCountsTag();
        return {
            success: true,
            data: normalizeClaimForClient(newClaim)
        };
    } catch (error: any) {
        console.error('Create Claim Error:', error);
        return { success: false, error: '建立申請單失敗: ' + error.message };
    }
}

export async function updateClaimStatus(id: string, newStatus: string, note?: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({ where: { email: user.email || '' } });
    const actorName = dbUser?.name || user.email || 'System';
    const actorId = dbUser?.id || user.id;

    try {
        const currentClaim = await prisma.claim.findUnique({ where: { id } });
        if (!currentClaim) return { success: false, error: 'Claim not found' };

        const newHistoryItem = {
            timestamp: new Date().toISOString(),
            actorId: actorId,
            actorName: actorName,
            action: `status_change_to_${newStatus}`,
            note: note
        };

        const updatedClaim = await (prisma.claim as any).update({
            where: { id },
            data: {
                status: newStatus as ClaimStatus,
                history: {
                    create: newHistoryItem
                }
            },
            include: { lineItems: true, history: true }
        });

        revalidatePath('/');
        revalidateDashboardTag(currentClaim.applicantId);
        revalidateClaimsTag(currentClaim.applicantId);
        revalidateReviewCountsTag();
        return {
            success: true,
            data: normalizeClaimForClient(updatedClaim)
        };
    } catch (error: any) {
        console.error('Update Status Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateClaim(id: string, data: any) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({ where: { email: user.email || '' } });
    if (!dbUser) return { success: false, error: 'User not found' };

    try {
        const currentClaim = await (prisma.claim as any).findUnique({
            where: { id },
            include: { lineItems: true }
        });
        if (!currentClaim) return { success: false, error: 'Claim not found' };

        const isPrivileged =
            (dbUser.permissions && (dbUser.permissions.includes('finance_audit') || dbUser.permissions.includes('user_management'))) ||
            dbUser.roleName.includes('財務') ||
            dbUser.roleName.includes('管理者');

        if (currentClaim.applicantId !== dbUser.id && !isPrivileged) {
            return { success: false, error: 'Permission denied' };
        }

        const itemsToUpdate = data.lineItems || data.items;
        let amount = data.amount;
        if (itemsToUpdate) {
            amount = itemsToUpdate.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
        }

        if (data.status === 'pending_approval' && !dbUser.approverId && currentClaim.applicantId === dbUser.id) {
            return { success: false, error: APPROVER_REQUIRED_MESSAGE };
        }

        if (data.status && (data.status === 'pending_approval' || data.status === 'pending_finance') && currentClaim.status !== data.status) {
            await (prisma as any).claimHistory.create({
                data: {
                    claimId: id,
                    timestamp: new Date().toISOString(),
                    actorId: dbUser.id,
                    actorName: dbUser.name,
                    action: 'submitted',
                }
            });
        }

        // Cleanup Storage 
        if (itemsToUpdate || data.evidenceFiles) {
            const oldFileUrls = [
                ...(currentClaim.evidenceFiles || []),
                ...currentClaim.lineItems.map((li: any) => li.fileUrl).filter(Boolean)
            ] as string[];

            const newFileUrls = [
                ...(data.evidenceFiles || currentClaim.evidenceFiles || []),
                ...(itemsToUpdate ? itemsToUpdate.map((i: any) => i.fileUrl).filter(Boolean) : currentClaim.lineItems.map((li: any) => li.fileUrl).filter(Boolean))
            ] as string[];

            const urlsToDelete = oldFileUrls.filter(url => !newFileUrls.includes(url));
            if (urlsToDelete.length > 0) {
                deleteFilesFromStorage(urlsToDelete);
            }
        }

        // Sync lineItems
        if (itemsToUpdate) {
            const newItemIds = itemsToUpdate
                .map((i: any) => i.id)
                .filter((id: string) => id && !id.startsWith('temp-') && id.length > 10);

            await (prisma as any).claimItem.deleteMany({
                where: {
                    claimId: id,
                    id: { notIn: newItemIds }
                }
            });

            for (const item of itemsToUpdate) {
                const itemData = {
                    date: new Date(item.date),
                    amount: item.amount,
                    description: item.description,
                    category: item.category,
                    invoiceNumber: item.invoiceNumber,
                    notes: item.notes,
                    fileUrl: item.fileUrl,
                    claimId: id
                };

                const isExisting = item.id && !item.id.startsWith('temp-') && item.id.length > 10;
                if (isExisting) {
                    await (prisma as any).claimItem.update({ where: { id: item.id }, data: itemData });
                } else {
                    await (prisma as any).claimItem.create({ data: itemData });
                }
            }
        }

        const updatedClaim = await (prisma.claim as any).update({
            where: { id },
            data: {
                ...data,
                amount: amount,
                type: data.type as ClaimType | undefined,
                status: data.status as ClaimStatus | undefined,
                date: data.date ? new Date(data.date) : undefined,
                updatedAt: new Date(),
                items: undefined
            } as any,
            include: { lineItems: true, history: true }
        });

        revalidatePath('/');
        revalidateDashboardTag(updatedClaim.applicantId);
        revalidateClaimsTag(updatedClaim.applicantId);
        revalidateReviewCountsTag();
        return {
            success: true,
            data: normalizeClaimForClient(updatedClaim)
        };
    } catch (error: any) {
        console.error('Update Claim Error:', error);
        return { success: false, error: error.message };
    }
}

async function deleteFilesFromStorage(urls: string[]) {
    if (!urls || urls.length === 0) return;
    try {
        const supabase = await createClient();
        const pathsToDelete = urls.map(url => {
            const parts = url.split('/receipts/');
            return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
            await supabase.storage.from('receipts').remove(pathsToDelete);
        }
    } catch (error) {
        console.error('Storage Deletion Error:', error);
    }
}

export async function deleteClaim(id: string) {
    try {
        const claim = await (prisma.claim as any).findUnique({
            where: { id },
            include: { lineItems: true }
        });

        if (claim) {
            const urls: string[] = [
                ...(claim.evidenceFiles || []),
                ...claim.lineItems.map((li: any) => li.fileUrl).filter(Boolean)
            ] as string[];
            if (urls.length > 0) await deleteFilesFromStorage(urls);
        }

        await prisma.claim.delete({ where: { id } });
        revalidatePath('/');
        revalidateDashboardTag(claim?.applicantId);
        revalidateClaimsTag(claim?.applicantId);
        revalidateReviewCountsTag();
        return { success: true };
    } catch (error: any) {
        console.error('Delete Claim Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getMyClaimCounts(applicantId: string) {
    try {
        const [drafts, evidence, returned, inReview, pendingPayment, closed] = await Promise.all([
            (prisma.claim as any).count({ where: { applicantId, status: 'draft' } }),
            (prisma.claim as any).count({ where: { applicantId, status: 'pending_evidence' } }),
            (prisma.claim as any).count({ where: { applicantId, status: 'rejected' } }),
            (prisma.claim as any).count({
                where: {
                    applicantId,
                    status: { in: ['pending_approval', 'pending_finance', 'pending_finance_review'] }
                }
            }),
            (prisma.claim as any).count({ where: { applicantId, status: 'approved' } }),
            (prisma.claim as any).count({ where: { applicantId, status: { in: ['completed', 'cancelled'] } } }),
        ]);

        return {
            success: true,
            data: { drafts, evidence, returned, inReview, pendingPayment, closed }
        };
    } catch (error) {
        console.error('Error fetching claim counts:', error);
        return { success: false, error: '無法取得統計數據' };
    }
}

export async function getReviewBadgeCounts(params: { userId: string; includeFinance?: boolean }) {
    const includeFinance = params.includeFinance ?? false;
    const cacheKey = ['review-counts', params.userId, includeFinance ? 'finance' : 'nofinance', 'v1'];
    const cachedFetch = unstable_cache(async () => {
        try {
            const managerApprovalsPromise = (prisma.claim as any).count({
                where: {
                    status: 'pending_approval',
                    applicant: { approverId: params.userId }
                }
            });

            const financeReviewPromise = includeFinance
                ? (prisma.claim as any).count({ where: { status: { in: ['pending_finance', 'pending_finance_review'] } } })
                : Promise.resolve(0);

            const financePaymentPromise = includeFinance
                ? (prisma.claim as any).count({ where: { status: 'approved' } })
                : Promise.resolve(0);

            const [managerApprovals, financeReview, financePayment] = await Promise.all([
                managerApprovalsPromise,
                financeReviewPromise,
                financePaymentPromise
            ]);

            return {
                success: true,
                data: {
                    managerApprovals,
                    financeReview,
                    financePayment
                }
            };
        } catch (error) {
            console.error('Error fetching review badge counts:', error);
            return { success: false, error: 'Failed to fetch review badge counts' };
        }
    }, cacheKey, { revalidate: 60, tags: [reviewCountsCacheTag()] });

    return cachedFetch();
}

export async function getDashboardData(filters: {
    applicantId: string;
    status?: string | string[];
    page?: number;
    pageSize?: number;
}) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 10;
    const statusKey = normalizeStatusKey(filters.status);
    const cacheKey = ['dashboard', filters.applicantId, statusKey, String(page), String(pageSize), 'v1'];
    const cachedFetch = unstable_cache(async () => {
        const [countsResult, claimsResult] = await Promise.all([
            getMyClaimCounts(filters.applicantId),
            getClaims({
                applicantId: filters.applicantId,
                status: filters.status,
                page,
                pageSize,
                compact: true
            })
        ]);

        if (!countsResult.success) {
            return { success: false, error: countsResult.error };
        }

        if (!claimsResult.success) {
            return { success: false, error: claimsResult.error };
        }

        if (!countsResult.data || !claimsResult.data || !claimsResult.pagination) {
            return { success: false, error: 'Failed to load dashboard data' };
        }

        return {
            success: true,
            data: {
                counts: countsResult.data,
                claims: claimsResult.data,
                pagination: claimsResult.pagination
            }
        };
    }, cacheKey, { revalidate: 30, tags: [dashboardCacheTag(filters.applicantId)] });

    return cachedFetch();
}

/**
 * Get sidebar badge counts for a specific user.
 * Returns counts for "my claims" and "reviews" badges.
 * Cached for 60s to reduce DB hits on navigation.
 */
export async function getSidebarBadgeCounts(params: {
    userId: string;
    isFinance: boolean;
    isManager: boolean;
}) {
    const { userId, isFinance, isManager } = params;
    const cacheKey = ['sidebar-badges', userId, isFinance ? 'f' : '', isManager ? 'm' : '', 'v1'];

    const cachedFetch = unstable_cache(async () => {
        try {
            // My claims counts
            const [drafts, pendingEvidence, returned] = await Promise.all([
                prisma.claim.count({ where: { applicantId: userId, status: 'draft' } }),
                prisma.claim.count({ where: { applicantId: userId, status: 'pending_evidence' } }),
                prisma.claim.count({ where: { applicantId: userId, status: 'rejected' } }),
            ]);

            // Manager approvals (pending_approval where user is the approver)
            const managerApprovals = isManager
                ? await prisma.claim.count({
                    where: {
                        status: 'pending_approval',
                        applicant: { approverId: userId }
                    }
                })
                : 0;

            // Finance counts
            let financeReview = 0;
            let pendingPayment = 0;
            let vendorApprovals = 0;
            if (isFinance) {
                const [fr, pp, va] = await Promise.all([
                    prisma.claim.count({ where: { status: { in: ['pending_finance', 'pending_finance_review'] } } }),
                    prisma.claim.count({ where: { status: 'approved' } }),
                    prisma.vendorRequest.count({ where: { status: 'pending' } }),
                ]);
                financeReview = fr;
                pendingPayment = pp;
                vendorApprovals = va;
            }

            return {
                success: true,
                data: {
                    myClaimsBadge: drafts + pendingEvidence + returned,
                    reviewBadge: managerApprovals + financeReview + pendingPayment + vendorApprovals,
                    // Individual counts if needed later
                    drafts,
                    pendingEvidence,
                    returned,
                    managerApprovals,
                    financeReview,
                    pendingPayment,
                    vendorApprovals,
                }
            };
        } catch (error) {
            console.error('Error fetching sidebar badge counts:', error);
            return { success: false, error: 'Failed to fetch sidebar badge counts' };
        }
    }, cacheKey, { revalidate: 60, tags: [dashboardCacheTag(userId), reviewCountsCacheTag()] });

    return cachedFetch();
}
