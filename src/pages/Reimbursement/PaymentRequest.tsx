
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { CreditCard, Save, Send, ArrowLeft } from 'lucide-react';


export default function PaymentRequest() {
    const navigate = useNavigate();
    const { vendors, addClaim } = useApp();
    const [formData, setFormData] = useState({
        vendorId: '',
        description: '',
        amount: '' as string | number,
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: ''
    });

    const handleSubmit = (action: 'submit' | 'draft') => {
        const selectedVendor = vendors.find(v => v.id === formData.vendorId);
        const status: Claim['status'] = action === 'submit' ? 'pending' : 'draft';
        const amountNum = Number(formData.amount);

        if (!amountNum || !formData.description || !formData.vendorId) {
            alert('請填寫完整資訊');
            return;
        }

        addClaim({
            description: formData.description, // Main title same as invoice desc for now
            date: formData.date,
            type: 'vendor',
            payee: selectedVendor ? selectedVendor.name : 'Unknown Vendor',
            status: status,
            items: [
                {
                    id: '1',
                    amount: amountNum,
                    date: formData.date,
                    description: formData.description,
                    notes: `發票號碼/說明: ${formData.description}`
                }
            ]
        });
        navigate('/');
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <Link to="/applications/new" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 返回選擇頁面
                </Link>
                <h1 className="heading-lg">廠商付款申請</h1>
                <p className="reimburse-subtitle">申請支付廠商發票款項。</p>
            </header>

            <div className="card">
                <div className="section-header">
                    <h2 className="heading-md">發票明細</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} className="form-grid">

                    <div className="form-group">
                        <label>選擇廠商</label>
                        <select
                            required
                            className="form-input custom-select"
                            value={formData.vendorId}
                            onChange={(e) => {
                                if (e.target.value === 'new') {
                                    navigate('/vendors/add');
                                } else {
                                    setFormData({ ...formData, vendorId: e.target.value });
                                }
                            }}
                        >
                            <option value="">-- 請選擇廠商 --</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                            <option value="new" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>+ 新增廠商</option>
                        </select>
                        {vendors.length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: '0.5rem' }}>
                                無可用廠商，請先新增廠商資料。
                            </div>
                        )}
                    </div>

                    <div className="two-col-grid">
                        <div className="form-group">
                            <label>發票金額</label>
                            <div className="currency-wrapper">
                                <span className="currency-symbol">$</span>
                                <input
                                    type="number"
                                    step="1"
                                    required
                                    className="form-input amount-input"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || '' })}
                                    onKeyDown={(e) => {
                                        if (e.key === '.' || e.key === 'e') e.preventDefault();
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>付款期限</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>說明 / 發票號碼</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="例如：發票 #INV-2023-001 - 月費"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}>
                            <Save size={18} />
                            儲存草稿
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Send size={18} />
                            提交申請
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

