import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Save, Send, ArrowLeft, Plus, Trash2, Upload, Image, X } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

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
    fileUrl?: string; // Session-based URL
}

export default function EmployeeReimbursement() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addClaim, updateClaim, claims, currentUser } = useApp();

    const [items, setItems] = useState<ExpenseItemWithAttachment[]>([
        { id: '1', amount: 0, date: new Date().toISOString().split('T')[0], description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
    ]);
    const [noReceiptReason, setNoReceiptReason] = useState('');

    const existingClaim = id ? claims.find(c => c.id === id) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    // Load existing data
    useEffect(() => {
        if (id) {
            const claim = claims.find(c => c.id === id);
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
                // Load noReceiptReason
                if (claim.noReceiptReason) setNoReceiptReason(claim.noReceiptReason);
            }
        }
    }, [id, claims]);

    const handleItemChange = (id: string, field: keyof ExpenseItemWithAttachment, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
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

    const handleSubmit = (action: 'submit' | 'draft') => {
        // For draft, set status explicitly. For submit, let addClaim handle the logic 
        // based on whether the user has an approverId (pending_approval) or not (pending_finance).
        const status: Claim['status'] | undefined = action === 'draft' ? 'draft' : undefined;

        const validItems = items.filter(i => (Number(i.amount) > 0) && i.description.trim() !== '' && i.category !== '');

        if (validItems.length === 0) {
            alert('請至少新增一筆有效的費用明細（需填寫費用類別、說明，且金額大於 0）。');
            return;
        }

        // Ensure strictly positive amounts
        const invalidAmountItems = items.filter(i => (Number(i.amount) <= 0 || isNaN(Number(i.amount))));
        if (invalidAmountItems.length > 0) {
            alert('金額必須大於 0。');
            return;
        }

        // Check receipts
        if (action === 'submit') {
            const missingReceipts = validItems.filter(i => !i.noReceipt && !i.receiptFile && !i.existingReceiptName);
            if (missingReceipts.length > 0) {
                alert('請為所有項目上傳憑證，或勾選「無憑證」。');
                return;
            }
            // Validate noReceiptReason if any item has noReceipt
            const hasNoReceiptItems = validItems.some(i => i.noReceipt);
            if (hasNoReceiptItems && noReceiptReason.trim() === '') {
                alert('請填寫無憑證原因。');
                return;
            }
        }

        // Auto-generate description mostly based on first item or date
        const generatedDescription = `${validItems[0].category} 等費用報銷`;

        if (id) {
            // Edit existing - determine status based on action and approver
            const updateStatus: Claim['status'] = action === 'draft'
                ? 'draft'
                : (currentUser.approverId ? 'pending_approval' : 'pending_finance');

            updateClaim(id, {
                description: generatedDescription,
                date: new Date().toISOString().split('T')[0],
                type: 'employee',
                payee: currentUser.name,
                status: updateStatus,
                noReceiptReason: validItems.some(i => i.noReceipt) ? noReceiptReason : undefined,
                items: validItems.map(item => ({
                    id: item.id,
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category,
                    invoiceNumber: item.invoiceNumber,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || ''),
                    fileUrl: item.fileUrl
                }))
            });
        } else {
            addClaim({
                description: generatedDescription,
                date: new Date().toISOString().split('T')[0],
                type: 'employee',
                payee: currentUser.name,
                status: status,
                noReceiptReason: validItems.some(i => i.noReceipt) ? noReceiptReason : undefined,
                items: validItems.map(item => ({
                    id: item.id,
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category,
                    invoiceNumber: item.invoiceNumber,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || ''),
                    fileUrl: item.fileUrl
                }))
            });
        }
        navigate(action === 'draft' ? '/?tab=drafts' : '/?tab=in_review');
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 回上一頁
                </button>
                <h1 className="heading-lg">個人報銷申請</h1>
            </header>

            <div className="card">
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="heading-md">申請單資訊</h2>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                        總計: ${calculateTotal().toLocaleString()}
                    </div>
                </div>

                {/* Items List Header - Adjusted grid for Category */}
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

                    {/* Items List */}
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
                                />
                                <select
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                    value={item.category || ''}
                                    onChange={e => handleItemChange(item.id, 'category', e.target.value)}
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
                                />
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ marginRight: '0.25rem', color: 'var(--color-text-secondary)' }}>$</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%', textAlign: 'right' }}
                                        value={item.amount ? Number(item.amount).toLocaleString() : ''}
                                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                        onChange={e => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if (!/^\d*$/.test(val)) return;
                                            handleItemChange(item.id, 'amount', parseInt(val) || 0);
                                        }}
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
                                    />
                                )}
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {item.noReceipt ? (
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>-</span>
                                    ) : item.receiptFile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <a
                                                href={URL.createObjectURL(item.receiptFile)}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={item.receiptFile.name}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Image size={24} style={{ color: 'var(--color-primary)', cursor: 'pointer' }} />
                                            </a>
                                            <button
                                                onClick={() => handleItemChange(item.id, 'receiptFile', null)}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px' }}
                                                title="移除憑證"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : item.existingReceiptName ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                            <div title={item.existingReceiptName} style={{ cursor: 'pointer' }}>
                                                <Image size={24} style={{ color: 'var(--color-primary)' }} />
                                            </div>
                                            <button
                                                onClick={() => handleItemChange(item.id, 'existingReceiptName', undefined)}
                                                style={{ position: 'absolute', top: '-8px', right: '-12px', background: 'var(--color-text-secondary)', borderRadius: '50%', border: '1px solid var(--color-surface)', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', width: '16px', height: '16px' }}
                                                title="移除憑證"
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
                                                handleItemChange(item.id, 'fileUrl', URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={item.noReceipt}
                                        onChange={e => handleItemChange(item.id, 'noReceipt', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="btn btn-ghost"
                                            style={{ padding: '0.25rem', color: 'var(--color-danger)' }}
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
                >
                    <Plus size={18} /> 新增一筆費用
                </button>

                {/* No Receipt Reason Section */}
                {items.some(i => i.noReceipt) && (
                    <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(var(--color-warning-rgb), 0.1)', borderRadius: '8px', border: '1px solid var(--color-warning)' }}>
                        <label className="label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)' }}>
                            ⚠️ 無憑證原因 <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <textarea
                            className="form-input"
                            value={noReceiptReason}
                            onChange={e => setNoReceiptReason(e.target.value)}
                            placeholder="請說明為何此筆費用無法提供憑證..."
                            rows={3}
                            style={{ marginTop: '0.5rem' }}
                        />
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="btn btn-ghost"
                        style={{ marginRight: 'auto', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
                    >
                        取消
                    </button>
                    {!isResubmit && (
                        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                            <Save size={18} />
                            儲存草稿
                        </button>
                    )}
                    <button type="button" onClick={() => handleSubmit('submit')} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        <Send size={18} />
                        {isResubmit ? '重新提交申請' : '提交申請'}
                    </button>
                </div>
            </div>
        </div>
    );
}