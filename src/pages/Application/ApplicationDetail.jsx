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
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link to="/" className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                            <h1 className="heading-lg">Application #{claim.id}</h1>
                            <StatusBadge status={claim.status} />
                        </div>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Created on {claim.date}</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Request Type
                        </label>
                        <div style={{ fontSize: '1.125rem', fontWeight: '500', textTransform: 'capitalize' }}>
                            {claim.type === 'employee' ? 'Employee Reimbursement' : 'Vendor Payment'}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Payee
                        </label>
                        <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>
                            {claim.payee}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Amount
                        </label>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)' }}>
                            ${claim.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                            Date
                        </label>
                        <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>
                            {claim.date}
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                    <label style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                        Description / Details
                    </label>
                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-main)' }}>
                        {claim.description}
                    </p>
                    {claim.notes && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Notes: </span>
                            <span style={{ fontSize: '0.875rem' }}>{claim.notes}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
