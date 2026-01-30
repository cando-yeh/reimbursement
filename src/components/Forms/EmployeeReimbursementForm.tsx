'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Claim } from '@/types';
import { Save, Send, ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import NextImage from 'next/image';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { createClaim as createClaimAction, updateClaim as updateClaimAction } from '@/app/actions/claims';
import { uploadFile, deleteFile } from '@/utils/storage';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/Common/ConfirmModal';
import { todayISO } from '@/utils/date';

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
        { id: '1', amount: 0, date: todayISO(), description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
    ]);
    const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
    const [noReceiptReason, setNoReceiptReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [submitType, setSubmitType] = useState<'submit' | 'draft'>('submit');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const { showToast } = useToast();

    // Track object URLs for memory management
    const objectUrlsRef = useRef<Map<string, string>>(new Map());

    // Helper function to get or create object URL (prevents memory leaks)
    const getObjectUrl = (itemId: string, file: File): string => {
        const existingUrl = objectUrlsRef.current.get(itemId);
        if (existingUrl) {
            return existingUrl;
        }
        const newUrl = URL.createObjectURL(file);
        objectUrlsRef.current.set(itemId, newUrl);
        return newUrl;
    };

    // Cleanup object URLs on unmount
    useEffect(() => {
        const urls = objectUrlsRef.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    // Cleanup individual URL when file is removed
    const handleRemoveFile = (itemId: string) => {
        const url = objectUrlsRef.current.get(itemId);
        if (url) {
            URL.revokeObjectURL(url);
            objectUrlsRef.current.delete(itemId);
        }
        handleItemChange(itemId, 'receiptFile', null);
    };

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    useEffect(() => {
        if (editId) {
            const claim = claims.find(c => c.id === editId);
            if (claim && claim.lineItems) {
                const loadedItems = claim.lineItems.map(i => ({
                    id: i.id,
                    date: i.date,
                    amount: i.amount,
                    description: i.description,
                    category: i.category || '',
                    invoiceNumber: i.invoiceNumber || '',
                    noReceipt: i.notes === '無憑證',
                    receiptFile: null,
                    existingReceiptName: (i.notes && i.notes !== '無憑證') ? i.notes : undefined,
                    fileUrl: i.fileUrl || undefined
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
            { id: Date.now().toString(), amount: 0, date: todayISO(), description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
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
            showToast('請至少新增一筆有效的費用明細', 'error');
            return;
        }

        const invalidAmountItems = items.filter(i => (Number(i.amount) <= 0 || isNaN(Number(i.amount))));
        if (invalidAmountItems.length > 0) {
            showToast('金額必須大於 0', 'error');
            return;
        }

        if (action === 'submit') {
            const missingReceipts = validItems.filter(i => !i.noReceipt && !i.receiptFile && !i.existingReceiptName && !i.fileUrl);
            if (missingReceipts.length > 0) {
                showToast('請為所有項目上傳憑證，或勾選「無憑證」', 'error');
                return;
            }
            const hasNoReceiptItems = validItems.some(i => i.noReceipt);
            if (hasNoReceiptItems && noReceiptReason.trim() === '') {
                showToast('請填寫無憑證原因', 'error');
                return;
            }

            // Show confirmation modal for submission
            setSubmitType('submit');
            setShowConfirmSubmit(true);
            return;
        }

        // Just execute draft immediately
        executeSubmit('draft');
    };

    const executeSubmit = async (action: 'submit' | 'draft') => {
        setIsSubmitting(true);
        const validItems = items.filter(i => (Number(i.amount) > 0) && i.description.trim() !== '' && i.category !== '');

        try {
            // Process uploads
            const processedItems = await Promise.all(validItems.map(async (item, index) => {
                let fileUrl = item.fileUrl;
                if (item.receiptFile) {
                    fileUrl = await uploadFile(
                        item.receiptFile,
                        item.date,
                        currentUser!.name,
                        item.category!,
                        item.amount,
                        index
                    );
                }

                return {
                    id: item.id,
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category!,
                    invoiceNumber: item.invoiceNumber,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || ''),
                    fileUrl: fileUrl
                };
            }));

            const generatedDescription = `${validItems[0].category} 等費用報銷`;
            const status = action === 'draft' ? 'draft' : undefined;

            const claimData = {
                description: generatedDescription,
                date: todayISO(),
                type: 'employee' as const, // literal type
                payee: currentUser!.name,
                // payeeId: currentUser.id, // Optional, depending on schema
                status: status || 'pending_finance',
                noReceiptReason: validItems.some(i => i.noReceipt) ? noReceiptReason : undefined,
                items: processedItems,
                amount: calculateTotal()
            };

            if (editId) {
                // Update
                const updateStatus = action === 'draft'
                    ? 'draft'
                    : (currentUser!.approverId ? 'pending_approval' : 'pending_finance');

                updateClaim(editId, {
                    ...claimData,
                    status: updateStatus
                });
            } else {
                // Create
                addClaim({
                    ...claimData,
                    status: status || 'pending_finance'
                });
            }

            // Process file deletions
            if (filesToDelete.length > 0) {
                await Promise.all(filesToDelete.map(url => deleteFile(url))).catch(e => console.error(e));
            }

            showToast(action === 'draft' ? '草稿已儲存' : '申請已提交', 'success');
            router.push(action === 'draft' ? '/?tab=drafts' : '/');
        } catch (error: any) {
            console.error(error);
            showToast('提交失敗: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    return (
        <div className="reimburse-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <PageHeader
                title="員工報銷"
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
                                            <div
                                                title={item.receiptFile.name}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--color-border)',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => window.open(getObjectUrl(item.id, item.receiptFile!), '_blank')}
                                            >
                                                <NextImage
                                                    src={getObjectUrl(item.id, item.receiptFile)}
                                                    alt="preview"
                                                    width={40}
                                                    height={40}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    unoptimized
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFile(item.id)}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px', zIndex: 1 }}
                                                title="移除憑證"
                                                disabled={isSubmitting}
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : (item.existingReceiptName || item.fileUrl) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <div
                                                title={item.existingReceiptName || '附件'}
                                                style={{
                                                    cursor: 'pointer',
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    border: '1px solid var(--color-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: 'var(--color-bg)'
                                                }}
                                                onClick={() => window.open(item.fileUrl || '#', '_blank')}
                                            >
                                                {item.fileUrl ? (
                                                    <NextImage
                                                        src={item.fileUrl}
                                                        alt="preview"
                                                        width={40}
                                                        height={40}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "https://placehold.co/40x40?text=File";
                                                        }}
                                                        unoptimized
                                                    />
                                                ) : <ImageIcon size={24} style={{ color: 'var(--color-primary)' }} />}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (item.fileUrl) {
                                                        setFilesToDelete(prev => [...prev, item.fileUrl!]);
                                                    }
                                                    handleItemChange(item.id, 'existingReceiptName', undefined);
                                                    handleItemChange(item.id, 'fileUrl', undefined);
                                                }}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px', zIndex: 1 }}
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

            <ConfirmModal
                isOpen={showConfirmSubmit}
                title="確認提交申請"
                message={`您確定要提交這筆共 NT$ ${calculateTotal().toLocaleString()} 的報銷申請嗎？提交後將進入審核流程。`}
                confirmText="確認提交"
                onConfirm={() => executeSubmit('submit')}
                onCancel={() => setShowConfirmSubmit(false)}
            />
        </div>
    );
}
