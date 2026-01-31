'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { getClaimTypeLabel } from '@/utils/claimDisplay';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '@/components/Common/StatusBadge';
import { Claim } from '@/types';

export default function PaymentDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { payments, claims, currentUser, cancelPayment } = useApp();

    const payment = payments.find(p => p.id === id);
    const isFinance = currentUser?.permissions.includes('finance_audit');

    const handleCancelPayment = () => {
        if (confirm('確定要取消此付款單嗎？關聯的申請單將回到「待付款」狀態。')) {
            cancelPayment(payment!.id);
            router.push('/reviews?tab=payment_records');
        }
    };

    if (!payment) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 className="heading-md">找不到此付款紀錄</h2>
                <Link href="/reviews?tab=payment_records" className="btn btn-primary" style={{ marginTop: '1rem' }}>返回付款紀錄</Link>
            </div>
        );
    }

    const relatedClaims = claims.filter(c => payment.claimIds.includes(c.id));

    return (
        <div className="container">
            <header className="reimburse-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                        <button onClick={() => router.back()} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                            <ArrowLeft size={16} style={{ marginRight: '0.25rem' }} /> 回前頁
                        </button>
                        <div className="detail-title-group">
                            <h1 className="heading-lg">付款單 #{payment.id}</h1>
                        </div>
                        <p className="reimburse-subtitle">付款日期 {payment.paymentDate}</p>
                    </div>
                    {isFinance && (
                        <button className="btn btn-ghost" style={{ color: 'var(--color-danger)', marginTop: '2.5rem' }} onClick={handleCancelPayment}>
                            取消付款
                        </button>
                    )}
                </div>
            </header>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="heading-md" style={{ marginBottom: '1rem' }}>付款摘要</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>付款編號</div>
                        <div style={{ fontWeight: 600 }}>#{payment.id}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>付款對象</div>
                        <div style={{ fontWeight: 600 }}>{payment.payee}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>付款日期</div>
                        <div style={{ fontWeight: 600 }}>{payment.paymentDate}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>付款金額</div>
                        <div style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--color-primary)' }}>${payment.amount.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="heading-md" style={{ marginBottom: '1rem' }}>關聯申請單 ({relatedClaims.length} 筆)</h2>
                <div className="vendor-table-container">
                    <table className="vendor-table">
                        <thead>
                            <tr>
                                <th>申請編號</th>
                                <th>申請日期</th>
                                <th>狀態</th>
                                <th>類型</th>
                                <th>說明</th>
                                <th>金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relatedClaims.length === 0 ? (
                                <tr><td colSpan={6} className="empty-state">無關聯申請單</td></tr>
                            ) : (
                                relatedClaims.map((claim: Claim) => (
                                    <tr
                                        key={claim.id}
                                        onClick={() => router.push(`/claims/${claim.id}`)}
                                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                    >
                                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>#{claim.id.slice(0, 8)}</td>
                                        <td style={{ fontSize: '0.9rem' }}>{claim.date}</td>
                                        <td><StatusBadge status={claim.status} /></td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                                {getClaimTypeLabel(claim.type)}
                                            </span>
                                        </td>
                                        <td>{claim.description}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                                <span>$</span>
                                                <span>{claim.amount.toLocaleString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
