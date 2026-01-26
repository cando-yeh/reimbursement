import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Upload, X, FileText, ChevronDown, Save, Send } from 'lucide-react';
// ... (keep existing imports)

// ... (inside component)

<div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', marginTop: '2rem' }}>
    <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="btn btn-ghost"
        style={{ marginRight: 'auto', color: 'var(--color-text-secondary)' }}
    >
        取消
    </button>

    <button
        type="button"
        onClick={(e) => { e.preventDefault(); handleSaveDraft(); }}
        className="btn btn-ghost"
        style={{ border: '1px solid var(--color-border)', padding: '0.5rem 1rem' }}
    >
        <Save size={18} style={{ marginRight: '0.5rem' }} />
        儲存草稿
    </button>
    <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', padding: '0.5rem 1rem' }}>
        <Send size={18} style={{ marginRight: '0.5rem' }} />
        提交申請
    </button>
</div>
import { BANK_LIST, EXPENSE_CATEGORIES } from '../../utils/constants';

// ------- Helpers -------
function formatNumberWithCommas(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseAmountToNumber(value: string) {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
}

// ------- UI Components (Adapted to Project Styles) -------
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


const PaymentRequest: React.FC = () => {
    const navigate = useNavigate();
    const { vendors, addClaim, currentUser } = useApp();

    // Form State
    const [vendorId, setVendorId] = useState<string>("");
    const [amountInput, setAmountInput] = useState<string>("");
    const [description, setDescription] = useState<string>(""); // Transaction Content
    const [expenseCategory, setExpenseCategory] = useState<string>("");
    const [memo, setMemo] = useState<string>(""); // Payer Notes
    const [receiptStatus, setReceiptStatus] = useState<"obtained" | "pending" | "none">("obtained");
    const [invoiceNumber, setInvoiceNumber] = useState<string>("");
    const [attachments, setAttachments] = useState<File[]>([]);

    // Manual Bank State (for floating accounts)
    const [manualBankCode, setManualBankCode] = useState("");
    const [manualBankAccount, setManualBankAccount] = useState("");

    // Validation State
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const selectedVendor = useMemo(
        () => vendors.find((v) => v.id === vendorId) || null,
        [vendors, vendorId]
    );

    // Reset manual fields when vendor changes (optional, but good UX)
    useEffect(() => {
        if (selectedVendor && !selectedVendor.isFloatingAccount) {
            setManualBankCode("");
            setManualBankAccount("");
        }
    }, [selectedVendor]);

    const bankAccountDisplay = selectedVendor
        ? (selectedVendor.isFloatingAccount ? "需自行填寫" : `${selectedVendor.bankCode} - ${selectedVendor.bankAccount}`)
        : "";
    const amount = parseAmountToNumber(amountInput);

    // Validation Logic
    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        if (!vendorId) e.vendorId = "請選擇廠商";
        if (!amount || amount <= 0) e.amount = "請輸入大於 0 的金額";
        if (!description.trim()) e.description = "請填寫交易內容";
        if (!expenseCategory) e.expenseCategory = "請選擇費用類別";
        if (memo.length > 10) e.memo = "備註不得超過 10 個字";
        if (receiptStatus === "obtained" && !invoiceNumber.trim()) e.invoiceNumber = "已取得發票/收據時，請填寫號碼";

        if (selectedVendor?.isFloatingAccount) {
            if (!manualBankCode) e.manualBankCode = "請選擇銀行";
            if (!manualBankAccount) e.manualBankAccount = "請填寫銀行帳號";
        }

        return e;
    }, [vendorId, amount, description, expenseCategory, memo, receiptStatus, invoiceNumber, selectedVendor, manualBankCode, manualBankAccount]);

    const isValid = Object.keys(errors).length === 0;

    function markTouched(key: string) {
        setTouched((prev) => ({ ...prev, [key]: true }));
    }

    function handleAmountChange(v: string) {
        setAmountInput(formatNumberWithCommas(v));
    }

    // Attachments Logic
    function handleFiles(files: FileList | null) {
        if (!files) return;
        const next = Array.from(files);
        setAttachments((prev) => {
            const map = new Map<string, File>();
            [...prev, ...next].forEach((f) => {
                map.set(`${f.name}-${f.size}-${f.lastModified}`, f);
            });
            return Array.from(map.values());
        });
    }

    function removeFile(idx: number) {
        setAttachments((prev) => prev.filter((_, i) => i !== idx));
    }

    const handleSaveDraft = () => {
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
                invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as "obtained" | "not_yet" | "unable",
                invoiceNumber: receiptStatus === 'obtained' ? invoiceNumber.trim() : undefined,
                invoiceFile: attachments.length > 0 ? attachments[0].name : undefined,
                bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
            }
        };

        // Backward compatibility
        if (receiptStatus === 'obtained') {
            (newClaim as any).invoiceNumber = invoiceNumber.trim();
        }

        addClaim(newClaim as any);
        navigate('/dashboard');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all as touched
        setTouched({
            vendorId: true,
            manualBankCode: true,
            manualBankAccount: true,
            amount: true,
            description: true,
            expenseCategory: true,
            memo: true,
            invoiceNumber: true,
        });

        if (!isValid) return;

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
            paymentDetails: {
                transactionContent: description.trim(),
                payerNotes: memo.trim(),
                invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as "obtained" | "not_yet" | "unable",
                invoiceNumber: receiptStatus === 'obtained' ? invoiceNumber.trim() : undefined,
                invoiceFile: attachments.length > 0 ? attachments[0].name : undefined,
                bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
            }
        };

        // Backward compatibility
        if (receiptStatus === 'obtained') {
            (newClaim as any).invoiceNumber = invoiceNumber.trim();
        }

        addClaim(newClaim);
        navigate('/dashboard');
    };

    const showErr = (key: string) => touched[key] && errors[key];

    return (
        <div className="page-container">
            <header className="mb-6">
                <h1 className="page-title">廠商付款申請</h1>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    請依序填寫付款對象、付款內容與憑證資訊。帶有 <span style={{ color: 'var(--color-danger)' }}>*</span> 為必填。
                </p>
            </header>

            <div className="card">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Section 1: Vendor */}
                    <div className="form-section">
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>付款對象</h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Step 1 / 3</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="廠商名稱" required error={showErr("vendorId")}>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={vendorId}
                                        onChange={(e) => {
                                            setVendorId(e.target.value);
                                            markTouched("vendorId");
                                        }}
                                        onBlur={() => markTouched("vendorId")}
                                        className="form-input"
                                        style={{ appearance: 'none' }}
                                    >
                                        <option value="">請選擇廠商</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </Field>

                            {selectedVendor?.isFloatingAccount ? (
                                <>
                                    <Field label="收款銀行" required error={showErr("manualBankCode")}>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                className="form-input"
                                                value={manualBankCode}
                                                onChange={e => setManualBankCode(e.target.value)}
                                                onBlur={() => markTouched("manualBankCode")}
                                                style={{ appearance: 'none' }}
                                            >
                                                <option value="">==請選擇==</option>
                                                {BANK_LIST.map(bank => (
                                                    <option key={bank.code} value={bank.code}>
                                                        {bank.code} {bank.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </Field>
                                    <Field label="收款帳號" required error={showErr("manualBankAccount")}>
                                        <input
                                            type="text"
                                            value={manualBankAccount}
                                            onChange={e => {
                                                if (/^\d*$/.test(e.target.value)) setManualBankAccount(e.target.value);
                                            }}
                                            onBlur={() => markTouched("manualBankAccount")}
                                            className="form-input"
                                            placeholder="請輸入銀行帳號"
                                            inputMode="numeric"
                                        />
                                    </Field>
                                </>
                            ) : (
                                <Field label="付款帳號" hint={vendorId ? "" : "請先選擇廠商以顯示帳號"}>
                                    <input
                                        type="text"
                                        value={bankAccountDisplay}
                                        disabled
                                        className="form-input"
                                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)' }}
                                        placeholder="請先選擇廠商以顯示帳號"
                                    />
                                </Field>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Payment */}
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>付款內容</h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Step 2 / 3</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="費用類別" required error={showErr("expenseCategory")}>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        onBlur={() => markTouched("expenseCategory")}
                                        className="form-input"
                                        style={{ appearance: 'none' }}
                                    >
                                        <option value="">請選擇費用類別</option>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </Field>

                            <Field label="請款金額" required hint="單位：新台幣（TWD）" error={showErr("amount")}>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>NT$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={amountInput}
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        onBlur={() => markTouched("amount")}
                                        className="form-input"
                                        style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
                                        placeholder="0"
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>TWD</span>
                                </div>
                            </Field>

                            <Field label="交易內容" required hint="例：伺服器費用 / 顧問費 / 廣告費" error={showErr("description")}>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => markTouched("description")}
                                    className="form-input"
                                    placeholder="例如：伺服器費用"
                                />
                            </Field>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <Field label="付款人備註" hint="顯示於對方銀行存摺，不得超過 10 個字" error={showErr("memo")}>
                                <input
                                    type="text"
                                    value={memo}
                                    onChange={(e) => setMemo(e.target.value.slice(0, 10))}
                                    onBlur={() => markTouched("memo")}
                                    className="form-input"
                                    placeholder="限 10 個字元"
                                    maxLength={10}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{memo.length}/10</span>
                                </div>
                            </Field>
                        </div>
                    </div>

                    {/* Section 3: Invoice & Attachments */}
                    <div className="form-section" style={{ marginTop: '2rem' }}>
                        <div className="form-section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>發票與附件</h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Step 3 / 3</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column: Invoice Details */}
                            <div className="space-y-6">
                                <Field label="發票收據狀態" required>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={receiptStatus}
                                            onChange={(e) => {
                                                const v = e.target.value as "obtained" | "pending" | "none";
                                                setReceiptStatus(v);
                                                if (v !== "obtained") setInvoiceNumber("");
                                            }}
                                            className="form-input"
                                            style={{ appearance: 'none' }}
                                        >
                                            <option value="obtained">已取得</option>
                                            <option value="pending">未取得（稍後補）</option>
                                            <option value="none">不適用</option>
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}>
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </Field>

                                {receiptStatus === "obtained" ? (
                                    <Field label="發票號碼" required error={showErr("invoiceNumber")}>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                setInvoiceNumber(value);
                                            }}
                                            onBlur={() => markTouched("invoiceNumber")}
                                            className="form-input"
                                            placeholder="請輸入發票號碼"
                                        />
                                    </Field>
                                ) : (
                                    <div style={{
                                        border: '1px dashed var(--color-border)',
                                        borderRadius: '0.5rem',
                                        padding: '1rem',
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        color: 'var(--color-text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: '0.9rem',
                                        minHeight: '80px'
                                    }}>
                                        {receiptStatus === "pending"
                                            ? "已選擇「未取得」，可於後續補上發票號碼。"
                                            : "已選擇「不適用」，本次不需填寫發票號碼。"}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Attachments */}
                            {receiptStatus === 'obtained' && (
                                <div>
                                    <Field label="附件上傳" hint="可上傳發票/收據、報價單、合約等（多檔可選）">
                                        <div style={{
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '0.75rem',
                                            padding: '1rem',
                                            backgroundColor: 'white',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>拖曳檔案到此處</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>或點擊按鈕選擇檔案</div>
                                                </div>
                                                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                                    選擇檔案
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        multiple
                                                        onChange={(e) => handleFiles(e.target.files)}
                                                    />
                                                </label>
                                            </div>

                                            {attachments.length > 0 && (
                                                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                                    {attachments.map((f, idx) => (
                                                        <div
                                                            key={`${f.name}-${f.size}-${f.lastModified}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '0.5rem 0.75rem',
                                                                backgroundColor: 'var(--color-bg-secondary)',
                                                                borderRadius: '0.5rem',
                                                                border: '1px solid var(--color-border)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                                <FileText size={16} className="text-secondary" />
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div style={{ fontSize: '0.9rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{(f.size / 1024).toFixed(1)} KB</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFile(idx)}
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '4px',
                                                                    color: 'var(--color-danger)',
                                                                    opacity: 0.7
                                                                }}
                                                                className="hover:opacity-100"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Field>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', marginTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="btn btn-ghost"
                            style={{ marginRight: 'auto', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
                        >
                            取消
                        </button>

                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleSaveDraft(); }}
                            className="btn btn-ghost"
                            style={{ border: '1px solid var(--color-border)', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
                        >
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            儲存草稿
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                            <Send size={18} style={{ marginRight: '0.5rem' }} />
                            提交申請
                        </button>
                    </div>

                    {/* Debug Preview - Optional, limiting visibility or removing for prod feel, 
                        but user included it so maybe helpful while dev. I will comment it out or leave it if requested. 
                        User: "Please refer to the following code..." 
                        I will omit the debug block for the final clean UI unless asked.
                    */}
                </form>
            </div>
        </div>
    );
};

export default PaymentRequest;
