import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Claim, Payment } from '../../types';
import { Search, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Pagination from '../../components/Common/Pagination';
import ClaimTable from '../../components/Common/ClaimTable';
import TabButton from '../../components/Common/TabButton';
import VendorRequestTable from '../../components/Common/VendorRequestTable';
import PaymentRecordTable from '../../components/Common/PaymentRecordTable';
export default function ReviewDashboard() {
    const { claims, vendorRequests, currentUser, availableUsers, payments, addPayment, approveVendorRequest, rejectVendorRequest } = useApp();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Initial tab logic
    const currentTab = searchParams.get('tab') || 'claim_approvals';

    // Validate initial tab against review dashboard scope
    const validTabs = ['claim_approvals', 'pending_payment', 'pending_evidence', 'vendor_approvals', 'payment_records', 'all_applications'];

    const activeTab = validTabs.includes(currentTab) ? currentTab : 'claim_approvals';

    const handleTabChange = (tab: string) => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', tab);
            return newParams;
        });
    };

    // Filters for All Applications
    const [filterApplicant, setFilterApplicant] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPayee, setFilterPayee] = useState('');
    const [filterType, setFilterType] = useState('');

    // Payment selection state
    const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectionError, setSelectionError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Clear selection and reset page when switching tabs
    useEffect(() => {
        setSelectedClaimIds([]);
        setSelectionError(null);
        setCurrentPage(1);
    }, [activeTab]);

    // Permissions
    const isFinance = currentUser.permissions.includes('finance_audit');
    // Manager check based on if anyone reports to this user (or if they are an approver for anyone)
    const isManager = availableUsers.some(u => u.approverId === currentUser.id);

    // Filter Logic - Keep only what's needed for Review

    // 7. 請款審核 (Approver Only - Pending Approval + Finance Audit for Finance role)
    const claimApprovals = claims.filter(c => {
        // Manager check
        if (c.status === 'pending_approval' && isManager) {
            // Check if current user is the approver for this applicant
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant && applicant.approverId === currentUser.id) return true;
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

    // 9.5. 待補件 (Finance Only - pending_evidence status)
    const pendingEvidence = isFinance ? claims.filter(c => c.status === 'pending_evidence') : [];

    // 10. 付款紀錄 (Finance Only)
    const paymentRecords = isFinance ? payments : [];

    // 11. 所有申請單 (All Applications)
    const allApplications = claims.filter(c => {
        // Base Scope Check
        let inScope = false;
        if (isFinance) {
            inScope = true; // Finance sees all
        } else if (isManager) {
            // Manager sees subordinates' claims
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant && applicant.approverId === currentUser.id) {
                inScope = true;
            }
        }

        if (!inScope) return false;

        // Exclude drafts
        if (c.status === 'draft') return false;

        // Apply Filters
        if (filterApplicant && c.applicantId !== filterApplicant) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterPayee && !c.payee.toLowerCase().includes(filterPayee.toLowerCase())) return false;
        if (filterType && c.type !== filterType) return false;

        return true;
    });


    // Payment Handling Logic
    const handleSelectClaim = (id: string) => {
        setSelectedClaimIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        setSelectionError(null);
    };

    const handlePreparePayment = () => {
        if (selectedClaimIds.length === 0) return;

        // Validation: Same Payee
        const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
        const firstPayee = selectedClaims[0].payee;
        const allSamePayee = selectedClaims.every(c => c.payee === firstPayee);

        if (!allSamePayee) {
            setSelectionError('只能同時支付給同一位對象的款項');
            return;
        }

        setSelectionError(null);
        setShowPaymentModal(true);
    };

    const handleConfirmPayment = () => {
        if (selectedClaimIds.length === 0) return;
        const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
        const firstPayee = selectedClaims[0].payee;

        addPayment(firstPayee, selectedClaimIds, paymentDate);

        setShowPaymentModal(false);
        setSelectedClaimIds([]);
        handleTabChange('payment_records');
    };

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="vendor-header">
                <div>
                    <h1 className="heading-lg">申請審核</h1>
                    <p className="vendor-subtitle">管理待審核的申請與付款</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1px' }}>
                <TabButton active={activeTab === 'claim_approvals'} onClick={() => handleTabChange('claim_approvals')} label="請款審核" count={claimApprovals.length} badge={claimApprovals.length} />

                {isFinance && (
                    <>
                        <TabButton active={activeTab === 'pending_payment'} onClick={() => handleTabChange('pending_payment')} label="待付款" count={pendingPayment.length} badge={pendingPayment.length} />
                        <TabButton active={activeTab === 'pending_evidence'} onClick={() => handleTabChange('pending_evidence')} label="待補件" count={pendingEvidence.length} badge={pendingEvidence.length} />
                        <TabButton active={activeTab === 'vendor_approvals'} onClick={() => handleTabChange('vendor_approvals')} label="廠商異動審核" count={vendorApprovals.length} badge={vendorApprovals.length} />
                        <TabButton active={activeTab === 'payment_records'} onClick={() => handleTabChange('payment_records')} label="付款紀錄" count={paymentRecords.length} />
                    </>
                )}

                <TabButton active={activeTab === 'all_applications'} onClick={() => handleTabChange('all_applications')} label="所有申請單" count={allApplications.length} />
            </div>

            {/* Content Areas */}

            {activeTab === 'claim_approvals' && (
                <div className="card vendor-table-container">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(claimApprovals.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                    <ClaimTable
                        claims={claimApprovals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        emptyMessage="無待審核項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
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
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(pendingPayment.length / ITEMS_PER_PAGE)}
                            onPageChange={setCurrentPage}
                        />
                        <ClaimTable
                            claims={pendingPayment.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                            emptyMessage="無待付款項目"
                            onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                            selectable
                            selectedIds={selectedClaimIds}
                            onSelectChange={handleSelectClaim}
                            availableUsers={availableUsers}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'pending_evidence' && isFinance && (
                <div className="card vendor-table-container">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(pendingEvidence.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                    <ClaimTable
                        claims={pendingEvidence.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        emptyMessage="無待補件項目"
                        onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                        payments={payments}
                        availableUsers={availableUsers}
                    />
                </div>
            )}

            {activeTab === 'vendor_approvals' && isFinance && (
                <div className="card vendor-table-container">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(vendorApprovals.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                    <VendorRequestTable
                        requests={vendorApprovals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        showActions
                        onApprove={approveVendorRequest}
                        onReject={rejectVendorRequest}
                    />
                </div>
            )}

            {activeTab === 'payment_records' && isFinance && (
                <div className="card vendor-table-container">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(paymentRecords.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                    <PaymentRecordTable
                        payments={paymentRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        onRowClick={(p: Payment) => navigate(`/payments/${p.id}`)}
                    />
                </div>
            )}

            {activeTab === 'all_applications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Filter Bar */}
                    <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Filter size={18} className="text-muted" />
                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>篩選:</span>
                        </div>

                        <select
                            className="form-input"
                            style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.9rem' }}
                            value={filterApplicant}
                            onChange={(e) => setFilterApplicant(e.target.value)}
                        >
                            <option value="">所有申請人</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        <select
                            className="form-input"
                            style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.9rem' }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">所有狀態</option>
                            <option value="pending_approval">待主管審核</option>
                            <option value="pending_finance">待財務審核</option>
                            <option value="approved">待付款</option>
                            <option value="paid">已付款</option>
                            <option value="rejected">已退回</option>
                            <option value="completed">已完成</option>
                        </select>

                        <select
                            className="form-input"
                            style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.9rem' }}
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="">所有類型</option>
                            <option value="employee">員工報銷</option>
                            <option value="vendor">廠商付款</option>
                            <option value="service">勞務報酬</option>
                        </select>

                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                placeholder="搜尋付款對象..."
                                className="form-input"
                                style={{ paddingLeft: '28px', width: '200px', fontSize: '0.9rem', padding: '0.3rem 0.5rem 0.3rem 1.8rem' }}
                                value={filterPayee}
                                onChange={(e) => setFilterPayee(e.target.value)}
                            />
                        </div>

                        {(filterApplicant || filterStatus || filterType || filterPayee) && (
                            <button
                                className="btn btn-ghost"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--color-danger)' }}
                                onClick={() => {
                                    setFilterApplicant('');
                                    setFilterStatus('');
                                    setFilterPayee('');
                                    setFilterType('');
                                }}
                            >
                                清除篩選
                            </button>
                        )}
                    </div>

                    <div className="card vendor-table-container">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(allApplications.length / ITEMS_PER_PAGE)}
                            onPageChange={setCurrentPage}
                        />
                        <ClaimTable
                            claims={allApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                            emptyMessage="無符合條件的申請單"
                            onRowClick={(claim: Claim) => navigate(`/claims/${claim.id}`)}
                            availableUsers={availableUsers}
                        />
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>確認付款</h3>

                        <div className="form-group">
                            <label>付款日期</label>
                            <input
                                type="date"
                                className="form-input"
                                value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                            />
                        </div>

                        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>筆數:</span>
                                <span style={{ fontWeight: 600 }}>{selectedClaimIds.length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>總金額:</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                    ${claims.filter(c => selectedClaimIds.includes(c.id)).reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleConfirmPayment}>確認付款</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}


