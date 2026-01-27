'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Building, CreditCard, FileText } from 'lucide-react';
import { BANK_LIST } from '@/utils/constants';
import { Vendor } from '@/types';
import { createVendorRequest } from '@/app/actions/vendors';

interface VendorFormProps {
    initialData?: Partial<Vendor>; // For edit mode
    mode: 'add' | 'edit';
    vendorId?: string; // For edit mode
}

export default function VendorForm({ initialData, mode, vendorId }: VendorFormProps) {
    const router = useRouter();
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

            const payload = {
                type: mode === 'add' ? 'add' : 'update',
                vendorId: vendorId, // undefined if add
                data: formData
            };

            const result = await createVendorRequest(payload);

            if (result.success) {
                alert(mode === 'add' ? '新增申請已提交，待審核。' : '更新申請已提交，待審核。');
                router.push('/vendors');
                router.refresh(); // Refresh server components
            } else {
                throw new Error(result.error || '提交失敗');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h2 className="heading-lg">{mode === 'add' ? '新增廠商' : '編輯廠商'}</h2>
                <p className="text-secondary">
                    {mode === 'add'
                        ? '新增的廠商資料需經財務審核後才能使用。'
                        : '修改後的資料需經財務審核後才會生效。'}
                </p>
            </div>

            {error && (
                <div style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem'
                }}>
                    {error}
                </div>
            )}

            <div className="form-group">
                <label className="form-label">廠商名稱 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }}>
                        <Building size={16} />
                    </div>
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="請輸入公司或是個人名稱"
                        required
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">服務內容/營業項目</label>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }}>
                        <FileText size={16} />
                    </div>
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        value={formData.serviceContent}
                        onChange={e => setFormData({ ...formData, serviceContent: e.target.value })}
                        placeholder="例如：辦公室清潔、文具供應"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                    <label className="form-label">銀行代碼</label>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }}>
                            <Building size={16} />
                        </div>
                        <select
                            className="form-select"
                            style={{ paddingLeft: '2.5rem' }}
                            value={formData.bankCode}
                            onChange={e => setFormData({ ...formData, bankCode: e.target.value })}
                        >
                            <option value="">選擇銀行</option>
                            {BANK_LIST.map(bank => (
                                <option key={bank.code} value={bank.code}>
                                    {bank.code} {bank.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">銀行帳號</label>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }}>
                            <CreditCard size={16} />
                        </div>
                        <input
                            type="text"
                            className="form-input"
                            style={{ paddingLeft: '2.5rem' }}
                            value={formData.bankAccount}
                            onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                            placeholder="請輸入帳號"
                        />
                    </div>
                </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <input
                    type="checkbox"
                    id="isFloatingAccount"
                    checked={formData.isFloatingAccount}
                    onChange={e => setFormData({ ...formData, isFloatingAccount: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                />
                <label htmlFor="isFloatingAccount" style={{ cursor: 'pointer' }}>
                    設為浮動帳號 (每次請款時可修改)
                </label>
            </div>


            <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                >
                    <X size={16} style={{ marginRight: '0.5rem' }} />
                    取消
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '提交中...' : (
                        <>
                            <Save size={16} style={{ marginRight: '0.5rem' }} />
                            提交審核
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
