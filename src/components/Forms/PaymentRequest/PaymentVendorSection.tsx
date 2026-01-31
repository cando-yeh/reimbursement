'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, CreditCard } from 'lucide-react';
import FormSection from '@/components/Common/FormSection';
import Field from '@/components/Common/Field';
import { BANK_LIST } from '@/utils/constants';
import type { Vendor, VendorRequest } from '@/types';

const SearchableVendorSelect = dynamic(() => import('@/components/Common/SearchableVendorSelect'), {
    loading: () => (
        <div className="form-input" style={{ display: 'flex', alignItems: 'center', height: '44px' }}>
            載入中...
        </div>
    ),
});

export default function PaymentVendorSection(props: {
    vendors: Vendor[];
    vendorRequests: VendorRequest[];
    vendorId: string;
    setVendorId: (id: string) => void;
    selectedVendor: Vendor | null;
    manualBankCode: string;
    setManualBankCode: (value: string) => void;
    manualBankAccount: string;
    setManualBankAccount: (value: string) => void;
    bankAccountDisplay: string;
    isSubmitting: boolean;
    markTouched: (key: string) => void;
    getError: (key: string) => string | undefined;
}) {
    const {
        vendors,
        vendorRequests,
        vendorId,
        setVendorId,
        selectedVendor,
        manualBankCode,
        setManualBankCode,
        manualBankAccount,
        setManualBankAccount,
        bankAccountDisplay,
        isSubmitting,
        markTouched,
        getError
    } = props;

    return (
        <FormSection title="付款對象">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Field label="廠商名稱" required error={getError('vendorId')}>
                    <SearchableVendorSelect
                        vendors={vendors}
                        vendorRequests={vendorRequests}
                        value={vendorId}
                        onChange={(id) => { setVendorId(id); markTouched('vendorId'); }}
                        onBlur={() => markTouched('vendorId')}
                        error={getError('vendorId') || undefined}
                        disabled={isSubmitting}
                    />
                </Field>

                {selectedVendor?.isFloatingAccount ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Field label="收款銀行" required error={getError('manualBankCode')}>
                            <div style={{ position: 'relative' }}>
                                <select
                                    className="form-input"
                                    value={manualBankCode}
                                    onChange={e => setManualBankCode(e.target.value)}
                                    onBlur={() => markTouched('manualBankCode')}
                                    style={{ appearance: 'none', paddingRight: '2rem' }}
                                    disabled={isSubmitting}
                                >
                                    <option value="">==請選擇==</option>
                                    {BANK_LIST.map(bank => (<option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>))}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </Field>
                        <Field label="收款帳號" required error={getError('manualBankAccount')}>
                            <input
                                type="text"
                                value={manualBankAccount}
                                onChange={e => { if (/^\\d*$/.test(e.target.value)) setManualBankAccount(e.target.value); }}
                                onBlur={() => markTouched('manualBankAccount')}
                                className="form-input"
                                placeholder="請輸入銀行帳號"
                                inputMode="numeric"
                                disabled={isSubmitting}
                            />
                        </Field>
                    </div>
                ) : (
                    <Field label="付款帳號" hint={vendorId ? '' : '請先選擇廠商以顯示帳號'}>
                        <div className="input-wrapper-icon">
                            <CreditCard size={18} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                value={bankAccountDisplay}
                                disabled
                                className="form-input has-icon"
                                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', borderStyle: 'dashed' }}
                                placeholder="請先選擇廠商"
                            />
                        </div>
                    </Field>
                )}
            </div>
        </FormSection>
    );
}
