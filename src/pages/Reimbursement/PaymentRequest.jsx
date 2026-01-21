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
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 className="heading-lg">Payment Request</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Request payment for a vendor invoice.</p>
            </header>

            <div className="card">
                <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                    <h2 className="heading-md">Invoice Details</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} style={{ display: 'grid', gap: '1.5rem' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Select Vendor</label>
                        <select
                            required
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '1rem', backgroundColor: 'white'
                            }}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Invoice Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="input"
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2rem',
                                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                        fontSize: '1rem', fontWeight: '600'
                                    }}
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Due Date</label>
                            <input
                                type="date"
                                required
                                className="input"
                                style={{
                                    width: '100%', padding: '0.75rem 1rem',
                                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                    fontSize: '1rem'
                                }}
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Description / Invoice #</label>
                        <input
                            type="text"
                            required
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '1rem'
                            }}
                            placeholder="e.g. Invoice #INV-2023-001 - Monthly Service"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
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
