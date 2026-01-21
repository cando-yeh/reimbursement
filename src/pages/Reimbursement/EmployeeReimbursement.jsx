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
        <div className="reimburse-container">
            <header className="reimburse-header">
                <h1 className="heading-lg">Employee Reimbursement</h1>
                <p className="reimburse-subtitle">Submit an expense for reimbursement.</p>
            </header>

            <div className="card">
                <div className="section-header">
                    <h2 className="heading-md">Expense Details</h2>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} className="form-grid">

                    <div className="two-col-grid">
                        <div className="form-group">
                            <label>Amount</label>
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
                            <label>Date Incurred</label>
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
                        <label>Description</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            placeholder="e.g. Flight to New York for Conference"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Additional Notes</label>
                        <textarea
                            rows="3"
                            className="form-input textarea-input"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
