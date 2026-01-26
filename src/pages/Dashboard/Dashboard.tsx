import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Claim, Payment } from '../../types';
import { Plus, Check, X, UploadCloud, Trash2 } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import StatusBadge from '../../components/Common/StatusBadge';

export default function Dashboard() {
    const { claims, vendorRequests, currentUser, deleteClaim, approveVendorRequest, rejectVendorRequest, availableUsers, payments, addPayment } = useApp();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'completed' | 'my_vendor_requests' | 'claim_approvals' | 'pending_payment' | 'vendor_approvals' | 'payment_records' || 'drafts';
    const [activeTab, setActiveTab] = useState<'drafts' | 'evidence' | 'returned' | 'in_review' | 'completed' | 'my_vendor_requests' | 'claim_approvals' | 'pending_payment' | 'vendor_approvals' | 'payment_records'>(initialTab);

    // Payment selection state
    const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectionError, setSelectionError] = useState<string | null>(null);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['drafts', 'evidence', 'returned', 'in_review', 'completed', 'my_vendor_requests', 'claim_approvals', 'pending_payment', 'vendor_approvals', 'payment_records'].includes(tab)) {
            setActiveTab(tab as any);
        }
        // Clear selection when switching tabs
        setSelectedClaimIds([]);
        setSelectionError(null);
    }, [searchParams]);

    // Permissions
    const isFinance = currentUser.permissions.includes('finance_audit');
    // Manager check based on if anyone reports to this user (or if they are an approver for anyone)
    const isManager = availableUsers.some(u => u.approverId === currentUser.id);

    // Filter Logic

    // 1. 草稿
    const drafts = claims.filter(c => c.applicantId === currentUser.id && c.status === 'draft');

    // 2. 待補憑證
    const pendingEvidence = claims.filter(c => c.applicantId === currentUser.id && c.status === 'pending_evidence');

    // 3. 已退回 (Rejected in workflow)
    const returned = claims.filter(c => c.applicantId === currentUser.id && c.status === 'rejected');

    // 4. 審核中 (Pending Approval, Finance, or Payment)
    const inReview = claims.filter(c =>
        c.applicantId === currentUser.id &&
        ['pending_approval', 'pending_finance', 'pending_finance_review', 'approved'].includes(c.status)
    );

    // 5. 已完成
    const completed = claims.filter(c => c.applicantId === currentUser.id && c.status === 'completed');

    // 6. 廠商異動申請 (Applicant's own - Assuming we filter by requester if possible, but currently VendorRequest doesn't strict link to requester in the mock. 
    // Assuming *all* are visible or we filter if we had requesterId. The requirement says "Applicant's own". 
    // Since VendorRequest interface doesn't have requesterId but might be relevant, we might just show all for now or skip if we can't filter.
    // However, looking at the previous code, there was no 'my vendor requests'. 
    // Let's assume for MVP all vendor requests are viewable or just show all for now as 'my_vendor_requests' if that's the intent, OR
    // if `vendorRequests` are global, showing all might be confusing. 
    // Let's assume for this "Personal" dashboard, we show requests where the user might have initiated.
    // Inspecting `VendorRequest`, it has no `userId`. I will skip filtering by user for now and show all, annotating this limitation if needed.
    const myVendorRequests = vendorRequests;

    // 7. 請款審核 (Approver Only - Pending Approval + Finance Audit for Finance role)
    // "Approver needs to approve... including pending_approval and pending_finance_audit"
    // Manager: pending_approval for their subordinates
    // Finance: pending_finance
    const claimApprovals = claims.filter(c => {
        // Manager check
        if (c.status === 'pending_approval' && isManager) {
            // Check if current user is the approver for this applicant
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant && applicant.approverId === currentUser.id) return true;

            // Or if no specific approver is assigned but user is a manager? 
            // Requirement usually implies strict hierarchy. Stick to assigned approver for direct "approval"
            // BUT, if user is manager, they might approve anyone if they are the designated approver.
            // The logic was: is approver for claimant.
            // If we untie "Manager Role" from "Approver Function", we rely on the specific assignment.
            // However, the `isManager` check is now permission based. 
            // Let's say: If you have 'manager' permission, you see the tab. 
            // What you see Inside the tab: items where you are the approver.
            // So here we check if (isManager && applicant.approverId === currentUser.id)
            return applicant && applicant.approverId === currentUser.id;
        }
        // Finance check
        if (isFinance && (c.status === 'pending_finance' || c.status === 'pending_finance_review')) {
            return true;
        }
        return false;
    });

    // 8. 廠商異動審核 (Finance Only)
    const vendorApprovals = isFinance ? vendorRequests.filter(r => r.status === 'pending') : [];

    // 9. 待付款 (Finance Only - approved status)
    const pendingPayment = isFinance ? claims.filter(c => c.status === 'approved') : [];

    // 10. 付款紀錄 (Finance sees all, User sees theirs)
    const paymentRecords = isFinance
        ? payments
        : payments.filter(p => {
            // Check if user is the payee in any of the claims associated with this payment
            const associatedClaims = claims.filter(c => p.claimIds.includes(c.id));
            return associatedClaims.some(c => c.applicantId === currentUser.id);
        });


    // Actions
    const handleToggleSelection = (id: string) => {
        setSelectionError(null);
        setSelectedClaimIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handlePreparePayment = () => {
        if (selectedClaimIds.length === 0) {
            alert('請至少選擇一筆申請單進行付款。');
            return;
        }

        const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
        const payees = new Set(selectedClaims.map(c => c.payee));

        if (payees.size > 1) {
            setSelectionError('建立付款單失敗：所選申請單之「付款對象」必須相同。');
            return;
        }

        setSelectionError(null);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = () => {
        const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
        if (selectedClaims.length === 0) return;

        const payee = selectedClaims[0].payee;
        addPayment(payee, selectedClaimIds, paymentDate);

        setShowPaymentModal(false);
        setSelectedClaimIds([]);
        setActiveTab('payment_records');
    };

    const handleDeleteDraft = (id: string) => {
        if (confirm('確定要刪除此草稿嗎？')) {
            deleteClaim(id);
        }
    };


    // Initial Tab Logic (Optional: set default based on content)
    React.useEffect(() => {
        // Keep default as drafts or first non-empty relevant tab
    }, []);

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="vendor-header">
                <div>
                    <h1 className="heading-lg">申請單管理</h1>
                    <p className="vendor-subtitle">管理您的申請單與待辦事項</p>
                </div>
                <Link to="/applications/new" className="btn btn-primary" title="新增請款單" style={{ padding: '0.4rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} />
                </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1px' }}>
                <TabButton active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')} label="草稿" count={drafts.length} />
                <TabButton active={activeTab === 'evidence'} onClick={() => setActiveTab('evidence')} label="待補憑證" count={pendingEvidence.length} badge={pendingEvidence.length} />
                <TabButton active={activeTab === 'returned'} onClick={() => setActiveTab('returned')} label="已退回" count={returned.length} badge={returned.length} />
                <TabButton active={activeTab === 'in_review'} onClick={() => setActiveTab('in_review')} label="審核中" count={inReview.length} />
                <TabButton active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} label="已完成" count={completed.length} />

                <div style={{ width: '1px', backgroundColor: 'var(--color-border)', height: '24px', alignSelf: 'center' }} />

                <TabButton active={activeTab === 'my_vendor_requests'} onClick={() => setActiveTab('my_vendor_requests')} label="廠商異動申請" count={myVendorRequests.length} />

                {(isManager || isFinance) && (
                    <>
                        <div style={{ width: '1px', backgroundColor: 'var(--color-border)', height: '24px', alignSelf: 'center' }} />
                        <TabButton active={activeTab === 'claim_approvals'} onClick={() => setActiveTab('claim_approvals')} label="請款審核" count={claimApprovals.length} badge={claimApprovals.length} />
                    </>
                )}

                {isFinance && (
                    <>
                        <TabButton active={activeTab === 'pending_payment'} onClick={() => setActiveTab('pending_payment')} label="待付款" count={pendingPayment.length} badge={pendingPayment.length} />
                        <TabButton active={activeTab === 'vendor_approvals'} onClick={() => setActiveTab('vendor_approvals')} label="廠商異動審核" count={vendorApprovals.length} badge={vendorApprovals.length} />
                        <TabButton active={activeTab === 'payment_records'} onClick={() => setActiveTab('payment_records')} label="付款紀錄" count={paymentRecords.length} />
                    </>
                )}
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
                    />
                </div>
            )}

            {activeTab === 'evidence' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={pendingEvidence}
                        emptyMessage="無待補憑證項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        renderActions={(claim: Claim) => (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/claims/${claim.id}`);
                                }}>
                                    <UploadCloud size={14} style={{ marginRight: '0.25rem' }} /> 上傳憑證
                                </button>
                            </div>
                        )}
                    />
                </div>
            )}

            {activeTab === 'returned' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={returned}
                        emptyMessage="無已退回項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                    />
                </div>
            )}

            {activeTab === 'in_review' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={inReview}
                        emptyMessage="無審核中項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                    />
                </div>
            )}

            {activeTab === 'completed' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={completed}
                        emptyMessage="無已完成項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                    />
                </div>
            )}

            {activeTab === 'my_vendor_requests' && (
                <div className="card vendor-table-container">
                    <VendorRequestTable requests={myVendorRequests} />
                </div>
            )}

            {activeTab === 'claim_approvals' && (
                <div className="card vendor-table-container">
                    <ClaimTable
                        claims={claimApprovals}
                        emptyMessage="無待審核項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                    />
                </div>
            )}

            {activeTab === 'pending_payment' && isFinance && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            已選擇 {selectedClaimIds.length} 筆申請單
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handlePreparePayment}
                        >
                            付款
                        </button>
                    </div>

                    {selectionError && (
                        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #fecaca' }}>
                            {selectionError}
                        </div>
                    )}

                    <div className="card vendor-table-container">
                        <ClaimTable
                            claims={pendingPayment}
                            emptyMessage="無待付款項目"
                            onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                            selectable={true}
                            selectedIds={selectedClaimIds}
                            onSelectChange={handleToggleSelection}
                        />
                    </div>
                </div>
            )}

            {/* Payment Date Modal */}
            {showPaymentModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h2 className="heading-md" style={{ marginBottom: '1.5rem' }}>完成付款</h2>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>選擇付款日期</label>
                            <input
                                type="date"
                                className="input-field"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleConfirmPayment}>完成付款</button>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'vendor_approvals' && isFinance && (
                <div className="card vendor-table-container">
                    <VendorRequestTable requests={vendorApprovals} showActions
                        onApprove={approveVendorRequest}
                        onReject={rejectVendorRequest}
                    />
                </div>
            )}

            {activeTab === 'payment_records' && isFinance && (
                <div className="card vendor-table-container">
                    <PaymentTable
                        payments={paymentRecords}
                        emptyMessage="無付款紀錄"
                        onRowClick={(payment: Payment) => navigate(`/payments/${payment.id}`)}
                    />
                </div>
            )}

        </div>
    );
}

const TabButton = ({ active, onClick, label, count, badge }: any) => (
    <button
        onClick={onClick}
        style={{
            padding: '0.75rem 0',
            borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: active ? 600 : 500,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        }}
    >
        {label}
        {badge !== undefined && badge > 0 ? (
            <span style={{
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
            }}>
                {badge > 99 ? '99+' : badge}
            </span>
        ) : (
            <span>({count})</span>
        )}
    </button>
);

const ClaimTable = ({ claims, emptyMessage, renderActions, onRowClick, showApprover, availableUsers, selectable, selectedIds, onSelectChange }: any) => {
    // Helper to get approver name for a claim
    const getApproverName = (claim: Claim) => {
        if (!availableUsers) return '-';
        const applicant = availableUsers.find((u: any) => u.id === claim.applicantId);
        if (applicant?.approverId) {
            const approver = availableUsers.find((u: any) => u.id === applicant.approverId);
            if (approver) return approver.name;
        }
        // If claim is pending_finance or beyond, it's with finance
        if (['pending_finance', 'pending_finance_review', 'approved'].includes(claim.status)) {
            return '財務部門';
        }
        return '-';
    };

    return (
        <table className="vendor-table">
            <thead>
                <tr>
                    {selectable && <th style={{ width: '40px' }}></th>}
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>申請編號</th>
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>申請日期</th>
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>狀態</th>
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>類型</th>
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>付款對象</th>
                    {showApprover && <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>審核者</th>}
                    <th style={{ textAlign: 'center' }}>說明</th>
                    <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>金額</th>
                    {renderActions && <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>刪除</th>}
                </tr>
            </thead>
            <tbody>
                {claims.length === 0 ? (
                    <tr><td colSpan={selectable ? (renderActions ? (showApprover ? 9 : 8) : (showApprover ? 8 : 7)) + 1 : (renderActions ? (showApprover ? 8 : 7) : (showApprover ? 7 : 6))} className="empty-state">{emptyMessage}</td></tr>
                ) : (
                    claims.map((claim: Claim) => (
                        <tr
                            key={claim.id}
                            onClick={() => onRowClick && onRowClick(claim)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                        >
                            {selectable && (
                                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds?.includes(claim.id)}
                                        onChange={() => onSelectChange && onSelectChange(claim.id)}
                                    />
                                </td>
                            )}
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#{claim.id.slice(0, 8)}</td>
                            <td style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{claim.date}</td>
                            <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={claim.status} /></td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {claim.type === 'employee' ? '員工報銷' : claim.type === 'vendor' ? '廠商款項' : '勞務報酬'}
                                </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                                <div>{claim.payee}</div>
                                {claim.payeeId && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {claim.payeeId}</div>}
                            </td>
                            {showApprover && (
                                <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                                    {getApproverName(claim)}
                                </td>
                            )}
                            <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }} title={claim.description}>
                                {claim.description}
                            </td>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>${claim.amount.toLocaleString()}</td>
                            {renderActions && (
                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                    {renderActions(claim)}
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
};

const VendorRequestTable = ({ requests, showActions, onApprove, onReject }: any) => (
    <table className="vendor-table">
        <thead>
            <tr>
                <th style={{ textAlign: 'center' }}>申請類型</th>
                <th style={{ textAlign: 'center' }}>廠商名稱</th>
                <th style={{ textAlign: 'center' }}>狀態</th>
                <th style={{ textAlign: 'center' }}>申請日期</th>
                {showActions && <th style={{ textAlign: 'right' }}>操作</th>}
            </tr>
        </thead>
        <tbody>
            {requests.length === 0 ? (
                <tr><td colSpan={showActions ? 5 : 4} className="empty-state">無廠商異動申請</td></tr>
            ) : (
                requests.map((req: any) => (
                    <tr key={req.id}>
                        <td>
                            <span className={`status-badge ${req.type === 'add' ? 'approved' : req.type === 'delete' ? 'pending' : 'paid'}`}>
                                {req.type === 'add' ? '新增' : req.type === 'update' ? '修改' : '刪除'}
                            </span>
                        </td>
                        <td>{req.data?.name || req.originalData?.name}</td>
                        <td>
                            <span className={`status-badge ${req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                {req.status === 'approved' ? '已核准' : req.status === 'rejected' ? '已拒絕' : '待核准'}
                            </span>
                        </td>
                        <td>{req.timestamp}</td>
                        {showActions && (
                            <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => onApprove(req.id)}>
                                        <Check size={16} style={{ marginRight: '0.25rem' }} /> 核准
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', color: 'var(--color-danger)' }} onClick={() => onReject(req.id)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </td>
                        )}
                    </tr>
                ))
            )}
        </tbody>
    </table>
);

const PaymentTable = ({ payments, emptyMessage, onRowClick }: any) => (
    <table className="vendor-table">
        <thead>
            <tr>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>付款編號</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>付款對象</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>付款日期</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>付款金額</th>
                <th style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>申請單數</th>
            </tr>
        </thead>
        <tbody>
            {payments.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">{emptyMessage}</td></tr>
            ) : (
                payments.map((payment: any) => (
                    <tr
                        key={payment.id}
                        onClick={() => onRowClick && onRowClick(payment)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#{payment.id}</td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{payment.payee}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.paymentDate}</td>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>${payment.amount.toLocaleString()}</td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{payment.claimIds.length} 筆</td>
                    </tr>
                ))
            )}
        </tbody>
    </table>
);
