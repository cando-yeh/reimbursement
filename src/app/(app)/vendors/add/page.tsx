import React from 'react';
import VendorForm from '@/components/Forms/VendorForm';

export default function VendorAddPage() {
    return (
        <div className="container" style={{ padding: '2rem' }}>
            <VendorForm mode="add" />
        </div>
    );
}
