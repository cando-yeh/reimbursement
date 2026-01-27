
import { useApp } from '../../context/AppContext';
import { Claim } from '../../types';
import { Plus, Trash2 } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ClaimTable from '../../components/Common/ClaimTable';
import TabButton from '../../components/Common/TabButton';

export default function Dashboard() {
    const { claims, currentUser, deleteClaim, availableUsers, payments } = useApp();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentTab = searchParams.get('tab');
    const activeTab = (currentTab && ['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'completed'].includes(currentTab))
        ? currentTab as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'completed'
        : 'drafts';

    const handleTabChange = (tab: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', tab);
            return newParams;
        });
    };

    // Filter Logic

    // 1. 草稿
    const drafts = claims.filter(c => c.applicantId === currentUser.id && c.status === 'draft');

    // 2. 待補憑證
    const pendingEvidence = claims.filter(c => c.applicantId === currentUser.id && c.status === 'pending_evidence');

    // 3. 已退回 (Rejected in workflow)
    const returned = claims.filter(c => c.applicantId === currentUser.id && c.status === 'rejected');

    // 4. 審核中 (Pending Approval, Finance Review)
    const inReview = claims.filter(c =>
        c.applicantId === currentUser.id &&
        ['pending_approval', 'pending_finance', 'pending_finance_review'].includes(c.status)
    );

    // 4.5 待付款 (Approved but not yet paid)
    const pendingPayment = claims.filter(c =>
        c.applicantId === currentUser.id && c.status === 'approved'
    );

    // 5. 已完成
    const completed = claims.filter(c => c.applicantId === currentUser.id && c.status === 'completed');

    // Helper: Delete Draft
    const handleDeleteDraft = (id: string) => {
        if (confirm('確定要刪除此草稿嗎？')) {
            deleteClaim(id);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="vendor-header">
                <div>
                    <h1 className="heading-lg">我的請款</h1>
                    <p className="vendor-subtitle">管理您的申請單與待辦事項</p>
                </div>
                <Link to="/applications/new" className="btn btn-primary" title="新增請款單" style={{ padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} />
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1px' }}>
                <TabButton active={activeTab === 'drafts'} onClick={() => handleTabChange('drafts')} label="草稿" count={drafts.length} />
                <TabButton active={activeTab === 'evidence'} onClick={() => handleTabChange('evidence')} label="待補憑證" count={pendingEvidence.length} badge={pendingEvidence.length} />
                <TabButton active={activeTab === 'returned'} onClick={() => handleTabChange('returned')} label="已退回" count={returned.length} badge={returned.length} />
                <TabButton active={activeTab === 'in_review'} onClick={() => handleTabChange('in_review')} label="審核中" count={inReview.length} />
                <TabButton active={activeTab === 'pending_payment'} onClick={() => handleTabChange('pending_payment')} label="待付款" count={pendingPayment.length} />
                <TabButton active={activeTab === 'completed'} onClick={() => handleTabChange('completed')} label="已完成" count={completed.length} />
            </div>

            {/* Content Areas */}

            {activeTab === 'drafts' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={drafts}
                        emptyMessage="無草稿"
                        onRowClick={(claim: Claim) => {
                            if (claim.type === 'service') navigate(`/applications/service/${claim.id}`);
                            else if (claim.type === 'payment') navigate(`/payment-request/${claim.id}`);
                            else navigate(`/reimburse/${claim.id}`);
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
                        claims={pendingEvidence}
                        emptyMessage="無待補憑證項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'returned' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={returned}
                        emptyMessage="無已退回項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'in_review' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={inReview}
                        emptyMessage="無審核中項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'pending_payment' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={pendingPayment}
                        emptyMessage="無待付款項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'completed' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={completed}
                        emptyMessage="無已完成項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

        </div>
    );
}


