'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Upload, X, FileText, ChevronDown, Save, Send, Loader2, CreditCard } from 'lucide-react';
import { BANK_LIST, EXPENSE_CATEGORIES } from '@/utils/constants';
import { formatNumberWithCommas, parseAmountToNumber } from '@/utils/format';
import { uploadFile } from '@/utils/storage';
import PageHeader from '@/components/Common/PageHeader';
import FormSection from '@/components/Common/FormSection';
import Field from '@/components/Common/Field';
import { todayISO } from '@/utils/date';

const SearchableVendorSelect = dynamic(() => import('@/components/Common/SearchableVendorSelect'), {
    loading: () => (
        <div className="form-input" style={{ display: 'flex', alignItems: 'center', height: '44px' }}>
            載入中...
        </div>
    ),
});

export default function PaymentRequestForm({ editId }: { editId?: string }) {
    const router = useRouter();
    const { vendors, addClaim, updateClaim, claims, currentUser, vendorRequests } = useApp();

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    const [vendorId, setVendorId] = useState<string>("");
    const [amountInput, setAmountInput] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [expenseCategory, setExpenseCategory] = useState<string>("");
    const [memo, setMemo] = useState<string>("");
    const [receiptStatus, setReceiptStatus] = useState<"obtained" | "pending" | "none">("obtained");
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");
    const [invoiceDate, setInvoiceDate] = useState<string>("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [manualBankCode, setManualBankCode] = useState("");
    const [manualBankAccount, setManualBankAccount] = useState("");
    const [existingInvoiceFile, setExistingInvoiceFile] = useState<string | undefined>(undefined);
    const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formInitializedRef = React.useRef(false);

    useEffect(() => {
        if (formInitializedRef.current) return;
        if (editId) {
            const claim = claims.find(c => c.id === editId);
            if (claim && claim.type === 'payment') {
                formInitializedRef.current = true;
                setVendorId(claim.payeeId || "");
                setAmountInput(formatNumberWithCommas(String(claim.amount)));
                setDescription(claim.paymentDetails?.transactionContent || claim.description || "");
                setExpenseCategory((claim as any).expenseCategory || "");
                setMemo(claim.paymentDetails?.payerNotes || "");
                const status = claim.paymentDetails?.invoiceStatus;
                if (status === 'not_yet') setReceiptStatus('pending');
                else if (status === 'unable') setReceiptStatus('none');
                else setReceiptStatus('obtained');
                if (status === 'obtained' || status === 'unable') setInvoiceNumber(claim.paymentDetails?.invoiceNumber || "");
                if ((claim.paymentDetails as any)?.invoiceDate) setInvoiceDate((claim.paymentDetails as any).invoiceDate);
                if (claim.paymentDetails?.bankCode) setManualBankCode(claim.paymentDetails.bankCode);
                if (claim.paymentDetails?.bankAccount) setManualBankAccount(claim.paymentDetails.bankAccount);
                if (claim.paymentDetails?.invoiceFile) setExistingInvoiceFile(claim.paymentDetails.invoiceFile);
                if (claim.paymentDetails?.invoiceUrl) setInvoiceUrl(claim.paymentDetails.invoiceUrl);
            }
        }
    }, [editId, claims]);

    const selectedVendor = useMemo(() => vendors.find((v) => v.id === vendorId) || null, [vendors, vendorId]);

    useEffect(() => {
        if (selectedVendor && !selectedVendor.isFloatingAccount) {
            setManualBankCode("");
            setManualBankAccount("");
        }
    }, [selectedVendor]);

    const bankAccountDisplay = useMemo(() => {
        if (!selectedVendor) return "";
        if (selectedVendor.isFloatingAccount) return "需自行填寫";
        const bank = BANK_LIST.find(b => b.code === selectedVendor.bankCode);
        return `(${selectedVendor.bankCode} ${bank?.name || ""}) ${selectedVendor.bankAccount}`;
    }, [selectedVendor]);

    const amount = parseAmountToNumber(amountInput);

    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        if (!vendorId) e.vendorId = "請選擇廠商";
        if (!amount || amount <= 0) e.amount = "請輸入大於 0 的金額";
        if (!description.trim()) e.description = "請填寫交易內容";
        if (!expenseCategory) e.expenseCategory = "請選擇費用類別";
        if (memo.length > 10) e.memo = "備註不得超過 10 個字";
        if (receiptStatus === "obtained" && !invoiceNumber.trim()) e.invoiceNumber = "已取得發票/收據時，請填寫號碼";
        if (receiptStatus === "none" && !invoiceNumber.trim()) e.invoiceNumber = "請填寫無法取得的原因";
        if (receiptStatus === "obtained" && attachments.length === 0 && !existingInvoiceFile) e.attachments = "請上傳發票或收據";
        if (selectedVendor?.isFloatingAccount) {
            if (!manualBankCode) e.manualBankCode = "請選擇銀行";
            if (!manualBankAccount) e.manualBankAccount = "請填寫銀行帳號";
        }
        return e;
    }, [vendorId, amount, description, expenseCategory, memo, receiptStatus, invoiceNumber, selectedVendor, manualBankCode, manualBankAccount, attachments, existingInvoiceFile]);

    const isValid = Object.keys(errors).length === 0;

    const handleSaveDraft = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            let finalInvoiceUrl = invoiceUrl;
            if (attachments.length > 0) {
                finalInvoiceUrl = await uploadFile(
                    attachments[0],
                    invoiceDate || todayISO(),
                    selectedVendor?.name || '未知廠商',
                    expenseCategory || '未分類',
                    amount || 0,
                    0
                );
            }

            const newClaim = {
                applicantId: currentUser.id,
                type: 'payment',
                amount: amount || 0,
                description: description.trim() || '未命名廠商付款',
                expenseCategory: expenseCategory || '',
                payeeId: vendorId || '',
                payee: selectedVendor?.name || '',
                items: [],
                date: todayISO(),
                status: 'draft' as const,
                paymentDetails: {
                    transactionContent: description.trim(),
                    payerNotes: memo.trim(),
                    invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as any,
                    invoiceNumber: (receiptStatus === 'obtained' || receiptStatus === 'none') ? invoiceNumber.trim() : undefined,
                    invoiceDate: receiptStatus === 'obtained' ? invoiceDate : undefined,
                    invoiceFile: attachments.length > 0 ? attachments[0].name : existingInvoiceFile,
                    invoiceUrl: finalInvoiceUrl,
                    bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                    bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
                }
            };
            if (editId) updateClaim(editId, newClaim);
            else addClaim(newClaim as any);
            router.push('/?tab=drafts');
        } catch (error: any) {
            console.error(error);
            alert('儲存失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({
            vendorId: true, manualBankCode: true, manualBankAccount: true,
            amount: true, description: true, expenseCategory: true,
            memo: true, invoiceNumber: true, attachments: true,
        });
        if (!isValid || !currentUser) return;

        setIsSubmitting(true);
        try {
            let finalInvoiceUrl = invoiceUrl;
            if (attachments.length > 0) {
                finalInvoiceUrl = await uploadFile(
                    attachments[0],
                    invoiceDate || todayISO(),
                    selectedVendor?.name || '未知廠商',
                    expenseCategory,
                    amount,
                    0
                );
            }

            const newClaim = {
                applicantId: currentUser.id,
                type: 'payment',
                amount: amount,
                description: description.trim(),
                expenseCategory,
                payeeId: vendorId,
                payee: selectedVendor?.name || '',
                items: [],
                date: todayISO(),
                status: (currentUser.approverId ? 'pending_approval' : 'pending_finance') as any,
                paymentDetails: {
                    transactionContent: description.trim(),
                    payerNotes: memo.trim(),
                    invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as any,
                    invoiceNumber: (receiptStatus === 'obtained' || receiptStatus === 'none') ? invoiceNumber.trim() : undefined,
                    invoiceDate: receiptStatus === 'obtained' ? invoiceDate : undefined,
                    invoiceFile: attachments.length > 0 ? attachments[0].name : existingInvoiceFile,
                    invoiceUrl: finalInvoiceUrl,
                    bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                    bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
                }
            };
            if (editId) updateClaim(editId, newClaim);
            else addClaim(newClaim as any);
            router.push('/');
        } catch (error: any) {
            console.error(error);
            alert('提交失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const showErr = (key: string) => (touched[key] && errors[key]) || undefined;

    return (
        <div className="container">
            <PageHeader
                title="廠商請款"
                subtitle="請填寫付款對象、金額及相關憑證資料。"
            />

            <div className="card" style={{ padding: '2.5rem' }}>
                <form onSubmit={handleSubmit} className="space-y-10">
                    <FormSection title="付款對象">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Field label="廠商名稱" required error={showErr("vendorId")}>
                                <SearchableVendorSelect
                                    vendors={vendors}
                                    vendorRequests={vendorRequests}
                                    value={vendorId}
                                    onChange={(id) => { setVendorId(id); setTouched(t => ({ ...t, vendorId: true })); }}
                                    onBlur={() => setTouched(t => ({ ...t, vendorId: true }))}
                                    error={showErr("vendorId") || undefined}
                                    disabled={isSubmitting}
                                />
                            </Field>

                            {selectedVendor?.isFloatingAccount ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Field label="收款銀行" required error={showErr("manualBankCode")}>
                                        <div style={{ position: 'relative' }}>
                                            <select className="form-input" value={manualBankCode} onChange={e => setManualBankCode(e.target.value)} onBlur={() => setTouched(t => ({ ...t, manualBankCode: true }))} style={{ appearance: 'none', paddingRight: '2rem' }} disabled={isSubmitting}>
                                                <option value="">==請選擇==</option>
                                                {BANK_LIST.map(bank => (<option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                        </div>
                                    </Field>
                                    <Field label="收款帳號" required error={showErr("manualBankAccount")}>
                                        <input type="text" value={manualBankAccount} onChange={e => { if (/^\d*$/.test(e.target.value)) setManualBankAccount(e.target.value); }} onBlur={() => setTouched(t => ({ ...t, manualBankAccount: true }))} className="form-input" placeholder="請輸入銀行帳號" inputMode="numeric" disabled={isSubmitting} />
                                    </Field>
                                </div>
                            ) : (
                                <Field label="付款帳號" hint={vendorId ? "" : "請先選擇廠商以顯示帳號"}>
                                    <div className="input-wrapper-icon">
                                        <CreditCard size={18} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                                        <input type="text" value={bankAccountDisplay} disabled className="form-input has-icon" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', borderStyle: 'dashed' }} placeholder="請先選擇廠商" />
                                    </div>
                                </Field>
                            )}
                        </div>
                    </FormSection>

                    <FormSection title="付款內容">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Field label="費用類別" required error={showErr("expenseCategory")}>
                                    <div style={{ position: 'relative' }}>
                                        <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} onBlur={() => setTouched(t => ({ ...t, expenseCategory: true }))} className="form-input" style={{ appearance: 'none', paddingRight: '2rem' }} disabled={isSubmitting}>
                                            <option value="">請選擇費用類別</option>
                                            {EXPENSE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                    </div>
                                </Field>
                                <Field label="請款金額" required error={showErr("amount")}>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, pointerEvents: 'none' }}>NT$</span>
                                        <input type="text" inputMode="numeric" value={amountInput} onChange={(e) => setAmountInput(formatNumberWithCommas(e.target.value))} onBlur={() => setTouched(t => ({ ...t, amount: true }))} className="form-input" style={{ paddingLeft: '2.8rem', textAlign: 'right', fontWeight: 600, fontSize: '1.1rem' }} placeholder="0" disabled={isSubmitting} />
                                    </div>
                                </Field>
                            </div>

                            <Field label="交易內容" required error={showErr("description")}>
                                <div className="input-wrapper-icon">
                                    <FileText size={18} className="input-icon" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => setTouched(t => ({ ...t, description: true }))} className="form-input has-icon" placeholder="例如：12月份伺服器託管費用、辦公室文具採購" disabled={isSubmitting} />
                                </div>
                            </Field>

                            <Field label="付款人備註" error={showErr("memo")}>
                                <div style={{ position: 'relative' }}>
                                    <input type="text" value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 10))} onBlur={() => setTouched(t => ({ ...t, memo: true }))} className="form-input" placeholder="選填：顯示於對方銀行存摺，限 10 字內" maxLength={10} disabled={isSubmitting} />
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{memo.length}/10</div>
                                </div>
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="憑證與附件">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                            <div className="md:col-span-3 space-y-6">
                                <Field label="發票號碼 / 無法提供原因" required error={showErr("invoiceNumber")}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <button type="button" onClick={() => { setReceiptStatus('obtained'); setInvoiceNumber(""); }} className={`btn ${receiptStatus === 'obtained' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>已取得發票</button>
                                        <button type="button" onClick={() => { setReceiptStatus('pending'); setInvoiceNumber(""); }} className={`btn ${receiptStatus === 'pending' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>未取得(候補)</button>
                                        <button type="button" onClick={() => { setReceiptStatus('none'); setInvoiceNumber(""); }} className={`btn ${receiptStatus === 'none' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }}>無法取得</button>
                                    </div>
                                    <input
                                        type="text"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(receiptStatus === 'obtained' ? e.target.value.replace(/[^a-zA-Z0-9]/g, '') : e.target.value)}
                                        onBlur={() => setTouched(t => ({ ...t, invoiceNumber: true }))}
                                        className="form-input"
                                        placeholder={receiptStatus === "obtained" ? "請輸入發票號碼" : receiptStatus === "none" ? "請說明無法取得原因" : "系統將標註為候傳項目"}
                                        disabled={isSubmitting || receiptStatus === 'pending'}
                                    />
                                </Field>
                                {receiptStatus === "obtained" && (
                                    <Field label="發票日期" required>
                                        <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="form-input" disabled={isSubmitting} />
                                    </Field>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <Field label="憑證上傳" required={receiptStatus === 'obtained'} error={showErr("attachments")}>
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
                                        <input type="file" id="receipt-upload" style={{ display: 'none' }} onChange={(e) => { if (e.target.files) { const f = e.target.files[0]; setAttachments([f]); setInvoiceUrl(URL.createObjectURL(f)); } }} disabled={isSubmitting} />

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

                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', marginTop: '2rem' }}>
                        <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--color-text-secondary)' }} disabled={isSubmitting}>取消離開</button>
                        {!isResubmit && (
                            <button type="button" onClick={handleSaveDraft} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)', minWidth: '120px' }} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                儲存草稿
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '150px', fontSize: '1rem' }} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            {isResubmit ? '重新提交申請' : '提交申請並送出'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
