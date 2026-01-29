'use client';

import React from 'react';
import { Plus, Trash2, Search, FileX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClaimTable from '@/components/Common/ClaimTable';
import TabButton from '@/components/Common/TabButton'; // Ensure this component handles onClick/Link properly
import PageHeader from '@/components/Common/PageHeader';
import TabContainer from '@/components/Common/TabContainer';
import { Claim, User, Payment } from '@/types';
import { useApp } from '@/context/AppContext';
import ConfirmModal from '@/components/Common/ConfirmModal';

interface DashboardData {
    drafts: Claim[];
    pendingEvidence: Claim[];
    returned: Claim[];
    inReview: Claim[];
    pendingPayment: Claim[];
    closed: Claim[];
}

interface DashboardClientProps {
    activeTab: 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'closed';
    data: DashboardData;
    payments: Payment[];
    availableUsers: User[];
}

export default function DashboardClient({ activeTab, data, payments, availableUsers }: DashboardClientProps) {
    const router = useRouter();
    const { deleteClaim } = useApp();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [idToDelete, setIdToDelete] = React.useState<string | null>(null);

    const filterClaims = (claims: Claim[]) => {
        if (!searchQuery.trim()) return claims;
        const query = searchQuery.toLowerCase();
        return claims.filter(c =>
            c.description.toLowerCase().includes(query) ||
            c.payee.toLowerCase().includes(query) ||
            c.id.toLowerCase().includes(query)
        );
    };

    const handleTabChange = (tab: string) => {
        router.push(`/?tab=${tab}`);
    };

    const handleDeleteDraft = async () => {
        if (idToDelete) {
            await deleteClaim(idToDelete);
            setIdToDelete(null);
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <TabContainer style={{ marginBottom: 0, borderBottom: 'none' }}>
                    <TabButton active={activeTab === 'drafts'} onClick={() => handleTabChange('drafts')} label="草稿" count={data.drafts.length} badge={data.drafts.length} />
                    <TabButton active={activeTab === 'evidence'} onClick={() => handleTabChange('evidence')} label="待補件" count={data.pendingEvidence.length} badge={data.pendingEvidence.length} />
                    <TabButton active={activeTab === 'returned'} onClick={() => handleTabChange('returned')} label="已退回" count={data.returned.length} badge={data.returned.length} />
                    <TabButton active={activeTab === 'in_review'} onClick={() => handleTabChange('in_review')} label="審核中" count={data.inReview.length} />
                    <TabButton active={activeTab === 'pending_payment'} onClick={() => handleTabChange('pending_payment')} label="待付款" count={data.pendingPayment.length} />
                    <TabButton active={activeTab === 'closed'} onClick={() => handleTabChange('closed')} label="已結束" count={data.closed.length} />
                </TabContainer>

                <div style={{ position: 'relative', minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="搜尋說明、對象或編號..."
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-md)' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Areas */}
            {activeTab === 'drafts' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={filterClaims(data.drafts)}
                        emptyMessage={searchQuery ? "找不到相符的草稿" : "目前沒有草稿"}
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
                                        setIdToDelete(claim.id);
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
                        claims={filterClaims(data.pendingEvidence)}
                        emptyMessage={searchQuery ? "找不到相符的待補件項目" : "目前無須補件"}
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'returned' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={filterClaims(data.returned)}
                        emptyMessage={searchQuery ? "找不到相符的退回項目" : "目前無退回項目"}
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'in_review' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={filterClaims(data.inReview)}
                        emptyMessage={searchQuery ? "找不到相符的審核中項目" : "目前無審核中的申請"}
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'pending_payment' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={filterClaims(data.pendingPayment)}
                        emptyMessage={searchQuery ? "找不到相符的待付款項目" : "目前無待付款的申請"}
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'closed' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={filterClaims(data.closed)}
                        emptyMessage={searchQuery ? "找不到相符的已結束項目" : "目前暫無紀錄"}
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {/* Empty State Illustration for Global Search or Initial State */}
            {!searchQuery && Object.values(data).every(arr => arr.length === 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', textAlign: 'center' }}>
                    <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg)', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
                        <FileX size={64} />
                    </div>
                    <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>開始您的第一筆請款</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>您目前沒有任何申請單或草稿紀錄。</p>
                    <Link href="/applications/new" className="btn btn-primary">
                        <Plus size={20} /> 現在就建立申請
                    </Link>
                </div>
            )}

            <ConfirmModal
                isOpen={!!idToDelete}
                title="確定刪除草稿？"
                message="此動作無法復原，該草稿的所有內容將會被永久刪除。"
                type="danger"
                onConfirm={handleDeleteDraft}
                onCancel={() => setIdToDelete(null)}
            />
        </div>
    );
}
