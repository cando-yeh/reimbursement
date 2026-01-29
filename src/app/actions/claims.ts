'use server';

import { prisma } from '@/lib/prisma';
import { ClaimStatus, ClaimType } from '@/types/prisma';
import { Claim, ClaimHistory, ClaimItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

// --- Helpers ---
export async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getClaims(filters?: { status?: string }) {
    const whereClause: any = {};
    if (filters?.status) {
        whereClause.status = filters.status as ClaimStatus;
    }

    try {
        // Fetch raw data
        const rawClaims = await (prisma.claim as any).findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                applicant: {
                    select: { name: true, email: true, roleName: true }
                },
                lineItems: true,
                history: true
            }
        });

        // Safe Cast JSON fields
        const claims: Claim[] = rawClaims.map((c: any) => ({
            ...c,
            // Map lineItems from DB table
            lineItems: (c.lineItems || []).map((li: any) => ({
                ...li,
                date: li.date.toISOString().split('T')[0]
            })),
            history: (c.history || []).map((h: any) => ({
                ...h,
                timestamp: h.timestamp.toISOString()
            })),
            paymentDetails: c.paymentDetails ? (c.paymentDetails as any) : undefined,
            serviceDetails: c.serviceDetails ? (c.serviceDetails as any) : undefined,
            date: c.date.toISOString().split('T')[0],
            datePaid: c.datePaid?.toISOString().split('T')[0],
        }));

        return { success: true, data: claims };
    } catch (error: any) {
        console.error('Error fetching claims:', error);
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
        const initialStatus = dbUser.approverId ? 'pending_approval' : 'pending_finance';
        const id = Math.random().toString(36).substring(2, 10);

        const newClaim = await (prisma.claim as any).create({
            data: {
                id: id,
                type: data.type as ClaimType,
                payee: data.payee,
                payeeId: data.payeeId,
                applicantId: dbUser.id,
                date: new Date(data.date),
                status: (data.status || initialStatus) as ClaimStatus,
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
        return {
            success: true,
            data: {
                ...newClaim,
                lineItems: newClaim.lineItems.map((li: any) => ({ ...li, date: li.date.toISOString().split('T')[0] })),
                date: newClaim.date.toISOString().split('T')[0],
                datePaid: newClaim.datePaid?.toISOString().split('T')[0],
            }
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

        const updatedClaim = await prisma.claim.update({
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
        return {
            success: true,
            data: {
                ...(updatedClaim as any),
                history: (updatedClaim as any).history.map((h: any) => ({ ...h, timestamp: h.timestamp.toISOString() })),
                lineItems: (updatedClaim as any).lineItems.map((li: any) => ({ // Added (updatedClaim as any)
                    ...li,
                    date: li.date.toISOString().split('T')[0]
                })),
                date: updatedClaim.date.toISOString().split('T')[0],
                datePaid: updatedClaim.datePaid?.toISOString().split('T')[0],
            }
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

        const currentHistory = (currentClaim.history as unknown as ClaimHistory[]) || [];
        let newHistory = [...currentHistory];

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
        return {
            success: true,
            data: {
                ...(updatedClaim as any),
                history: (updatedClaim as any).history.map((h: any) => ({ ...h, timestamp: h.timestamp.toISOString() })),
                lineItems: (updatedClaim as any).lineItems.map((li: any) => ({ ...li, date: li.date.toISOString().split('T')[0] })),
                date: updatedClaim.date.toISOString().split('T')[0],
                datePaid: updatedClaim.datePaid?.toISOString().split('T')[0],
            }
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
        return { success: true };
    } catch (error: any) {
        console.error('Delete Claim Error:', error);
        return { success: false, error: error.message };
    }
}
