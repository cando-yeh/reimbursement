import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/Common/StatusBadge';
import { DollarSign, Clock, CheckCircle } from 'lucide-react';


interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    isActive: boolean;
    onClick: () => void;
}

const StatCard = ({ title, value, icon: Icon, color, isActive, onClick }: StatCardProps) => (
    <div
        className={`card stat-card ${isActive ? 'active-filter' : ''}`}
        onClick={onClick}
        style={{ cursor: 'pointer', border: isActive ? `2px solid var(--color-${color})` : '1px solid transparent' }}
    >
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
    const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'paid' | null>(null);

    const pendingTotal = claims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const approvedTotal = claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0);
    const paidTotal = claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);

    const handleFilterClick = (status: 'pending' | 'approved' | 'paid') => {
        setActiveFilter(prev => prev === status ? null : status);
    };

    const filteredClaims = activeFilter
        ? claims.filter(c => c.status === activeFilter)
        : claims;

    return (
        <div>
            <header className="dashboard-header">
                <h1 className="heading-lg">儀表板</h1>
                <p className="dashboard-subtitle">您的請款申請總覽。</p>
            </header>

            <div className="stats-grid">
                <StatCard
                    title="待審核"
                    value={pendingTotal}
                    icon={Clock}
                    color="warning"
                    isActive={activeFilter === 'pending'}
                    onClick={() => handleFilterClick('pending')}
                />
                <StatCard
                    title="已核准 (未付款)"
                    value={approvedTotal}
                    icon={CheckCircle}
                    color="success"
                    isActive={activeFilter === 'approved'}
                    onClick={() => handleFilterClick('approved')}
                />
                <StatCard
                    title="已付款"
                    value={paidTotal}
                    icon={DollarSign}
                    color="primary"
                    isActive={activeFilter === 'paid'}
                    onClick={() => handleFilterClick('paid')}
                />
            </div>

            <section className="recent-activity-section">
                <h2 className="heading-md">
                    {activeFilter ? `${activeFilter === 'pending' ? '待審核' : activeFilter === 'approved' ? '已核准' : '已付款'}申請` : '近期活動'}
                </h2>
                <div className="card activity-table-container">
                    <table className="activity-table">
                        <thead>
                            <tr>
                                <th>申請單號</th>
                                <th>說明</th>
                                <th>受款人</th>
                                <th>申請日期</th>
                                <th>付款日期</th>
                                <th>金額</th>
                                <th>狀態</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClaims.map((claim) => (
                                <tr
                                    key={claim.id}
                                    onClick={() => navigate(`/claims/${claim.id}`)}
                                >
                                    <td className="td-secondary">{claim.id}</td>
                                    <td className="td-description">{claim.description}</td>
                                    <td className="td-secondary">{claim.payee}</td>
                                    <td className="td-secondary">{claim.date}</td>
                                    <td className="td-secondary">{claim.datePaid || '-'}</td>
                                    <td className="td-amount">
                                        <span>$</span>
                                        <span>{claim.amount.toLocaleString()}</span>
                                    </td>
                                    <td><StatusBadge status={claim.status} /></td>
                                </tr>
                            ))}
                            {filteredClaims.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                        此類別無申請單。
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
