'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './claims';   // Re-use helper if possible, or re-implement
import { revalidatePath } from 'next/cache';

// Re-implement getCurrentUser to avoid circular deps if claims.ts imports vendors
// Actually claims.ts imports nothing from vendors usually. 
// But let's keep it safe.

// Local helper removed in favor of imported getCurrentUser


export async function getVendors() {
    try {
        const vendors = await prisma.vendor.findMany({
            orderBy: { name: 'asc' },
        });
        return { success: true, data: vendors };
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return { success: false, error: 'Failed to fetch vendors' };
    }
}

export async function createVendorRequest(data: any) { // data: Partial<Vendor> & { type: 'add' | 'update' | 'delete', vendorId?: string }
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({
        where: { email: user.email || '' }
    });
    if (!dbUser) return { success: false, error: 'User not found in DB' };

    try {
        // Validation could go here

        await prisma.vendorRequest.create({
            data: {
                type: data.type, // 'add'
                vendorId: data.vendorId || null,
                data: data.data, // The vendor details
                status: 'pending',
                applicantName: dbUser.name || user.email, // Use dbUser.name
                originalData: data.originalData || undefined,
            }
        });

        revalidatePath('/vendors');
        revalidatePath('/'); // Dashboard might show pending requests
        return { success: true };
    } catch (error) {
        console.error('Error creating vendor request:', error);
        return { success: false, error: 'Failed to create request' };
    }
}

export async function getVendorRequests() {
    // Usually for Finance or Admin
    try {
        const requests = await prisma.vendorRequest.findMany({
            orderBy: { timestamp: 'desc' },
        });
        return { success: true, data: requests };
    } catch (error) {
        console.error('Error fetching vendor requests:', error);
        return { success: false, error: 'Failed to fetch requests' };
    }
}

export async function approveVendorRequest(requestId: string, action: 'approve' | 'reject') {
    const user = await getCurrentUser();
    // Check permissions (must be finance or admin?)
    if (!user) return { success: false, error: 'Unauthorized' };
    // TODO: strictly check role if needed. Assuming UI hides button for non-finance.

    try {
        const request = await prisma.vendorRequest.findUnique({ where: { id: requestId } });
        if (!request) return { success: false, error: 'Request not found' };

        if (action === 'reject') {
            await prisma.vendorRequest.update({
                where: { id: requestId },
                data: { status: 'rejected' }
            });
            revalidatePath('/vendors');
            return { success: true };
        }

        // Approve
        if (request.type === 'add') {
            const vendorData = request.data as any; // Cast generic Json
            await prisma.vendor.create({
                data: {
                    name: vendorData.name,
                    serviceContent: vendorData.serviceContent,
                    bankCode: vendorData.bankCode,
                    bankAccount: vendorData.bankAccount,
                    isFloatingAccount: vendorData.isFloatingAccount || false,
                    status: 'active',
                }
            });
        } else if (request.type === 'update' && request.vendorId) {
            const vendorData = request.data as any;
            await prisma.vendor.update({
                where: { id: request.vendorId },
                data: {
                    ...vendorData
                }
            });
        } else if (request.type === 'delete' && request.vendorId) {
            // Soft delete or hard delete? Schema has status pending_delete?
            // Usually we mark it as inactive or delete.
            // Let's assume hard delete or status update based on requirements.
            // Schema has `status` string.
            await prisma.vendor.update({
                where: { id: request.vendorId },
                data: { status: 'deleted' } // or actually delete
            });
        }

        await prisma.vendorRequest.update({
            where: { id: requestId },
            data: { status: 'approved' }
        });

        revalidatePath('/vendors');
        return { success: true };

    } catch (error) {
        console.error('Error approving request:', error);
    }
}

export async function getVendor(id: string) {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { id }
        });
        return { success: true, data: vendor };
    } catch (error) {
        console.error('Error fetching vendor:', error);
        return { success: false, error: 'Failed to fetch vendor' };
    }
}
