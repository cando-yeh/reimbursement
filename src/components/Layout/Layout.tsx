import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users, FileText, Check } from 'lucide-react';


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
    const { currentUser, switchUser, availableUsers } = useApp();

    const hasPermission = (permission: string) => {
        return currentUser.permissions.includes(permission as any);
    };

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
                            <NavItem to="/" icon={LayoutDashboard} label="申請單總覽" />
                            <NavItem to="/vendors" icon={Users} label="廠商管理" />
                            <NavItem to="/applications/new" icon={FileText} label="新增請款單" />
                        </>
                    )}
                    {hasPermission('finance_audit') && (
                        <>
                            <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
                                財務審核
                            </div>
                        </>
                    )}

                    {/* Show Pending Items for everyone with general access (Action Center) */}
                    {hasPermission('general') && (
                        <NavItem to="/approvals" icon={Check} label="待處理項目" />
                    )}
                    {hasPermission('user_management') && (
                        <>
                            <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
                                系統管理
                            </div>
                            <NavItem to="/admin/users" icon={Users} label="使用者管理" />
                        </>
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
                                    <div className="profile-name">{currentUser.name}</div>
                                    <div className="profile-role">{currentUser.email}</div>
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
