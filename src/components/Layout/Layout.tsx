'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSidebarBadgeCounts } from '@/app/actions/claims';
import { ClipboardList, ShieldCheck, Building2, Users, Edit2 } from 'lucide-react';

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
                <span className="nav-badge" style={{
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
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
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
    const { currentUser, logout, isAuthenticated, availableUsers, updateUser, isAuthLoading } = useAuth();
    const [badgeCounts, setBadgeCounts] = useState({ myClaimsBadge: 0, reviewBadge: 0 });
    const router = useRouter();
    const pathname = usePathname();

    // Helper functions (safe to call with null currentUser)
    const hasPermission = (permission: string) => {
        return currentUser?.permissions?.includes(permission as any) || false;
    };
    const isFinance = hasPermission('finance_audit') || (currentUser?.roleName?.includes('財務') ?? false);
    const isManager = hasPermission('user_management') || (currentUser?.roleName?.includes('管理者') ?? false) || availableUsers.some(u => u.approverId === currentUser?.id);

    // Authenticated state is handled by server-side layout redirect
    // and specific login page redirect logic to avoid flickering and loops.

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

    // Fetch badge counts from server (cached) - MUST be before conditional returns
    useEffect(() => {
        if (!currentUser) return;
        getSidebarBadgeCounts({
            userId: currentUser.id,
            isFinance,
            isManager,
        }).then(result => {
            if (result.success && result.data) {
                setBadgeCounts({
                    myClaimsBadge: result.data.myClaimsBadge,
                    reviewBadge: result.data.reviewBadge,
                });
            }
        });
    }, [currentUser?.id, isFinance, isManager]);

    // Don't show layout on login page
    if (pathname === '/login') {
        return <>{children}</>;
    }

    // If we are at this point, we are not on the login page.
    // We wait for initial auth loading to complete.
    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // After loading, if we still don't have a user, it means the server-side redirect 
    // hasn't kicked in or we are in a transition. We guard against null here.
    if (!currentUser) {
        return null;
    }

    const handleSaveName = () => {
        if (tempName.trim()) {
            updateUser(currentUser.id, { name: tempName });
            setIsEditingName(false);
        }
    };

    const myClaimsBadgeCount = badgeCounts.myClaimsBadge;
    const reviewBadgeCount = badgeCounts.reviewBadge;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="brand">
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, var(--color-primary), #a855f7)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        請款系統
                    </h1>
                </div>

                <nav className="sidebar-nav">
                    {hasPermission('general') && (
                        <>
                            <NavItem to="/" icon={ClipboardList} label="我的請款" badge={myClaimsBadgeCount} />
                            {(isManager || isFinance) && (
                                <NavItem to="/reviews" icon={ShieldCheck} label="申請審核" badge={reviewBadgeCount} />
                            )}
                            <NavItem to="/vendors" icon={Building2} label="廠商列表" />
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
                        <div className="avatar">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div>
                            <div className="user-info-name">{currentUser.name}</div>
                            <div className="user-info-role">{currentUser.roleName}</div>
                        </div>

                        {isProfileOpen && (
                            <div className="profile-popup" onClick={(e) => e.stopPropagation()} style={{ width: '280px' }}>
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
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="profile-name" style={{ fontWeight: 'bold' }}>{currentUser.name}</div>
                                                <div className="profile-role">{currentUser.email}</div>
                                                {availableUsers.find(u => u.id === currentUser.approverId) && (
                                                    <div className="profile-role" style={{ marginTop: '0.25rem', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                                                        請款核准人: {availableUsers.find(u => u.id === currentUser.approverId)?.name}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '0.25rem', height: 'auto', marginLeft: '0.5rem' }}
                                                onClick={() => setIsEditingName(true)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)', padding: '0.5rem' }}
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
