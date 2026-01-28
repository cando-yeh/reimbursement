'use server';

import { prisma } from '@/lib/prisma';
import { ClaimStatus, ClaimType } from '@/types/prisma';
import { Claim, ClaimHistory, ExpenseItem } from '@/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

// --- Types for Input ---
// We omit system-managed fields
type CreateClaimInput = Omit<Claim, 'id' | 'createdAt' | 'updatedAt' | 'datePaid' | 'history' | 'paymentId' | 'applicantId'> & {
    amount?: number;
};

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
        const rawClaims = await prisma.claim.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            include: {
                applicant: {
                    select: { name: true, email: true, roleName: true }
                }
            }
        });

        // Safe Cast JSON fields
        const claims: Claim[] = rawClaims.map((c: any) => ({
            ...c,
            // Cast JSON back to specific types
            items: (c.items as unknown as ExpenseItem[]) || [],
            history: (c.history as unknown as ClaimHistory[]) || [],
            paymentDetails: c.paymentDetails ? (c.paymentDetails as any) : undefined,
            serviceDetails: c.serviceDetails ? (c.serviceDetails as any) : undefined,
            // Ensure dates are strings for frontend consistency if needed, 
            // BUT our Claim type says `date: string`. Prisma returns Date object.
            // We need to convert Dates to strings to pass to Client Components if they expect strings.
            date: c.date.toISOString().split('T')[0],
            datePaid: c.datePaid?.toISOString().split('T')[0],
            // Create a virtual user object from relation if needed, or rely on applicantId
        }));

        return { success: true, data: claims };
    } catch (error: any) {
        console.error('Error fetching claims:', error);
        return { success: false, error: '無法取得申請單資料' };
    }
}

export async function createClaim(data: CreateClaimInput) {
    try {
        console.log('--- createClaim Input ---');
        console.log(JSON.stringify(data, null, 2));

        const user = await getCurrentUser();
        if (!user) {
            return { success: false, error: '請先登入' };
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email || '' }
        });

        if (!dbUser) {
            return { success: false, error: '找不到使用者資料 (請聯絡管理員)' };
        }

        const calculatedAmount = (data.items || []).reduce((sum, item) => sum + item.amount, 0);

        // Initial Status Logic
        const initialStatus = dbUser.approverId ? 'pending_approval' : 'pending_finance';

        // Custom 8-char ID
        const id = Math.random().toString(36).substring(2, 10);

        const newClaim = await prisma.claim.create({
            data: {
                id: id,
                type: data.type as ClaimType,
                payee: data.payee,
                payeeId: data.payeeId,
                applicantId: dbUser.id,
                date: new Date(data.date), // Convert string to Date
                status: (data.status || initialStatus) as ClaimStatus,
                description: data.description,
                amount: data.amount || calculatedAmount,
                items: (data.items || []) as any, // Prisma handles JSON
                paymentDetails: data.paymentDetails ? (data.paymentDetails as any) : undefined,
                serviceDetails: data.serviceDetails ? (data.serviceDetails as any) : undefined,
                evidenceFiles: data.evidenceFiles || [], // Default to empty array if undefined
                noReceiptReason: data.noReceiptReason,
                history: [
                    {
                        timestamp: new Date().toISOString(),
                        actorId: dbUser.id,
                        actorName: dbUser.name,
                        action: (data.status === 'draft') ? 'draft' : 'submitted',
                    }
                ] as any
            }
        });

        console.log('--- createClaim Success ---');
        console.log('Claim ID:', newClaim.id);

        revalidatePath('/');
        return {
            success: true,
            data: {
                ...newClaim,
                date: newClaim.date.toISOString().split('T')[0],
                datePaid: newClaim.datePaid?.toISOString().split('T')[0],
            }
        };
    } catch (error: any) {
        console.error('--- createClaim Error ---');
        console.error(error);
        return { success: false, error: '建立申請單失敗: ' + error.message };
    }
}

export async function updateClaimStatus(id: string, newStatus: string, note?: string) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Fetch DB User for name logging
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email || '' }
    });
    const actorName = dbUser?.name || user.email || 'System';
    const actorId = dbUser?.id || user.id;

    try {
        // 1. Get current history
        const currentClaim = await prisma.claim.findUnique({ where: { id }, select: { history: true } });
        if (!currentClaim) return { success: false, error: 'Claim not found' };

        const currentHistory = (currentClaim.history as unknown as ClaimHistory[]) || [];
        const newHistoryItem: ClaimHistory = {
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
                history: [...currentHistory, newHistoryItem] as any
            }
        });

        revalidatePath('/');
        return {
            success: true,
            data: {
                ...updatedClaim,
                date: updatedClaim.date.toISOString().split('T')[0],
                datePaid: updatedClaim.datePaid?.toISOString().split('T')[0],
            }
        };
    } catch (error: any) {
        console.error('Update Status Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateClaim(id: string, data: Partial<CreateClaimInput>) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({ where: { email: user.email || '' } });
    if (!dbUser) return { success: false, error: 'User not found in DB' };

    try {
        const currentClaim = await prisma.claim.findUnique({ where: { id } });
        if (!currentClaim) return { success: false, error: 'Claim not found' };

        const isPrivileged =
            (dbUser.permissions && (dbUser.permissions.includes('finance_audit') || dbUser.permissions.includes('user_management'))) ||
            dbUser.roleName.includes('財務') ||
            dbUser.roleName.includes('管理者');

        if (currentClaim.applicantId !== dbUser.id && !isPrivileged) {
            return { success: false, error: 'You do not have permission to edit this claim' };
        }

        // Recalculate amount if items changed
        let amount = data.amount;
        if (data.items) {
            amount = data.items.reduce((sum, item) => sum + item.amount, 0);
        }

        // Add history record if resubmitting
        const currentHistory = (currentClaim.history as unknown as ClaimHistory[]) || [];
        let newHistory = [...currentHistory];

        if (data.status && (data.status === 'pending_approval' || data.status === 'pending_finance') && currentClaim.status !== data.status) {
            newHistory.push({
                timestamp: new Date().toISOString(),
                actorId: dbUser.id,
                actorName: dbUser.name,
                action: 'submitted',
            });
        }

        const updatedClaim = await prisma.claim.update({
            where: { id },
            data: {
                ...data,
                amount: amount,
                type: data.type as ClaimType | undefined,
                status: data.status as ClaimStatus | undefined,
                date: data.date ? new Date(data.date) : undefined,
                items: data.items ? (data.items as any) : undefined,
                history: newHistory as any,
                updatedAt: new Date()
            } as any
        });

        revalidatePath('/');
        return {
            success: true,
            data: {
                ...updatedClaim,
                date: updatedClaim.date.toISOString().split('T')[0],
                datePaid: updatedClaim.datePaid?.toISOString().split('T')[0],
            }
        };
    } catch (error: any) {
        console.error('Update Claim Error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteClaim(id: string) {
    try {
        await prisma.claim.delete({ where: { id } });
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
