import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/Common/StatusBadge';
import { ArrowLeft, CheckCircle, CreditCard, Send, Trash2, AlertCircle } from 'lucide-react';


export default function ApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { claims, updateClaimStatus, deleteClaim } = useApp();

    const claim = claims.find(c => c.id === id);

    if (!claim) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 className="heading-md">Application Not Found</h2>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
            </div>
        );
    }

    const handleStatusChange = (newStatus) => {
        updateClaimStatus(id, newStatus);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this application?')) {
            deleteClaim(id);
            navigate('/');
        }
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <Link to="/" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div className="detail-actions">
                    <div>
                        <div className="detail-title-group">
                            <h1 className="heading-lg">Application #{claim.id}</h1>
                            <StatusBadge status={claim.status} />
                        </div>
                        <p className="reimburse-subtitle">Created on {claim.date}</p>
                    </div>

                    {/* Action Buttons based on Status */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {claim.status === 'draft' && (
                            <>
                                <button onClick={handleDelete} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger-bg)', backgroundColor: 'var(--color-danger-bg)' }}>
                                    <Trash2 size={18} /> Delete
                                </button>
                                <button onClick={() => handleStatusChange('pending')} className="btn btn-primary">
                                    <Send size={18} /> Submit
                                </button>
                            </>
                        )}

                        {claim.status === 'pending' && (
                            <>
                                <button onClick={() => handleStatusChange('draft')} className="btn btn-ghost">
                                    Return to Draft
                                </button>
                                <button onClick={() => handleStatusChange('approved')} className="btn" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                                    <CheckCircle size={18} /> Approve
                                </button>
                            </>
                        )}

                        {claim.status === 'approved' && (
                            <button onClick={() => handleStatusChange('paid')} className="btn" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                                <CreditCard size={18} /> Mark as Paid
                            </button>
                        )}

                        {claim.status === 'paid' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: '600' }}>
                                <CheckCircle size={20} /> Payment Completed
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="card">
                <div className="detail-meta-grid">
                    <div>
                        <label className="form-group label">
                            Request Type
                        </label>
                        <div className="meta-value-caps">
                            {claim.type === 'employee' ? 'Employee Reimbursement' : 'Vendor Payment'}
                        </div>
                    </div>

                    <div>
                        <label className="form-group label">
                            Payee
                        </label>
                        <div className="meta-value">
                            {claim.payee}
                        </div>
                    </div>

                    <div>
                        <label className="form-group label">
                            Amount
                        </label>
                        <div className="meta-value-lg">
                            ${claim.amount.toLocaleString()}
                        </div>
                    </div>

                    <div>
                        <label className="form-group label">
                            Date
                        </label>
                        <div className="meta-value">
                            {claim.date}
                        </div>
                    </div>
                </div>

                <div className="description-section">
                    <label className="form-group label">
                        Description / Details
                    </label>
                    <p className="description-text">
                        {claim.description}
                    </p>
                    {claim.notes && (
                        <div className="notes-box">
                            <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Notes: </span>
                            <span style={{ fontSize: '0.875rem' }}>{claim.notes}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
