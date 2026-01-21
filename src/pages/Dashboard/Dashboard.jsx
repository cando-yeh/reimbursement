import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/Common/StatusBadge';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';


const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card stat-card">
        <div
            className="stat-icon-wrapper"
            style={{
                backgroundColor: `var(--color-${color}-bg)`,
                color: `var(--color-${color})`
            }}
        >
            <Icon size={24} />
        </div>
        <div>
            <div className="stat-content-label">{title}</div>
            <div className="stat-content-value">${value.toLocaleString()}</div>
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
            <header className="dashboard-header">
                <h1 className="heading-lg">Dashboard</h1>
                <p className="dashboard-subtitle">Overview of your financial requests.</p>
            </header>

            <div className="stats-grid">
                <StatCard title="Pending Requests" value={pendingTotal} icon={Clock} color="warning" />
                <StatCard title="Approved (Unpaid)" value={approvedTotal} icon={CheckCircle} color="success" />
                <StatCard title="Total Paid" value={paidTotal} icon={DollarSign} color="primary" />
            </div>

            <section className="recent-activity-section">
                <h2 className="heading-md">Recent Activity</h2>
                <div className="card activity-table-container">
                    <table className="activity-table">
                        <thead>
                            <tr>
                                <th>Request</th>
                                <th>Payee</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.map((claim) => (
                                <tr
                                    key={claim.id}
                                    onClick={() => navigate(`/claims/${claim.id}`)}
                                >
                                    <td className="td-description">{claim.description}</td>
                                    <td className="td-secondary">{claim.payee}</td>
                                    <td className="td-secondary">{claim.date}</td>
                                    <td className="td-amount">${claim.amount.toLocaleString()}</td>
                                    <td><StatusBadge status={claim.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
