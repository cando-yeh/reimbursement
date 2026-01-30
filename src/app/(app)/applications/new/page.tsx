import Link from 'next/link';
import { FileText, Truck, CreditCard, ArrowLeft } from 'lucide-react';

export default function NewApplicationPage() {
  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> 返回首頁
        </Link>
        <h1 className="heading-lg">新增申請</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>請選擇您要申請的類別</p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <Link href="/reimburse/new" className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: 'hsl(var(--primary-hue), 90%, 95%)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={32} />
          </div>
          <div>
            <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>員工報銷</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>適用於交通費、差旅費、交際費等代墊款項申請。</p>
          </div>
        </Link>

        <Link href="/payment-request/new" className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: 'hsl(142, 70%, 95%)', color: 'hsl(142, 70%, 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={32} />
          </div>
          <div>
            <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>廠商請款</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>適用於支付廠商貨款、服務費等直接匯款給廠商。</p>
          </div>
        </Link>

        {/* Temporary link for testing service app since we ported it */}
        <Link href="/applications/service" className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: 'hsl(30, 90%, 95%)', color: 'hsl(30, 90%, 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={32} />
          </div>
          <div>
            <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>個人勞務</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>支付專業服務或勞務報酬費用。</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
