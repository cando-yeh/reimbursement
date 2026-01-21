import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, CreditCard } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.25rem',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'var(--color-background)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s',
            }}
        >
            <Icon size={20} />
            <span>{label}</span>
        </Link>
    );
};

export default function Layout({ children }) {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            {/* Sidebar */}
            <aside style={{
                width: 'var(--sidebar-width)',
                backgroundColor: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 10
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>FinFlow</h1>
                </div>

                <nav style={{ padding: '1.5rem 1rem', flex: 1 }}>
                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <NavItem to="/vendors" icon={Users} label="Vendor Management" />
                    <NavItem to="/reimburse" icon={FileText} label="My Reimbursement" />
                    <NavItem to="/payment-request" icon={CreditCard} label="Payment Requests" />
                </nav>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'
                        }}>
                            JD
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>John Doe</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Employee</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: 'var(--sidebar-width)',
                padding: '2rem',
                maxWidth: '100%'
            }}>
                {children}
            </main>
        </div>
    );
}
