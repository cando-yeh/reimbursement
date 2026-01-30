'use client';

import React, { useEffect } from 'react';
import VendorListClient from './VendorListClient';
import { useApp } from '@/context/AppContext';
import { useSearchParams } from 'next/navigation';
import PageSkeleton from '@/components/Common/PageSkeleton';

export default function VendorListPage() {
    const { currentUser, isAuthLoading, isVendorsLoading, fetchVendors, fetchVendorRequests } = useApp();
    const searchParams = useSearchParams();
    const currentPage = parseInt(searchParams.get('page') || '1');
    const [pagination, setPagination] = React.useState<any>(null);

    useEffect(() => {
        if (currentUser) {
            const loadData = async () => {
                const res = await fetchVendors({ page: currentPage, pageSize: 10 });
                if (res) setPagination(res.pagination);

                // Fetch vendor requests for finance/admin roles
                const isFinance = currentUser.permissions?.includes('finance_audit') ||
                    currentUser.roleName?.includes('財務');
                if (isFinance) {
                    await fetchVendorRequests({ page: 1, pageSize: 50 }); // Fetch recent requests
                }
            };
            loadData();
        }
    }, [currentUser?.id, currentPage, fetchVendors, fetchVendorRequests]);

    if (isAuthLoading || (isVendorsLoading && !pagination)) {
        return <PageSkeleton />;
    }

    if (!currentUser) {
        return <PageSkeleton />;
    }

    return (
        <VendorListClient
            currentUser={currentUser}
            pagination={pagination}
            isLoading={isVendorsLoading}
        />
    );
}

