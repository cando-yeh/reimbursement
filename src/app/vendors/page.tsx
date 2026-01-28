'use client';

import React from 'react';
import VendorListClient from './VendorListClient';
import { useApp } from '@/context/AppContext';
import PageSkeleton from '@/components/Common/PageSkeleton';

export default function VendorListPage() {
    const { vendors, vendorRequests, currentUser, isAuthLoading, fetchVendors } = useApp();

    React.useEffect(() => {
        if (currentUser) {
            fetchVendors();
        }
    }, [currentUser?.id]);

    if (isAuthLoading) {
        return <PageSkeleton />;
    }

    if (!currentUser) {
        return <PageSkeleton />;
    }

    return (
        <VendorListClient
            currentUser={currentUser}
        />
    );
}

