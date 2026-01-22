import { Link } from 'react-router-dom';
import { User, Building, Briefcase } from 'lucide-react';

export default function ApplicationTypeSelect() {
    return (
        <div>
            <header className="reimburse-header">
                <h1 className="heading-lg">新增請款單</h1>
                <p className="reimburse-subtitle">請選擇您要申請的類型。</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                {/* Personal Reimbursement */}
                <Link to="/reimburse" className="card application-card" style={{ textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer', display: 'block', border: '1px solid var(--color-border)' }}>
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary-bg, #eff6ff)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <User size={32} />
                        </div>
                        <h3 className="heading-md" style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>個人報銷</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            適用於差旅、餐費及其他代墊款項。
                        </p>
                    </div>
                </Link>

                {/* Vendor Payment */}
                <Link to="/payment-request" className="card application-card" style={{ textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer', display: 'block', border: '1px solid var(--color-border)' }}>
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-success-bg, #ecfdf5)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <Building size={32} />
                        </div>
                        <h3 className="heading-md" style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>廠商付款</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            支付已註冊廠商的發票款項。
                        </p>
                    </div>
                </Link>

                {/* Personal Service Payment */}
                <Link to="/applications/service" className="card application-card" style={{ textDecoration: 'none', transition: 'transform 0.2s', cursor: 'pointer', display: 'block', border: '1px solid var(--color-border)' }}>
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-warning-bg, #fffbeb)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                            <Briefcase size={32} />
                        </div>
                        <h3 className="heading-md" style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>支付個人勞務</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            支付專業服務或勞務報酬費用。
                        </p>
                    </div>
                </Link>

            </div>
        </div>
    );
}
