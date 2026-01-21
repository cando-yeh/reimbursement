
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CreditCard, Save, Send } from 'lucide-react';


export default function PaymentRequest() {
    const navigate = useNavigate();
    const { vendors, addClaim } = useApp();
    const [formData, setFormData] = useState({
        vendorId: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: ''
    });

    const handleSubmit = (action) => {
        const selectedVendor = vendors.find(v => v.id === formData.vendorId);

        const claim = {
            ...formData,
            amount: parseFloat(formData.amount),
            type: 'vendor',
            payee: selectedVendor ? selectedVendor.name : 'Unknown Vendor',
            status: action === 'submit' ? 'pending' : 'draft'
        };
        addClaim(claim);
        navigate('/');
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <h1 className="heading-lg">Payment Request</h1>
                <p className="reimburse-subtitle">Request payment for a vendor invoice.</p>
            </header>

            <div className="card">
                <div className="section-header">
                    <h2 className="heading-md">Invoice Details</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} className="form-grid">

                    <div className="form-group">
                        <label>Select Vendor</label>
                        <select
                            required
                            className="form-input custom-select"
                            value={formData.vendorId}
                            onChange={e => setFormData({ ...formData, vendorId: e.target.value })}
                        >
                            <option value="">-- Choose Vendor --</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                        {vendors.length === 0 && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: '0.5rem' }}>
                                No vendors available. Please add a vendor first.
                            </div>
                        )}
                    </div>

                    <div className="two-col-grid">
                        <div className="form-group">
                            <label>Invoice Amount</label>
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
                            <label>Due Date</label>
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
                        <label>Description / Invoice #</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. Invoice #INV-2023-001 - Monthly Service"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)' }}>
                            <Save size={18} />
                            Save as Draft
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Send size={18} />
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

