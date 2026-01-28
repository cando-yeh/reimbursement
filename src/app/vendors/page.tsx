'use client';

import React from 'react';
import VendorListClient from './VendorListClient';
import { useApp } from '@/context/AppContext';
import PageSkeleton from '@/components/Common/PageSkeleton';

export default function VendorListPage() {
    const { vendors, vendorRequests, currentUser, isAuthLoading } = useApp();

    if (isAuthLoading) {
        return <PageSkeleton />;
    }

    if (!currentUser) {
        return <PageSkeleton />;
    }

    return (
        <VendorListClient
            initialVendors={vendors}
            initialRequests={vendorRequests}
            currentUser={currentUser}
        />
    );
}

