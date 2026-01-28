'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Upload, X, FileText, ChevronDown, Save, Send } from 'lucide-react';
import { BANK_LIST, EXPENSE_CATEGORIES } from '@/utils/constants';
import SearchableVendorSelect from '@/components/Common/SearchableVendorSelect';

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
    const { vendors, addClaim, updateClaim, claims, currentUser, vendorRequests, fetchVendors } = useApp();

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    const [vendorId, setVendorId] = useState<string>("");
    const [amountInput, setAmountInput] = useState<string>("");
    // ... (lines 46-204 unchanged)

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="廠商名稱" required error={showErr("vendorId")}>
            <SearchableVendorSelect
                vendors={vendors}
                vendorRequests={vendorRequests}
                value={vendorId}
                onChange={(id) => { setVendorId(id); setTouched(t => ({ ...t, vendorId: true })); }}
                onBlur={() => setTouched(t => ({ ...t, vendorId: true }))}
                onOpen={() => { if (vendors.length === 0) fetchVendors(); }}
                error={showErr("vendorId") || undefined}
            />
        </Field>
        {selectedVendor?.isFloatingAccount ? (
            <>
                <Field label="收款銀行" required error={showErr("manualBankCode")}>
                    <div style={{ position: 'relative' }}>
                        <select className="form-input" value={manualBankCode} onChange={e => setManualBankCode(e.target.value)} onBlur={() => setTouched(t => ({ ...t, manualBankCode: true }))} style={{ appearance: 'none' }}>
                            <option value="">==請選擇==</option>
                            {BANK_LIST.map(bank => (<option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>))}
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                    </div>
                </Field>
                <Field label="收款帳號" required error={showErr("manualBankAccount")}>
                    <input type="text" value={manualBankAccount} onChange={e => { if (/^\d*$/.test(e.target.value)) setManualBankAccount(e.target.value); }} onBlur={() => setTouched(t => ({ ...t, manualBankAccount: true }))} className="form-input" placeholder="請輸入銀行帳號" inputMode="numeric" />
                </Field>
            </>
        ) : (
            <Field label="付款帳號" hint={vendorId ? "" : "請先選擇廠商以顯示帳號"}>
                <input type="text" value={bankAccountDisplay} disabled className="form-input" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }} placeholder="請先選擇廠商以顯示帳號" />
            </Field>
        )}
    </div>
                    </div >
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>付款內容</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <Field label="費用類別" required error={showErr("expenseCategory")}>
                                        <div style={{ position: 'relative' }}>
                                            <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} onBlur={() => setTouched(t => ({ ...t, expenseCategory: true }))} className="form-input" style={{ appearance: 'none' }}>
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
                                            <input type="text" inputMode="numeric" value={amountInput} onChange={(e) => setAmountInput(formatNumberWithCommas(e.target.value))} onBlur={() => setTouched(t => ({ ...t, amount: true }))} className="form-input" style={{ paddingLeft: '2.5rem', paddingRight: '3rem', textAlign: 'right' }} placeholder="0" />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>TWD</span>
                                        </div>
                                    </Field>
                                </div>
                            </div>
                            <Field label="交易內容" required error={showErr("description")}>
                                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => setTouched(t => ({ ...t, description: true }))} className="form-input" placeholder="例如：伺服器費用" />
                            </Field>
                        </div>
                        <div style={{ marginTop: '1.5rem' }}>
                            <Field label="付款人備註" error={showErr("memo")}>
                                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value.slice(0, 10))} onBlur={() => setTouched(t => ({ ...t, memo: true }))} className="form-input" placeholder="顯示於對方銀行存摺，不得超過 10 個字" maxLength={10} />
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
                                        <select value={receiptStatus} onChange={(e) => { const v = e.target.value as any; setReceiptStatus(v); if (v !== "obtained") setInvoiceNumber(""); }} className="form-input" style={{ appearance: 'none' }}>
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
                                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(receiptStatus === 'obtained' ? e.target.value.replace(/[^a-zA-Z0-9]/g, '') : e.target.value)} onBlur={() => setTouched(t => ({ ...t, invoiceNumber: true }))} className="form-input" placeholder={receiptStatus === "obtained" ? "請輸入發票號碼" : "請說明原因"} />
                                        </Field>
                                        {receiptStatus === "obtained" && (
                                            <Field label="發票日期" required>
                                                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="form-input" />
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
                                                <label title="上傳附件" style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px dashed var(--color-border)', borderRadius: '0.5rem', margin: '0.5rem 0', backgroundColor: 'var(--color-bg-secondary)' }}>
                                                    <Upload size={24} style={{ color: 'var(--color-text-secondary)' }} />
                                                    <input type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files) { const f = e.target.files[0]; setAttachments([f]); setInvoiceUrl(URL.createObjectURL(f)); } }} />
                                                </label>
                                            )}
                                            {attachments.length > 0 && (
                                                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                                    {attachments.map((f, idx) => (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.25rem', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                                                            <div title={f.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                                                            <button type="button" onClick={() => setAttachments([])} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}><X size={14} /></button>
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
                        <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--color-text-secondary)' }}>取消</button>
                        {!isResubmit && <button type="button" onClick={handleSaveDraft} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}><Save size={18} /> 儲存草稿</button>}
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}><Send size={18} /> {isResubmit ? '重新提交申請' : '提交申請'}</button>
                    </div>
                </form >
            </div >
        </div >
    );
}
