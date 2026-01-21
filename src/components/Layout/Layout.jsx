import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CreditCard } from 'lucide-react';


const NavItem = ({ to, icon: Icon, label }) => {
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

export default function Layout({ children }) {

    // Wait, I can't destructure useLocation like that. I need to declare state inside the component.
    // Converting to proper implementation below.
    // Using a trick in replace_file_content to rewrite the whole component body is safer.

    return (
        <LayoutWithState>{children}</LayoutWithState>
    );
}

function LayoutWithState({ children }) {
    const [isProfileOpen, setIsProfileOpen] = React.useState(false); // Using React.useState to avoid importing if not already

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="brand">FinFlow</h1>
                </div>

                <nav className="sidebar-nav">
                    <NavItem to="/" icon={LayoutDashboard} label="申請單總覽" />
                    <NavItem to="/vendors" icon={Users} label="廠商管理" />
                    <NavItem to="/reimburse" icon={FileText} label="報銷申請" />
                    <NavItem to="/payment-request" icon={CreditCard} label="請款申請" />
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                        <div className="avatar">
                            JD
                        </div>
                        <div>
                            <div className="user-info-name">John Doe</div>
                            <div className="user-info-role">Employee</div>
                        </div>

                        {isProfileOpen && (
                            <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
                                <div className="profile-header">
                                    <div className="profile-name">John Doe</div>
                                    <div className="profile-role">Senior Developer</div>
                                </div>
                                <div className="profile-detail"><strong>ID:</strong> EMP-2024-001</div>
                                <div className="profile-detail"><strong>Email:</strong> john.doe@company.com</div>
                                <div className="profile-detail"><strong>Department:</strong> Engineering</div>
                                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                    <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)' }}>
                                        Sign Out
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
