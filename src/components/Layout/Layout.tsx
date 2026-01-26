import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users } from 'lucide-react';


interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
}

const NavItem = ({ to, icon: Icon, label, badge }: NavItemProps) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ position: 'relative' }}
        >
            <Icon size={20} />
            <span>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'var(--color-danger)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center'
                }}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    );
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <LayoutWithState>{children}</LayoutWithState>
    );
}

function LayoutWithState({ children }: { children: React.ReactNode }) {
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    const { currentUser, switchUser, availableUsers, claims, vendorRequests, updateUser } = useApp();

    React.useEffect(() => {
        setTempName(currentUser.name);
    }, [currentUser]);

    const handleSaveName = () => {
        if (tempName.trim()) {
            updateUser(currentUser.id, { name: tempName });
            setIsEditingName(false);
        }
    };

    const hasPermission = (permission: string) => {
        return currentUser.permissions.includes(permission as any);
    };

    // Calculate pending items count
    const isFinance = currentUser.permissions.includes('finance_audit');
    const isManager = availableUsers.some(u => u.approverId === currentUser.id);

    // 待補憑證 (自己的)
    const pendingEvidenceCount = claims.filter(c => c.applicantId === currentUser.id && c.status === 'pending_evidence').length;

    // 已退回 (自己的)
    const returnedCount = claims.filter(c => c.applicantId === currentUser.id && c.status === 'rejected').length;

    // 請款審核 (審核者可見)
    const claimApprovalsCount = claims.filter(c => {
        if (c.status === 'pending_approval' && isManager) {
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant?.approverId === currentUser.id) return true;
        }
        if (isFinance && (c.status === 'pending_finance' || c.status === 'pending_finance_review')) {
            return true;
        }
        return false;
    }).length;

    // 待付款 (財務可見)
    const pendingPaymentCount = isFinance ? claims.filter(c => c.status === 'approved').length : 0;

    // 廠商異動審核 (財務可見)
    const vendorApprovalsCount = isFinance ? vendorRequests.filter(r => r.status === 'pending').length : 0;

    // Total pending count
    const totalPendingCount = pendingEvidenceCount + returnedCount + claimApprovalsCount + pendingPaymentCount + vendorApprovalsCount;

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="brand">請款報銷系統</h1>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
                        角色: {currentUser.roleName}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {hasPermission('general') && (
                        <>
                            <NavItem to="/" icon={LayoutDashboard} label="申請單管理" badge={totalPendingCount} />
                            <NavItem to="/vendors" icon={Users} label="廠商列表" />
                        </>
                    )}

                    {hasPermission('user_management') && (
                        <NavItem to="/admin/users" icon={Users} label="使用者管理" />
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <div className="avatar" style={{ backgroundColor: 'var(--color-primary)' }}>
                            {currentUser.name.charAt(0)}
                        </div>
                        <div>
                            <div className="user-info-name">{currentUser.name}</div>
                            <div className="user-info-role">{currentUser.roleName}</div>
                        </div>

                        {isProfileOpen && (
                            <div className="profile-popup" onClick={(e) => e.stopPropagation()} style={{ width: '300px' }}>
                                <div className="profile-header">
                                    {isEditingName ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="input-field"
                                                value={tempName}
                                                onChange={(e) => setTempName(e.target.value)}
                                                autoFocus
                                                style={{ fontSize: '0.9rem', padding: '0.4rem' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={handleSaveName}>儲存</button>
                                                <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setIsEditingName(false); setTempName(currentUser.name); }}>取消</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                                            <div>
                                                <div className="profile-name">{currentUser.name}</div>
                                                <div className="profile-role">{currentUser.email}</div>
                                            </div>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto' }}
                                                onClick={() => setIsEditingName(true)}
                                            >
                                                編輯名稱
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="profile-detail" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>切換使用者 (DEMO)</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        {availableUsers.map(user => (
                                            <button
                                                key={user.id}
                                                className={`btn ${currentUser.id === user.id ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => { switchUser(user.id); setIsProfileOpen(false); }}
                                                style={{ justifyContent: 'flex-start', padding: '0.5rem', fontSize: '0.8rem', width: '100%' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#333' }}>
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                                        <div>{user.name}</div>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{user.roleName}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)' }}>
                                        登出
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
