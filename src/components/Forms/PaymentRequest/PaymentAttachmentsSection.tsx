'use client';

import React from 'react';
import { FileText, Upload, X } from 'lucide-react';
import FormSection from '@/components/Common/FormSection';
import Field from '@/components/Common/Field';

export default function PaymentAttachmentsSection(props: {
    receiptStatus: 'obtained' | 'pending' | 'none';
    setReceiptStatus: (value: 'obtained' | 'pending' | 'none') => void;
    invoiceNumber: string;
    setInvoiceNumber: (value: string) => void;
    invoiceDate: string;
    setInvoiceDate: (value: string) => void;
    attachments: File[];
    setAttachments: (files: File[]) => void;
    existingInvoiceFile?: string;
    setExistingInvoiceFile: (value: string | undefined) => void;
    invoiceUrl?: string;
    setInvoiceUrl: (value: string | undefined) => void;
    isSubmitting: boolean;
    markTouched: (key: string) => void;
    getError: (key: string) => string | undefined;
}) {
    const {
        receiptStatus,
        setReceiptStatus,
        invoiceNumber,
        setInvoiceNumber,
        invoiceDate,
        setInvoiceDate,
        attachments,
        setAttachments,
        existingInvoiceFile,
        setExistingInvoiceFile,
        invoiceUrl,
        setInvoiceUrl,
        isSubmitting,
        markTouched,
        getError
    } = props;

    return (
        <FormSection title="憑證與附件">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                <div className="md:col-span-3 space-y-6">
                    <Field label="發票號碼 / 無法提供原因" required error={getError('invoiceNumber')}>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <button type="button" onClick={() => { setReceiptStatus('obtained'); setInvoiceNumber(''); }} className={`btn ${receiptStatus === 'obtained' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>已取得發票</button>
                            <button type="button" onClick={() => { setReceiptStatus('pending'); setInvoiceNumber(''); }} className={`btn ${receiptStatus === 'pending' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>未取得(候補)</button>
                            <button type="button" onClick={() => { setReceiptStatus('none'); setInvoiceNumber(''); }} className={`btn ${receiptStatus === 'none' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>無法取得</button>
                        </div>
                        <input
                            type="text"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(receiptStatus === 'obtained' ? e.target.value.replace(/[^a-zA-Z0-9]/g, '') : e.target.value)}
                            onBlur={() => markTouched('invoiceNumber')}
                            className="form-input"
                            placeholder={receiptStatus === 'obtained' ? '請輸入發票號碼' : receiptStatus === 'none' ? '請說明無法取得原因' : '系統將標註為候傳項目'}
                            disabled={isSubmitting || receiptStatus === 'pending'}
                        />
                    </Field>
                    {receiptStatus === 'obtained' && (
                        <Field label="發票日期" required>
                            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="form-input" disabled={isSubmitting} />
                        </Field>
                    )}
                </div>

                <div className="md:col-span-2">
                    <Field label="憑證上傳" required={receiptStatus === 'obtained'} error={getError('attachments')}>
                        <div
                            style={{
                                border: '2px dashed var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.5rem',
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                textAlign: 'center',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                minHeight: '160px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={() => { if (!isSubmitting) document.getElementById('receipt-upload')?.click(); }}
                        >
                            <input
                                type="file"
                                id="receipt-upload"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const f = e.target.files[0];
                                        setAttachments([f]);
                                        setInvoiceUrl(URL.createObjectURL(f));
                                        markTouched('attachments');
                                    }
                                }}
                                disabled={isSubmitting}
                            />

                            {attachments.length === 0 ? (
                                <>
                                    <Upload size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>點擊或拖曳上傳附件</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>JPEG, PNG, PDF (最大 10MB)</p>
                                </>
                            ) : (
                                <div style={{ width: '100%', position: 'relative' }}>
                                    <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '8px', borderRadius: '6px' }}><FileText size={20} /></div>
                                        <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{attachments[0].name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{(attachments[0].size / 1024).toFixed(0)} KB</div>
                                        </div>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setAttachments([]); }} style={{ color: 'var(--color-danger)', padding: '4px' }} disabled={isSubmitting}><X size={18} /></button>
                                    </div>
                                </div>
                            )}
                            {existingInvoiceFile && attachments.length === 0 && (
                                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                                    <span>📄 已上傳: {existingInvoiceFile}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExistingInvoiceFile(undefined);
                                            setInvoiceUrl(undefined);
                                        }}
                                        style={{ color: 'var(--color-danger)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex' }}
                                        title="移除現有檔案"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </Field>
                </div>
            </div>
        </FormSection>
    );
}
