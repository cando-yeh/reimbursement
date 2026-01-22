import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Save, Send, ArrowLeft, Plus, Trash2, Upload, Image, FileText } from 'lucide-react';

interface ExpenseItemWithAttachment {
    id: string;
    date: string;
    amount: number;
    description: string;
    noReceipt: boolean;
    receiptFile: File | null;
}

export default function EmployeeReimbursement() {
    const navigate = useNavigate();
    const { addClaim } = useApp();

    const [description, setDescription] = useState('');
    const [items, setItems] = useState<ExpenseItemWithAttachment[]>([
        { id: '1', amount: 0, date: new Date().toISOString().split('T')[0], description: '', noReceipt: false, receiptFile: null }
    ]);

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
            { id: Date.now().toString(), amount: 0, date: new Date().toISOString().split('T')[0], description: '', noReceipt: false, receiptFile: null }
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
        const status: Claim['status'] = action === 'submit' ? 'pending' : 'draft';

        const validItems = items.filter(i => i.amount > 0 && i.description.trim() !== '');

        if (validItems.length === 0) {
            alert('請至少新增一筆有效的費用明細（需填寫金額與說明）。');
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

        addClaim({
            description: description || '個人報銷申請',
            date: new Date().toISOString().split('T')[0],
            type: 'employee',
            payee: 'John Doe (Me)',
            status: status,
            items: validItems.map(item => ({
                id: item.id,
                date: item.date,
                amount: item.amount,
                description: item.description,
                notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || '')
            }))
        });
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

                {/* Description Field */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>申請說明 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="例如：10月份差旅費報銷"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                {/* Items List Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 120px 140px 80px 40px',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: '8px 8px 0 0',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    color: 'var(--color-text-secondary)'
                }}>
                    <div>日期</div>
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
                                gridTemplateColumns: '100px 1fr 120px 140px 80px 40px',
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
                            <input
                                type="text"
                                className="form-input"
                                style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                                placeholder="費用說明"
                                value={item.description}
                                onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '0.25rem', color: 'var(--color-text-secondary)' }}>$</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ padding: '0.4rem', fontSize: '0.85rem', width: '100%' }}
                                    value={item.amount || ''}
                                    onChange={e => handleItemChange(item.id, 'amount', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                {item.noReceipt ? (
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>-</span>
                                ) : item.receiptFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Image size={14} style={{ color: 'var(--color-success)' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                                            {item.receiptFile.name}
                                        </span>
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
