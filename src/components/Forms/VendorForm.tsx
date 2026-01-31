'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Building, CreditCard, FileText } from 'lucide-react';
import { BANK_LIST } from '@/utils/constants';
import { Vendor } from '@/types';
import { useApp } from '@/context/AppContext';

import FormSection from '@/components/Common/FormSection';
import FormLabel from '@/components/Common/FormLabel';

interface VendorFormProps {
    initialData?: Partial<Vendor>; // For edit mode
    mode: 'add' | 'edit';
    vendorId?: string; // For edit mode
}

export default function VendorForm({ initialData, mode, vendorId }: VendorFormProps) {
    const router = useRouter();
    const { requestAddVendor, requestUpdateVendor } = useApp();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        serviceContent: initialData?.serviceContent || '',
        bankCode: initialData?.bankCode || '',
        bankAccount: initialData?.bankAccount || '',
        isFloatingAccount: initialData?.isFloatingAccount || false,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (!formData.name) throw new Error('請輸入廠商名稱');
            if (!formData.serviceContent) throw new Error('請輸入服務內容/營業項目');

            if (!formData.isFloatingAccount) {
                if (!formData.bankCode) throw new Error('請選擇銀行代碼');
                if (!formData.bankAccount) throw new Error('請輸入銀行帳號');
            }

            let success = false;

            if (mode === 'add') {
                success = await requestAddVendor(formData);
            } else {
                if (!vendorId) throw new Error('缺少廠商 ID');
                success = await requestUpdateVendor(vendorId, formData);
            }

            if (success) {
                // Alert is handled in context
                router.push('/vendors');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '700px', margin: '0 auto', padding: '2.5rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <h2 className="heading-lg" style={{ marginBottom: '0.5rem' }}>{mode === 'add' ? '新增廠商' : '編輯廠商'}</h2>
                <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-primary)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                        {mode === 'add'
                            ? '✨ 廠商資料送出後，需由財務部審核通過即可開始請款。'
                            : '📝 修改資料將進入審核流程，審核期間仍可使用原資料請款。'}
                    </p>
                </div>
            </header>

            {error && (
                <div style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}>
                    ⚠️ {error}
                </div>
            )}

            <div className="space-y-8">
                <FormSection title="基本資訊">
                    <div className="space-y-4">
                        <div className="form-group">
                            <FormLabel required>廠商名稱</FormLabel>
                            <div className="input-wrapper-icon">
                                <Building size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="form-input has-icon"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="請輸入公司或是個人全名"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <FormLabel required>服務內容/營業項目</FormLabel>
                            <div className="input-wrapper-icon">
                                <FileText size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="form-input has-icon"
                                    value={formData.serviceContent}
                                    onChange={e => setFormData({ ...formData, serviceContent: e.target.value })}
                                    placeholder="例如：辦公室清潔、文具供應、軟體開發"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="匯款帳項">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-group md:col-span-1">
                            <FormLabel required={!formData.isFloatingAccount}>銀行代碼</FormLabel>
                            <div className="input-wrapper-icon">
                                <Building size={18} className="input-icon" />
                                <select
                                    className="form-input has-icon"
                                    style={{ appearance: 'none', backgroundColor: 'transparent' }}
                                    value={formData.bankCode}
                                    onChange={e => setFormData({ ...formData, bankCode: e.target.value })}
                                    required={!formData.isFloatingAccount}
                                    disabled={isSubmitting}
                                >
                                    <option value="">選擇銀行</option>
                                    {BANK_LIST.map(bank => (
                                        <option key={bank.code} value={bank.code}>
                                            {bank.code} {bank.name}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="form-group md:col-span-2">
                            <FormLabel required={!formData.isFloatingAccount}>銀行帳號</FormLabel>
                            <div className="input-wrapper-icon">
                                <CreditCard size={18} className="input-icon" />
                                <input
                                    type="text"
                                    className="form-input has-icon"
                                    value={formData.bankAccount}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^\d]/g, '');
                                        setFormData({ ...formData, bankAccount: val });
                                    }}
                                    placeholder="請輸入純數字帳號"
                                    inputMode="numeric"
                                    required={!formData.isFloatingAccount}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    id="isFloatingAccount"
                                    checked={formData.isFloatingAccount}
                                    onChange={e => setFormData({ ...formData, isFloatingAccount: e.target.checked })}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        cursor: 'pointer',
                                        accentColor: 'var(--color-primary)'
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>設為浮動帳號</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>勾選後，每次請款時皆可手動修改此廠商的匯款資訊。</span>
                            </div>
                        </label>
                    </div>
                </FormSection>
            </div>


            <footer className="form-actions" style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                >
                    <X size={16} />
                    取消離開
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ minWidth: '140px' }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <span className="animate-spin mr-2">⏳</span> : <Save size={16} />}
                    {isSubmitting ? '處理中...' : '提交審核'}
                </button>
            </footer>
        </form>
    );
}
