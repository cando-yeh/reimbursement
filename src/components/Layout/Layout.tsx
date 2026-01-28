'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LayoutDashboard, Users } from 'lucide-react';

interface NavItemProps {
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
}

const NavItem = ({ to, icon: Icon, label, badge }: NavItemProps) => {
    const pathname = usePathname();
    const isActive = pathname === to;

    return (
        <Link
            href={to}
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
    const [isProfileOpen, setIsProfileOpen] = React.useState(false);
    const [isEditingName, setIsEditingName] = React.useState(false);
    const [tempName, setTempName] = React.useState('');
    const profileRef = useRef<HTMLDivElement>(null);
    const { currentUser, switchUser, logout, isAuthenticated, availableUsers, claims, vendorRequests, updateUser, isAuthLoading } = useApp();
    const router = useRouter();
    const pathname = usePathname();

    React.useEffect(() => {
        if (!isAuthLoading) {
            if (!isAuthenticated && pathname !== '/login') {
                router.push('/login');
            } else if (isAuthenticated && pathname === '/login') {
                router.push('/');
            }
        }
    }, [isAuthLoading, isAuthenticated, router, pathname]);

    React.useEffect(() => {
        if (currentUser) {
            setTempName(currentUser.name);
        }
    }, [currentUser]);

    // Handle click outside to close profile popover
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    // Don't show layout on login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    if (isAuthLoading || !currentUser) return null;

    const handleSaveName = () => {
        if (tempName.trim()) {
            updateUser(currentUser.id, { name: tempName });
            setIsEditingName(false);
        }
    };

    const hasPermission = (permission: string) => {
        return currentUser.permissions?.includes(permission as any) || false;
    };

    const isFinance = hasPermission('finance_audit') || currentUser.roleName.includes('財務');
    const isManager = hasPermission('user_management') || currentUser.roleName.includes('管理者') || availableUsers.some(u => u.approverId === currentUser.id);

    const pendingEvidenceCount = claims.filter(c => c.applicantId === currentUser.id && c.status === 'pending_evidence').length;
    const returnedCount = claims.filter(c => c.applicantId === currentUser.id && c.status === 'rejected').length;

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

    const pendingPaymentCount = isFinance ? claims.filter(c => c.status === 'approved').length : 0;
    const vendorApprovalsCount = isFinance ? vendorRequests.filter(r => r.status === 'pending').length : 0;

    const myPendingCount = pendingEvidenceCount + returnedCount;
    const reviewPendingCount = claimApprovalsCount + pendingPaymentCount + vendorApprovalsCount;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="brand">請款報銷系統</h1>
                </div>

                <nav className="sidebar-nav">
                    {hasPermission('general') && (
                        <>
                            <NavItem to="/" icon={LayoutDashboard} label="我的請款" badge={myPendingCount} />
                            {(isManager || isFinance) && (
                                <NavItem to="/reviews" icon={LayoutDashboard} label="申請審核" badge={reviewPendingCount} />
                            )}
                            <NavItem to="/vendors" icon={Users} label="廠商列表" />
                        </>
                    )}

                    {hasPermission('user_management') && (
                        <NavItem to="/admin/users" icon={Users} label="使用者管理" />
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div
                        className="user-profile"
                        ref={profileRef}
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
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
                                                className="form-input"
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
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)' }}
                                        onClick={() => {
                                            logout();
                                            setIsProfileOpen(false);
                                        }}
                                    >
                                        登出
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
