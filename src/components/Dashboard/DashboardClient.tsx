'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClaimTable from '@/components/Common/ClaimTable';
import TabButton from '@/components/Common/TabButton'; // Ensure this component handles onClick/Link properly
import PageHeader from '@/components/Common/PageHeader';
import TabContainer from '@/components/Common/TabContainer';
import { Claim, User, Payment } from '@/types';
import { deleteClaim } from '@/app/actions/claims';

interface DashboardData {
    drafts: Claim[];
    pendingEvidence: Claim[];
    returned: Claim[];
    inReview: Claim[];
    pendingPayment: Claim[];
    completed: Claim[];
}

interface DashboardClientProps {
    activeTab: 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'completed';
    data: DashboardData;
    payments: Payment[];
    availableUsers: User[];
}

export default function DashboardClient({ activeTab, data, payments, availableUsers }: DashboardClientProps) {
    const router = useRouter();

    const handleTabChange = (tab: string) => {
        router.push(`/?tab=${tab}`);
    };

    const handleDeleteDraft = async (id: string) => {
        if (confirm('確定要刪除此草稿嗎？')) {
            await deleteClaim(id);
        }
    };

    const headerAction = (
        <Link href="/applications/new" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
            <Plus size={20} style={{ marginRight: '4px' }} />
            新增申請單
        </Link>
    );

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <PageHeader
                title="我的請款"
                subtitle="管理您的申請單、待傳檔案與審核狀態"
                action={headerAction}
            />

            <TabContainer>
                <TabButton active={activeTab === 'drafts'} onClick={() => handleTabChange('drafts')} label="草稿" count={data.drafts.length} />
                <TabButton active={activeTab === 'evidence'} onClick={() => handleTabChange('evidence')} label="待補件" count={data.pendingEvidence.length} badge={data.pendingEvidence.length} />
                <TabButton active={activeTab === 'returned'} onClick={() => handleTabChange('returned')} label="已退回" count={data.returned.length} badge={data.returned.length} />
                <TabButton active={activeTab === 'in_review'} onClick={() => handleTabChange('in_review')} label="審核中" count={data.inReview.length} />
                <TabButton active={activeTab === 'pending_payment'} onClick={() => handleTabChange('pending_payment')} label="待付款" count={data.pendingPayment.length} />
                <TabButton active={activeTab === 'completed'} onClick={() => handleTabChange('completed')} label="已完成" count={data.completed.length} />
            </TabContainer>

            {/* Content Areas */}
            {activeTab === 'drafts' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.drafts}
                        emptyMessage="無草稿"
                        onRowClick={(claim: Claim) => {
                            if (claim.type === 'service') router.push(`/applications/service/${claim.id}`);
                            else if (claim.type === 'payment') router.push(`/payment-request/${claim.id}`);
                            else router.push(`/reimburse/${claim.id}`);
                        }}
                        renderActions={(claim: Claim) => (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDraft(claim.id);
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'evidence' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.pendingEvidence}
                        emptyMessage="無待補件項目"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'returned' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.returned}
                        emptyMessage="無已退回項目"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'in_review' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.inReview}
                        emptyMessage="無審核中項目"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'pending_payment' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.pendingPayment}
                        emptyMessage="無待付款項目"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'completed' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={data.completed}
                        emptyMessage="無已完成項目"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}
        </div>
    );
}
