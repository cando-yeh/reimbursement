import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users, FileText, CreditCard } from 'lucide-react';


interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
}

const NavItem = ({ to, icon: Icon, label }: NavItemProps) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={`nav-item ${isActive ? 'active' : ''}`}
        >
            <Icon size={20} />
            <span>{label}</span>
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
    const { userRole, setUserRole } = useApp();

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="brand">請款報銷系統</h1>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-secondary)' }}>
                        角色: {userRole === 'applicant' ? '申請者' : '財務'}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {userRole === 'applicant' && (
                        <>
                            <NavItem to="/" icon={LayoutDashboard} label="申請單總覽" />
                            <NavItem to="/vendors" icon={Users} label="廠商管理" />
                            {/* Applicant cannot see Vendor Approvals */}
                            <NavItem to="/applications/new" icon={FileText} label="新增請款單" />
                        </>
                    )}
                    {userRole === 'finance' && (
                        <>
                            {/* Finance might see Dashboard too, but let's focus on their tasks */}
                            <NavItem to="/" icon={LayoutDashboard} label="所有申請單" />
                            {/* Finance sees Vendor List as Read-Only */}
                            <NavItem to="/vendors" icon={Users} label="廠商清單" />
                            <NavItem to="/vendors/requests" icon={FileText} label="廠商核准" />
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <div className="avatar" style={{ backgroundColor: userRole === 'finance' ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                            {userRole === 'applicant' ? 'JD' : 'FM'}
                        </div>
                        <div>
                            <div className="user-info-name">{userRole === 'applicant' ? '申請人' : '財務經理'}</div>
                            <div className="user-info-role">{userRole === 'applicant' ? '申請者' : '財務部'}</div>
                        </div>

                        {isProfileOpen && (
                            <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
                                <div className="profile-header">
                                    <div className="profile-name">{userRole === 'applicant' ? '申請人' : '財務經理'}</div>
                                    <div className="profile-role">{userRole === 'applicant' ? '工程部' : '財務部'}</div>
                                </div>
                                <div className="profile-detail" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>切換角色 (DEMO)</div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className={`btn ${userRole === 'applicant' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => { setUserRole('applicant'); setIsProfileOpen(false); }}
                                            style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem' }}
                                        >
                                            申請者
                                        </button>
                                        <button
                                            className={`btn ${userRole === 'finance' ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => { setUserRole('finance'); setIsProfileOpen(false); }}
                                            style={{ flex: 1, padding: '0.25rem', fontSize: '0.75rem' }}
                                        >
                                            財務
                                        </button>
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
