import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { FileText, Save, Send } from 'lucide-react';

export default function EmployeeReimbursement() {
    const navigate = useNavigate();
    const { addClaim } = useApp();
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleSubmit = (action) => {
        // In a real app, action could determine if it saves as draft or submits immediately.
        // Here we just save what we have.
        const claim = {
            ...formData,
            amount: parseFloat(formData.amount),
            type: 'employee',
            payee: 'John Doe (Me)', // Creating for self
            status: action === 'submit' ? 'pending' : 'draft'
        };
        addClaim(claim);
        navigate('/');
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 className="heading-lg">Employee Reimbursement</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Submit an expense for reimbursement.</p>
            </header>

            <div className="card">
                <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                    <h2 className="heading-md">Expense Details</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} style={{ display: 'grid', gap: '1.5rem' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Amount</label>
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
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Date Incurred</label>
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
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Description</label>
                        <input
                            type="text"
                            required
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '1rem'
                            }}
                            placeholder="e.g. Flight to New York for Conference"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Additional Notes</label>
                        <textarea
                            rows="3"
                            className="input"
                            style={{
                                width: '100%', padding: '0.75rem 1rem',
                                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical'
                            }}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
