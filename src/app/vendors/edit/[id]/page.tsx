import React from 'react';
import { getVendor } from '@/app/actions/vendors';
import VendorForm from '@/components/Forms/VendorForm';
import { notFound } from 'next/navigation';

export default async function VendorEditPage({ params }: { params: { id: string } }) {
    const { success, data: vendor } = await getVendor(params.id);

    if (!success || !vendor) {
        notFound();
    }

    const formattedVendor = vendor ? {
        ...vendor,
        serviceContent: vendor.serviceContent ?? undefined,
        bankCode: vendor.bankCode ?? undefined,
        bankAccount: vendor.bankAccount ?? undefined,
    } : null;

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <VendorForm mode="edit" initialData={formattedVendor || undefined} vendorId={params.id} />
        </div>
    );
}
