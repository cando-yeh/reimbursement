import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/Common/StatusBadge';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            padding: '1rem',
            borderRadius: '50%',
            backgroundColor: `var(--color-${color}-bg)`,
            color: `var(--color-${color})`
        }}>
            <Icon size={24} />
        </div>
        <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>${value.toLocaleString()}</div>
        </div>
    </div>
);

export default function Dashboard() {
    const navigate = useNavigate();
    const { claims } = useApp();

    const pendingTotal = claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const approvedTotal = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);
    const paidTotal = claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

    return (
        <div>
            <header style={{ marginBottom: '2rem' }}>
                <h1 className="heading-lg">Dashboard</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Overview of your financial requests.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard title="Pending Requests" value={pendingTotal} icon={Clock} color="warning" />
                <StatCard title="Approved (Unpaid)" value={approvedTotal} icon={CheckCircle} color="success" />
                <StatCard title="Total Paid" value={paidTotal} icon={DollarSign} color="primary" />
            </div>

            <section>
                <h2 className="heading-md" style={{ marginBottom: '1rem' }}>Recent Activity</h2>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Request</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Payee</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map((claim, idx) => (
                                <tr
                                    key={claim.id}
                                    onClick={() => navigate(`/claims/${claim.id}`)}
                                    style={{
                                        borderBottom: idx !== claims.length - 1 ? '1px solid var(--color-border)' : 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.1s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{claim.description}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{claim.payee}</td>
                                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>{claim.date}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>${claim.amount.toLocaleString()}</td>
                                    <td style={{ padding: '1rem' }}><StatusBadge status={claim.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
