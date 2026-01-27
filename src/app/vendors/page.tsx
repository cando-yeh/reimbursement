import React from 'react';
import Link from 'next/link';
import { Plus, Search, Building, Trash2, Edit2 } from 'lucide-react';
import { BANK_LIST } from '@/utils/constants';
import { getVendors, getVendorRequests } from '@/app/actions/vendors';
import { getCurrentUser } from '@/app/actions/claims';
import VendorListClient from './VendorListClient';

export default async function VendorListPage() {
    const { success: vSuccess, data: vendors } = await getVendors();
    const { success: rSuccess, data: requests } = await getVendorRequests();
    const authUser = await getCurrentUser();

    if (!authUser || !authUser.email) {
        return <div className="p-8">請先登入</div>;
    }

    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
        where: { email: authUser.email }
    });

    if (!user) {
        return <div className="p-8">找不到使用者資料</div>;
    }

    const vendorList = vSuccess ? vendors || [] : [];
    const requestList = rSuccess ? requests || [] : [];

    return (
        <VendorListClient
            initialVendors={vendorList}
            initialRequests={requestList}
            currentUser={user}
        />
    );
}

