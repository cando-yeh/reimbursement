'use client';

import React from 'react';
import NextImage from 'next/image';
import { Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/utils/constants';

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

export default function EmployeeItemsTable(props: {
    items: ExpenseItemWithAttachment[];
    isSubmitting: boolean;
    onItemChange: (id: string, key: keyof ExpenseItemWithAttachment, value: any) => void;
    onRemoveItem: (id: string) => void;
    onAddItem: () => void;
    onRemoveReceiptFile: (id: string) => void;
    onRemoveExistingFile: (id: string, fileUrl?: string) => void;
    getObjectUrl: (itemId: string, file: File) => string;
}) {
    const { items, isSubmitting, onItemChange, onRemoveItem, onAddItem, onRemoveReceiptFile, onRemoveExistingFile, getObjectUrl } = props;

    return (
        <>
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
                                onChange={e => onItemChange(item.id, 'date', e.target.value)}
                                disabled={isSubmitting}
                            />
                            <select
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                value={item.category || ''}
                                onChange={e => onItemChange(item.id, 'category', e.target.value)}
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
                                onChange={e => onItemChange(item.id, 'description', e.target.value)}
                                disabled={isSubmitting}
                            />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '8px', color: 'var(--color-text-secondary)', fontSize: '0.7rem', pointerEvents: 'none' }}>NT$</span>
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ padding: '0.4rem', paddingLeft: '2.1rem', fontSize: '0.85rem', width: '100%', textAlign: 'right' }}
                                    value={item.amount ? Number(item.amount).toLocaleString() : ''}
                                    onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                    onChange={e => {
                                        const val = e.target.value.replace(/,/g, '');
                                        if (!/^\d*$/.test(val)) return;
                                        onItemChange(item.id, 'amount', parseInt(val) || 0);
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
                                    onChange={e => onItemChange(item.id, 'invoiceNumber', e.target.value)}
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
                                            onClick={() => onRemoveReceiptFile(item.id)}
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
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/40x40?text=File';
                                                    }}
                                                    unoptimized
                                                />
                                            ) : <ImageIcon size={24} style={{ color: 'var(--color-primary)' }} />}
                                        </div>
                                        <button
                                            onClick={() => onRemoveExistingFile(item.id, item.fileUrl)}
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
                                            onItemChange(item.id, 'receiptFile', file);
                                        }
                                    }}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={item.noReceipt}
                                    onChange={e => onItemChange(item.id, 'noReceipt', e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveItem(item.id)}
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
                onClick={onAddItem}
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: '1rem', border: '1px dashed var(--color-border)', justifyContent: 'center' }}
                disabled={isSubmitting}
            >
                <Plus size={18} /> 新增一筆費用
            </button>
        </>
    );
}
