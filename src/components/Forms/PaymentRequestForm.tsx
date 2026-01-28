'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Upload, X, FileText, ChevronDown, Save, Send, Loader2 } from 'lucide-react';
import { BANK_LIST, EXPENSE_CATEGORIES } from '@/utils/constants';
import SearchableVendorSelect from '@/components/Common/SearchableVendorSelect';
import { uploadFile } from '@/utils/storage';

function formatNumberWithCommas(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseAmountToNumber(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
}

function Field({ label, required, hint, children, error }: any) {
    return (
        <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                    {label}
                    {required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
                </span>
            </label>
            {children}
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</p>}
            {!error && hint && <p className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{hint}</p>}
        </div>
    );
}

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

    useEffect(() => {
        if (editId) {
            const claim = claims.find(c => c.id === editId);
            if (claim && claim.type === 'payment') {
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
                    invoiceDate || new Date().toISOString().split('T')[0],
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
                date: new Date().toISOString().split('T')[0],
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
            if (editId) await updateClaim(editId, newClaim);
            else await addClaim(newClaim as any);
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
                    invoiceDate || new Date().toISOString().split('T')[0],
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
                date: new Date().toISOString().split('T')[0],
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
            if (editId) await updateClaim(editId, newClaim);
            else await addClaim(newClaim as any);
            router.push('/?tab=in_review');
        } catch (error: any) {
            console.error(error);
            alert('提交失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const showErr = (key: string) => (touched[key] && errors[key]) || undefined;

    return (
        <div className="form-container">
            <header className="vendor-header simple" style={{ marginBottom: '2rem' }}>
                <button type="button" onClick={() => router.back()} className="btn btn-ghost back-link" disabled={isSubmitting}>
                    <ChevronDown size={16} style={{ transform: 'rotate(90deg)' }} /> 回前頁
                </button>
                <h1 className="heading-lg">廠商付款申請</h1>
            </header>
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="form-section">
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>付款對象</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                <>
                                    <Field label="收款銀行" required error={showErr("manualBankCode")}>
                                        <div style={{ position: 'relative' }}>
                                            <select className="form-input" value={manualBankCode} onChange={e => setManualBankCode(e.target.value)} onBlur={() => setTouched(t => ({ ...t, manualBankCode: true }))} style={{ appearance: 'none' }} disabled={isSubmitting}>
                                                <option value="">==請選擇==</option>
                                                {BANK_LIST.map(bank => (<option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                        </div>
                                    </Field>
                                    <Field label="收款帳號" required error={showErr("manualBankAccount")}>
                                        <input type="text" value={manualBankAccount} onChange={e => { if (/^\d*$/.test(e.target.value)) setManualBankAccount(e.target.value); }} onBlur={() => setTouched(t => ({ ...t, manualBankAccount: true }))} className="form-input" placeholder="請輸入銀行帳號" inputMode="numeric" disabled={isSubmitting} />
                                    </Field>
                                </>
                            ) : (
                                <Field label="付款帳號" hint={vendorId ? "" : "請先選擇廠商以顯示帳號"}>
                                    <input type="text" value={bankAccountDisplay} disabled className="form-input" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }} placeholder="請先選擇廠商以顯示帳號" />
                                </Field>
                            )}
                        </div>
                    </div>
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>付款內容</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <Field label="費用類別" required error={showErr("expenseCategory")}>
                                        <div style={{ position: 'relative' }}>
                                            <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} onBlur={() => setTouched(t => ({ ...t, expenseCategory: true }))} className="form-input" style={{ appearance: 'none' }} disabled={isSubmitting}>
                                                <option value="">請選擇費用類別</option>
                                                {EXPENSE_CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                        </div>
                                    </Field>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Field label="請款金額" required error={showErr("amount")}>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>NT$</span>
                                            <input type="text" inputMode="numeric" value={amountInput} onChange={(e) => setAmountInput(formatNumberWithCommas(e.target.value))} onBlur={() => setTouched(t => ({ ...t, amount: true }))} className="form-input" style={{ paddingLeft: '2.5rem', paddingRight: '3rem', textAlign: 'right' }} placeholder="0" disabled={isSubmitting} />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>TWD</span>
                                        </div>
                                    </Field>
                                </div>
                            </div>
                            <Field label="交易內容" required error={showErr("description")}>
                                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => setTouched(t => ({ ...t, description: true }))} className="form-input" placeholder="例如：伺服器費用" disabled={isSubmitting} />
                            </Field>
                        </div>
                        <div style={{ marginTop: '1.5rem' }}>
                            <Field label="付款人備註" error={showErr("memo")}>
                                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 10))} onBlur={() => setTouched(t => ({ ...t, memo: true }))} className="form-input" placeholder="顯示於對方銀行存摺，不得超過 10 個字" maxLength={10} disabled={isSubmitting} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}><span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{memo.length}/10</span></div>
                            </Field>
                        </div>
                    </div>
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>發票與附件</h2>
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: '0 0 300px' }}>
                                <Field label="發票收據狀態" required>
                                    <div style={{ position: 'relative' }}>
                                        <select value={receiptStatus} onChange={(e) => { const v = e.target.value as any; setReceiptStatus(v); if (v !== "obtained") setInvoiceNumber(""); }} className="form-input" style={{ appearance: 'none' }} disabled={isSubmitting}>
                                            <option value="obtained">已取得</option>
                                            <option value="pending">未取得（稍後補）</option>
                                            <option value="none">無法取得</option>
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                    </div>
                                </Field>
                                {receiptStatus === "pending" ? (
                                    <div style={{ border: '1px dashed var(--color-border)', borderRadius: '0.5rem', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', minHeight: '80px' }}>已選擇「未取得」，可於後續補上發票號碼。</div>
                                ) : (
                                    <>
                                        <Field label={receiptStatus === "obtained" ? "發票號碼" : "無法取得原因"} required error={showErr("invoiceNumber")}>
                                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(receiptStatus === 'obtained' ? e.target.value.replace(/[^a-zA-Z0-9]/g, '') : e.target.value)} onBlur={() => setTouched(t => ({ ...t, invoiceNumber: true }))} className="form-input" placeholder={receiptStatus === "obtained" ? "請輸入發票號碼" : "請說明原因"} disabled={isSubmitting} />
                                        </Field>
                                        {receiptStatus === "obtained" && (
                                            <Field label="發票日期" required>
                                                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="form-input" disabled={isSubmitting} />
                                            </Field>
                                        )}
                                    </>
                                )}
                            </div>
                            <div style={{ width: '120px' }}>
                                {receiptStatus === 'obtained' && (
                                    <Field label="附件上傳" required error={showErr("attachments")}>
                                        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.5rem', backgroundColor: 'white', height: '100%', display: 'flex', flexDirection: 'column', minHeight: '120px', alignItems: 'center' }}>
                                            {attachments.length === 0 && (
                                                <label title="上傳附件" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isSubmitting ? 'not-allowed' : 'pointer', border: '1px dashed var(--color-border)', borderRadius: '0.5rem', margin: '0.5rem 0', backgroundColor: 'var(--color-bg-secondary)' }}>
                                                    <Upload size={24} style={{ color: 'var(--color-text-secondary)' }} />
                                                    <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files) { const f = e.target.files[0]; setAttachments([f]); setInvoiceUrl(URL.createObjectURL(f)); } }} disabled={isSubmitting} />
                                                </label>
                                            )}
                                            {attachments.length > 0 && (
                                                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                    {attachments.map((f, idx) => (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                                                            <div title={f.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                            <button type="button" onClick={() => setAttachments([])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} disabled={isSubmitting}><X size={14} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {existingInvoiceFile && attachments.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>已有檔案: {existingInvoiceFile}</div>}
                                        </div>
                                    </Field>
                                )}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', marginTop: '2rem' }}>
                        <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--color-text-secondary)' }} disabled={isSubmitting}>取消</button>
                        {!isResubmit && <button type="button" onClick={handleSaveDraft} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 儲存草稿</button>}
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} {isResubmit ? '重新提交申請' : '提交申請'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
