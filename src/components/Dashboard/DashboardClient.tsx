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
import ConfirmModal from '@/components/Common/ConfirmModal';
import Pagination from '@/components/Common/Pagination';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';
import { deleteClaim as deleteClaimAction } from '@/app/actions/claims';

interface DashboardClientProps {
    activeTab: 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'closed';
    data: Claim[];
    pagination: any;
    counts: any;
    payments: Payment[];
    availableUsers: User[];
    isLoading?: boolean;
}

export default function DashboardClient({ activeTab, data, pagination, counts, payments, availableUsers, isLoading }: DashboardClientProps) {
    const router = useRouter();
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
        router.push(`/?tab=${tab}&page=1`);
    };

    const handlePageChange = (page: number) => {
        router.push(`/?tab=${activeTab}&page=${page}`);
    };

    const handleDeleteDraft = async () => {
        if (idToDelete) {
            const result = await deleteClaimAction(idToDelete);
            if (result?.success) {
                router.refresh();
            } else {
                alert('刪除失敗，請稍後再試');
            }
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
        <div className="container">
            <PageHeader
                title="我的請款"
                subtitle="管理您的申請單、待傳檔案與審核狀態"
                action={headerAction}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1.5rem', flexWrap: 'nowrap' }}>
                <TabContainer style={{ marginBottom: 0, borderBottom: 'none', flexShrink: 0 }}>
                    <TabButton active={activeTab === 'drafts'} onClick={() => handleTabChange('drafts')} label="草稿" count={counts?.drafts} badge={counts?.drafts} />
                    <TabButton active={activeTab === 'evidence'} onClick={() => handleTabChange('evidence')} label="待補件" count={counts?.evidence} badge={counts?.evidence} />
                    <TabButton active={activeTab === 'returned'} onClick={() => handleTabChange('returned')} label="已退回" count={counts?.returned} badge={counts?.returned} />
                    <TabButton active={activeTab === 'in_review'} onClick={() => handleTabChange('in_review')} label="審核中" count={counts?.inReview} />
                    <TabButton active={activeTab === 'pending_payment'} onClick={() => handleTabChange('pending_payment')} label="待付款" count={counts?.pendingPayment} />
                    <TabButton active={activeTab === 'closed'} onClick={() => handleTabChange('closed')} label="已結束" count={counts?.closed} />
                </TabContainer>

                <div style={{ position: 'relative', width: '320px', flexShrink: 0, marginLeft: 'auto' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="搜尋說明、對象或編號..."
                        className="form-input"
                        style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-md)', width: '100%', backgroundColor: 'white', border: '1px solid var(--color-border)' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Areas */}
            {isLoading ? (
                <DashboardSkeleton />
            ) : (
                <div className="card card-flush vendor-table-container" style={{ overflowX: 'auto' }}>
                    <ClaimTable
                        claims={filterClaims(data)}
                        emptyMessage={searchQuery ? "找不到相符的項目" : "目前沒有相關項目"}
                        onRowClick={(claim: Claim) => {
                            if (activeTab === 'drafts') {
                                if (claim.type === 'service') router.push(`/applications/service/${claim.id}`);
                                else if (claim.type === 'payment') router.push(`/payment-request/${claim.id}`);
                                else router.push(`/reimburse/${claim.id}`);
                            } else {
                                router.push(`/claims/${claim.id}`);
                            }
                        }}
                        renderActions={activeTab === 'drafts' ? (claim: Claim) => (
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
                        ) : undefined}
                        availableUsers={availableUsers}
                    />

                    {pagination && (
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
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
