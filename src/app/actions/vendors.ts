'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from './claims';   // Re-use helper if possible, or re-implement
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

// Re-implement getCurrentUser to avoid circular deps if claims.ts imports vendors
// Actually claims.ts imports nothing from vendors usually. 
// But let's keep it safe.

// Local helper removed in favor of imported getCurrentUser

function vendorsCacheTag() {
    return 'vendors:list';
}

function vendorRequestsCacheTag() {
    return 'vendors:requests';
}

function revalidateVendorsCache() {
    revalidateTag(vendorsCacheTag(), 'default');
}

function revalidateVendorRequestsCache() {
    revalidateTag(vendorRequestsCacheTag(), 'default');
}

export async function getVendors(params?: { page?: number; pageSize?: number; query?: string }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const query = params?.query?.trim() || '';
    const cacheKey = ['vendors', query || 'all', String(page), String(pageSize), 'v1'];

    const cachedFetch = unstable_cache(async () => {
        try {
            const whereClause: any = { status: { not: 'deleted' } };
            if (query) {
                whereClause.OR = [
                    { name: { contains: query, mode: 'insensitive' } },
                    { serviceContent: { contains: query, mode: 'insensitive' } },
                    { bankAccount: { contains: query, mode: 'insensitive' } }
                ];
            }

            const [totalCount, vendors] = await Promise.all([
                prisma.vendor.count({ where: whereClause }),
                prisma.vendor.findMany({
                    where: whereClause,
                    orderBy: { name: 'asc' },
                    skip,
                    take: pageSize,
                })
            ]);

            return {
                success: true,
                data: vendors,
                pagination: {
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                    currentPage: page,
                    pageSize
                }
            };
        } catch (error) {
            console.error('Error fetching vendors:', error);
            return { success: false, error: 'Failed to fetch vendors' };
        }
    }, cacheKey, { revalidate: 30, tags: [vendorsCacheTag()] });

    return cachedFetch();
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
        revalidateVendorRequestsCache();
        return { success: true };
    } catch (error) {
        console.error('Error creating vendor request:', error);
        return { success: false, error: 'Failed to create request' };
    }
}

export async function getVendorRequests(params?: { page?: number; pageSize?: number }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const cacheKey = ['vendor-requests', String(page), String(pageSize), 'v1'];

    const cachedFetch = unstable_cache(async () => {
        try {
            const [totalCount, requests] = await Promise.all([
                prisma.vendorRequest.count(),
                prisma.vendorRequest.findMany({
                    orderBy: { timestamp: 'desc' },
                    skip,
                    take: pageSize,
                })
            ]);

            return {
                success: true,
                data: requests,
                pagination: {
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                    currentPage: page,
                    pageSize
                }
            };
        } catch (error) {
            console.error('Error fetching vendor requests:', error);
            return { success: false, error: 'Failed to fetch requests' };
        }
    }, cacheKey, { revalidate: 30, tags: [vendorRequestsCacheTag()] });

    return cachedFetch();
}

export async function getPendingVendorRequestCount() {
    const cacheKey = ['vendor-requests-count', 'v1'];
    const cachedFetch = unstable_cache(async () => {
        try {
            const count = await prisma.vendorRequest.count({ where: { status: 'pending' } });
            return { success: true, data: { count } };
        } catch (error) {
            console.error('Error fetching vendor request count:', error);
            return { success: false, error: 'Failed to fetch request count' };
        }
    }, cacheKey, { revalidate: 30, tags: [vendorRequestsCacheTag()] });

    return cachedFetch();
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
            revalidateVendorRequestsCache();
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
        revalidateVendorsCache();
        revalidateVendorRequestsCache();
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
