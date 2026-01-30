import React from 'react';
import PageSkeleton from '@/components/Common/PageSkeleton';
import VendorListClient from './VendorListClient';
import { getCurrentUser } from '@/app/actions/claims';
import { getDBUserByEmail } from '@/app/actions/users';
import { getVendors, getVendorRequests } from '@/app/actions/vendors';
import { formatVendorRequests } from '@/utils/vendorHelpers';
import { Permission, User, Vendor, VendorRequest } from '@/types';

export default async function VendorListPage({
    searchParams,
}: {
    searchParams?: Promise<{ page?: string; q?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const currentPage = parseInt(resolvedSearchParams?.page || '1');
    const query = resolvedSearchParams?.q ?? '';

    const user = await getCurrentUser();
    if (!user?.email) {
        return <PageSkeleton />;
    }

    const dbUserResult = await getDBUserByEmail(user.email);
    const dbUser = dbUserResult.success ? dbUserResult.data : null;
    if (!dbUser) {
        return <PageSkeleton />;
    }

    const currentUser: User = {
        id: dbUser.id,
        name: dbUser.name,
        roleName: dbUser.roleName,
        permissions: (dbUser.permissions || []) as Permission[],
        email: dbUser.email || undefined,
        approverId: dbUser.approverId || undefined,
    };

    const isFinance = currentUser.permissions.includes('finance_audit') ||
        currentUser.roleName.includes('財務');

    const [vendorsResult, vendorRequestsResult] = await Promise.all([
        getVendors({ page: currentPage, pageSize: 10, query }),
        isFinance ? getVendorRequests({ page: 1, pageSize: 50 }) : Promise.resolve({ success: true, data: [] as VendorRequest[], pagination: null })
    ]);

    const vendors: Vendor[] = vendorsResult.success && vendorsResult.data ? vendorsResult.data : [];
    const pagination = vendorsResult.success ? vendorsResult.pagination : null;
    const vendorRequestsRaw = vendorRequestsResult.success && vendorRequestsResult.data ? vendorRequestsResult.data : [];
    const vendorRequests = formatVendorRequests(vendorRequestsRaw);

    return (
        <VendorListClient
            currentUser={currentUser}
            vendors={vendors}
            vendorRequests={vendorRequests}
            pagination={pagination}
            isLoading={false}
        />
    );
}
