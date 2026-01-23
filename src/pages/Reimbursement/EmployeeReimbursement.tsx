import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Save, Send, ArrowLeft, Plus, Trash2, Upload, Image } from 'lucide-react';

interface ExpenseItemWithAttachment {
    id: string;
    date: string;
    amount: number;
    description: string;
    category?: string;
    noReceipt: boolean;
    receiptFile: File | null;
    existingReceiptName?: string;
}

const EXPENSE_CATEGORIES = [
    '保險費',
    '旅費',
    '廣告費',
    '交際費',
    '捐贈',
    '宜睿票券',
    '郵電費',
    '職工福利',
    '軟體使用費',
    '雜項購置',
    '租金支出',
    '文具用品'
];

export default function EmployeeReimbursement() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addClaim, updateClaim, claims } = useApp();

    const [items, setItems] = useState<ExpenseItemWithAttachment[]>([
        { id: '1', amount: 0, date: new Date().toISOString().split('T')[0], description: '', category: '', noReceipt: false, receiptFile: null }
    ]);

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
                    noReceipt: i.notes === '無憑證',
                    receiptFile: null,
                    existingReceiptName: (i.notes && i.notes !== '無憑證') ? i.notes : undefined
                }));
                if (loadedItems.length > 0) setItems(loadedItems);
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
            { id: Date.now().toString(), amount: 0, date: new Date().toISOString().split('T')[0], description: '', category: '', noReceipt: false, receiptFile: null }
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
        // Use pending_finance or pending_approval based on logic, but for simplicity we can default to pending_finance 
        // or let addClaim handle it if new. For update, we need explicit.
        // Let's use 'pending_finance' as a safe valid status for submitted items if we don't check approver here.
        // Or better: don't type it strictly as 'pending' which is wrong.
        const status: Claim['status'] = action === 'submit' ? 'pending_finance' : 'draft';

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
            const missingReceipts = validItems.filter(i => !i.noReceipt && !i.receiptFile);
            if (missingReceipts.length > 0) {
                alert('請為所有項目上傳憑證，或勾選「無憑證」。');
                return;
            }
        }

        // Auto-generate description mostly based on first item or date
        const generatedDescription = `${validItems[0].category} 等費用報銷 (${new Date().toISOString().split('T')[0]})`;

        if (id) {
            // Edit existing
            updateClaim(id, {
                description: generatedDescription,
                date: new Date().toISOString().split('T')[0],
                type: 'employee',
                status: status,
                items: validItems.map(item => ({
                    id: item.id,
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || '')
                }))
            });
        } else {
            addClaim({
                description: generatedDescription,
                date: new Date().toISOString().split('T')[0],
                type: 'employee',
                payee: 'John Doe (Me)',
                status: status,
                items: validItems.map(item => ({
                    id: item.id,
                    date: item.date,
                    amount: item.amount,
                    description: item.description,
                    category: item.category,
                    notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || '')
                }))
            });
        }
        navigate('/');
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <Link to="/applications/new" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 返回選擇頁面
                </Link>
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
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 120px 1fr 100px 120px 70px 40px',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)',
                    whiteSpace: 'nowrap'
                }}>
                    <div>日期</div>
                    <div>費用類別</div>
                    <div>費用說明</div>
                    <div>金額</div>
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
                                display: 'grid',
                                gridTemplateColumns: '110px 120px 1fr 100px 120px 70px 40px',
                                gap: '0.5rem',
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
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                placeholder="說明"
                                value={item.description}
                                onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '0.25rem', color: 'var(--color-text-secondary)' }}>$</span>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%' }}
                                    value={item.amount || ''}
                                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                    onChange={e => handleItemChange(item.id, 'amount', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                {item.noReceipt ? (
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>-</span>
                                ) : item.receiptFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Image size={14} style={{ color: 'var(--color-success)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                                            {item.receiptFile.name}
                                        </span>
                                    </div>
                                ) : item.existingReceiptName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Image size={14} style={{ color: 'var(--color-primary)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                                            {item.existingReceiptName}
                                        </span>
                                        <button onClick={() => document.getElementById(`receipt-${item.id}`)?.click()} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                                            <Upload size={12} style={{ color: 'var(--color-text-muted)' }} />
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
                                            handleItemChange(item.id, 'receiptFile', e.target.files[0]);
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
                            <div>
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

                <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-ghost"
                    style={{ width: '100%', marginTop: '1rem', border: '1px dashed var(--color-border)', justifyContent: 'center' }}
                >
                    <Plus size={18} /> 新增一筆費用
                </button>

                <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}>
                        <Save size={18} />
                        儲存草稿
                    </button>
                    <button type="button" onClick={() => handleSubmit('submit')} className="btn btn-primary">
                        <Send size={18} />
                        提交申請
                    </button>
                </div>
            </div>
        </div>
    );
}
