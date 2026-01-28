'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Claim } from '@/types';
import { Save, Send, ArrowLeft, Plus, Trash2, Upload, Image, X, Loader2 } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { createClaim as createClaimAction, updateClaim as updateClaimAction } from '@/app/actions/claims';
import { uploadFile } from '@/utils/storage';

interface ExpenseItemWithAttachment {
    id: string;
    date: string;
    amount: number;
    description: string;
    category?: string;
    invoiceNumber?: string;
    noReceipt: boolean;
    receiptFile: File | null;
    existingReceiptName?: string;
    fileUrl?: string;
}

import FormSection from '@/components/Common/FormSection';
import PageHeader from '@/components/Common/PageHeader';

export default function EmployeeReimbursementForm({ editId }: { editId?: string }) {
    const { claims, currentUser, addClaim, updateClaim, vendors, vendorRequests } = useApp();
    const router = useRouter();

    const [items, setItems] = useState<ExpenseItemWithAttachment[]>([
        { id: '1', amount: 0, date: new Date().toISOString().split('T')[0], description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
    ]);
    const [noReceiptReason, setNoReceiptReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    useEffect(() => {
        if (editId) {
            const claim = claims.find(c => c.id === editId);
            if (claim && claim.items) {
                const loadedItems = claim.items.map(i => ({
                    id: i.id,
                    date: i.date,
                    amount: i.amount,
                    description: i.description,
                    category: i.category || '',
                    invoiceNumber: (i as any).invoiceNumber || '',
                    noReceipt: i.notes === '無憑證',
                    receiptFile: null,
                    existingReceiptName: (i.notes && i.notes !== '無憑證') ? i.notes : undefined,
                    fileUrl: (i as any).fileUrl || undefined
                }));
                if (loadedItems.length > 0) setItems(loadedItems);
                if (claim.noReceiptReason) setNoReceiptReason(claim.noReceiptReason);
            }
        }
    }, [editId, claims]);

    const handleItemChange = (id: string, field: keyof ExpenseItemWithAttachment, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) return { ...item, [field]: value };
            return item;
        }));
    };

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now().toString(), amount: 0, date: new Date().toISOString().split('T')[0], description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    };

    const handleSubmit = async (action: 'submit' | 'draft') => {
        if (!currentUser) return;

        const validItems = items.filter(i => (Number(i.amount) > 0) && i.description.trim() !== '' && i.category !== '');

        if (validItems.length === 0) {
            alert('請至少新增一筆有效的費用明細（需填寫費用類別、說明，且金額大於 0）。');
            return;
        }

        const invalidAmountItems = items.filter(i => (Number(i.amount) <= 0 || isNaN(Number(i.amount))));
        if (invalidAmountItems.length > 0) {
            alert('金額必須大於 0。');
            return;
        }

        if (action === 'submit') {
            const missingReceipts = validItems.filter(i => !i.noReceipt && !i.receiptFile && !i.existingReceiptName && !i.fileUrl);
            if (missingReceipts.length > 0) {
                alert('請為所有項目上傳憑證，或勾選「無憑證」。');
                return;
            }
            const hasNoReceiptItems = validItems.some(i => i.noReceipt);
            if (hasNoReceiptItems && noReceiptReason.trim() === '') {
                alert('請填寫無憑證原因。');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Process uploads
            const processedItems = await Promise.all(validItems.map(async (item, index) => {
                let fileUrl = item.fileUrl;
                if (item.receiptFile) {
                    fileUrl = await uploadFile(
                        item.receiptFile,
                        item.date,
                        currentUser.name,
                        item.category!,
                        item.amount,
                        index
                    );
                }

                return {
                    id: item.id, // Or generate new ID if needed, but keeping frontend ID is fine if safe
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category!,
                    invoiceNumber: item.invoiceNumber,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || '附件'),
                    fileUrl: fileUrl
                };
            }));

            const generatedDescription = `${validItems[0].category} 等費用報銷`;
            const status = action === 'draft' ? 'draft' : undefined;

            const claimData = {
                description: generatedDescription,
                date: new Date().toISOString().split('T')[0],
                type: 'employee' as const, // literal type
                payee: currentUser.name,
                // payeeId: currentUser.id, // Optional, depending on schema
                status: status || 'pending_finance',
                noReceiptReason: validItems.some(i => i.noReceipt) ? noReceiptReason : undefined,
                items: processedItems,
                amount: calculateTotal()
            };

            let result;
            if (editId) {
                // Update
                const updateStatus = action === 'draft'
                    ? 'draft'
                    : (currentUser.approverId ? 'pending_approval' : 'pending_finance');

                // Use Server Action directly but enable revalidation
                result = await updateClaimAction(editId, {
                    ...claimData,
                    status: updateStatus
                });
            } else {
                // Create
                result = await createClaimAction({
                    ...claimData,
                    status: status || 'pending_finance'
                });
            }

            if (!result.success) {
                alert(result.error);
                return;
            }

            router.push(action === 'draft' ? '/?tab=drafts' : (editId ? '/reviews?tab=claim_approvals' : '/?tab=in_review'));
        } catch (error: any) {
            console.error(error);
            alert('提交失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="reimburse-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader
                title="個人報銷申請"
                subtitle="適用於交通費、差旅費、交際費等代墊款項報銷。"
            />

            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <FormSection title="費用明細">
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>請逐筆填寫報銷項目並上傳憑證</p>
                        </FormSection>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>總計金額 (TWD)</span>
                        <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.75rem', lineHeight: 1 }}>
                            <span style={{ fontSize: '1rem', marginRight: '4px' }}>NT$</span>
                            {calculateTotal().toLocaleString()}
                        </div>
                    </div>
                </div>


                <div style={{ overflowX: 'auto' }} className="no-scrollbar">
                    <div style={{
                        minWidth: '800px',
                        display: 'grid',
                        gridTemplateColumns: '130px 120px minmax(150px, 1fr) 100px 100px 80px 50px 10px',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: '8px 8px 0 0',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                    }}>
                        <div>日期</div>
                        <div>費用類別</div>
                        <div>費用說明</div>
                        <div>金額</div>
                        <div>發票號碼</div>
                        <div>憑證</div>
                        <div>無憑證</div>
                        <div></div>
                    </div>

                    <div style={{ border: '1px solid var(--color-border)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                        {items.map((item, index) => (
                            <div
                                key={item.id}
                                style={{
                                    minWidth: '800px',
                                    display: 'grid',
                                    gridTemplateColumns: '130px 120px minmax(150px, 1fr) 100px 100px 80px 50px 10px',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    borderBottom: index < items.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    alignItems: 'center'
                                }}
                            >
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                    value={item.date}
                                    onChange={e => handleItemChange(item.id, 'date', e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <select
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                    value={item.category || ''}
                                    onChange={e => handleItemChange(item.id, 'category', e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    <option value="">請選擇</option>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                    placeholder="說明"
                                    value={item.description}
                                    onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: '8px', color: 'var(--color-text-secondary)', fontSize: '0.7rem', pointerEvents: 'none' }}>NT$</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ padding: '0.4rem', paddingLeft: '2.1rem', fontSize: '0.85rem', width: '100%', textAlign: 'right' }}
                                        value={item.amount ? Number(item.amount).toLocaleString() : ''}
                                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                        onChange={e => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if (!/^\d*$/.test(val)) return;
                                            handleItemChange(item.id, 'amount', parseInt(val) || 0);
                                        }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                {item.noReceipt ? (
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', display: 'flex', justifyContent: 'center' }}>-</span>
                                ) : (
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                        placeholder="發票號碼"
                                        value={item.invoiceNumber || ''}
                                        onChange={e => handleItemChange(item.id, 'invoiceNumber', e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {item.noReceipt ? (
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>-</span>
                                    ) : item.receiptFile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <div title={item.receiptFile.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Image size={24} style={{ color: 'var(--color-primary)', cursor: 'pointer' }} />
                                            </div>
                                            <button
                                                onClick={() => handleItemChange(item.id, 'receiptFile', null)}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px' }}
                                                title="移除憑證"
                                                disabled={isSubmitting}
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : (item.existingReceiptName || item.fileUrl) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <div title={item.existingReceiptName || '附件'} style={{ cursor: 'pointer' }}>
                                                <Image size={24} style={{ color: 'var(--color-primary)' }} />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    handleItemChange(item.id, 'existingReceiptName', undefined);
                                                    handleItemChange(item.id, 'fileUrl', undefined);
                                                }}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px' }}
                                                title="移除憑證"
                                                disabled={isSubmitting}
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', border: '1px dashed var(--color-border)' }}
                                            onClick={() => document.getElementById(`receipt-${item.id}`)?.click()}
                                            disabled={isSubmitting}
                                        >
                                            <Upload size={14} /> 上傳
                                        </button>
                                    )}
                                    <input
                                        type="file"
                                        id={`receipt-${item.id}`}
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                handleItemChange(item.id, 'receiptFile', file);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={item.noReceipt}
                                        onChange={e => handleItemChange(item.id, 'noReceipt', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="btn btn-ghost"
                                            style={{ padding: '0.25rem', color: 'var(--color-danger)' }}
                                            disabled={isSubmitting}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-ghost"
                    style={{ width: '100%', marginTop: '1rem', border: '1px dashed var(--color-border)', justifyContent: 'center' }}
                    disabled={isSubmitting}
                >
                    <Plus size={18} /> 新增一筆費用
                </button>

                {items.some(i => i.noReceipt) && (
                    <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                        <label className="label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                            ⚠️ 無憑證原因 <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <textarea
                            className="form-input"
                            value={noReceiptReason}
                            onChange={e => setNoReceiptReason(e.target.value)}
                            placeholder="請說明為何此筆費用無法提供憑證..."
                            rows={3}
                            style={{ marginTop: '0.5rem' }}
                            disabled={isSubmitting}
                        />
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn btn-ghost"
                        style={{ marginRight: 'auto', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
                        disabled={isSubmitting}
                    >
                        取消
                    </button>
                    {!isResubmit && (
                        <button
                            type="button"
                            onClick={() => handleSubmit('draft')}
                            className="btn btn-ghost"
                            style={{ border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            <span style={{ marginLeft: '0.5rem' }}>儲存草稿</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleSubmit('submit')}
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                        <span style={{ marginLeft: '0.5rem' }}>{isResubmit ? '重新提交' : '提交申請'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
