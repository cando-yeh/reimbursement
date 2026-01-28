'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { Claim, Payment, VendorRequest } from '@/types';
import { Search, Filter } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Pagination from '@/components/Common/Pagination';
import ClaimTable from '@/components/Common/ClaimTable';
import TabButton from '@/components/Common/TabButton';
import VendorRequestTable from '@/components/Common/VendorRequestTable';
import PaymentRecordTable from '@/components/Common/PaymentRecordTable';
import VendorRequestDetailModal from '@/components/Common/VendorRequestDetailModal';
import PageHeader from '@/components/Common/PageHeader';
import TabContainer from '@/components/Common/TabContainer';

function ReviewDashboardInner() {
    // 1. Hooks - MUST BE AT THE TOP AND UNCONDITIONAL
    const app = useApp();
    const router = useRouter();
    const searchParams = useSearchParams();

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

    // Vendor Request Modal State
    const [selectedVendorRequest, setSelectedVendorRequest] = useState<VendorRequest | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Derived values from searchParams
    const currentTab = searchParams.get('tab') || 'claim_approvals';
    const validTabs = ['claim_approvals', 'pending_payment', 'pending_evidence', 'vendor_approvals', 'payment_records', 'all_applications'];
    const activeTab = validTabs.includes(currentTab) ? currentTab : 'claim_approvals';

    // Effect to reset state on tab change
    useEffect(() => {
        setSelectedClaimIds([]);
        setSelectionError(null);
        setCurrentPage(1);
    }, [activeTab]);

    // 2. Early return - MUST BE AFTER ALL HOOKS
    if (!app.currentUser) return null;

    // 3. Destructure and logic
    const { claims, vendorRequests, currentUser, availableUsers, payments, addPayment, approveVendorRequest, rejectVendorRequest } = app;
    const isFinance = currentUser.permissions.includes('finance_audit');
    const isManager = availableUsers.some(u => u.approverId === currentUser.id);

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/reviews?${params.toString()}`);
    };

    // Filter Logic
    const claimApprovals = claims.filter(c => {
        if (c.status === 'pending_approval') {
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant && applicant.approverId === currentUser.id) return true;
        }
        if (isFinance && (c.status === 'pending_finance' || c.status === 'pending_finance_review')) {
            return true;
        }
        return false;
    });

    const vendorApprovals = isFinance ? vendorRequests.filter(r => r.status === 'pending') : [];
    const pendingPayment = isFinance ? claims.filter(c => c.status === 'approved') : [];
    const pendingEvidence = isFinance ? claims.filter(c => c.status === 'pending_evidence') : [];
    const paymentRecords = isFinance ? payments : [];

    const allApplications = claims.filter(c => {
        let inScope = false;
        if (isFinance) {
            inScope = true;
        } else if (isManager) {
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            if (applicant && applicant.approverId === currentUser.id) {
                inScope = true;
            }
        }

        if (!inScope) return false;
        if (c.status === 'draft') return false;

        if (filterApplicant && c.applicantId !== filterApplicant) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterPayee && !c.payee.toLowerCase().includes(filterPayee.toLowerCase())) return false;
        if (filterType && c.type !== filterType) return false;

        return true;
    });

    const handleSelectClaim = (id: string) => {
        setSelectedClaimIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        setSelectionError(null);
    };

    const handlePreparePayment = () => {
        if (selectedClaimIds.length === 0) return;
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
            <PageHeader
                title="申請審核"
                subtitle="管理待審核的申請與付款"
            />

            <TabContainer>
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
            </TabContainer>

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
                        onRowClick={(claim: Claim) => {
                            console.log('Navigating to claim:', claim.id);
                            if (claim.id) router.push(`/claims/${claim.id}`);
                        }}
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
                            onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
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
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
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
                        onRowClick={(r) => setSelectedVendorRequest(r)}
                    />
                </div>
            )}

            <VendorRequestDetailModal
                request={selectedVendorRequest}
                onClose={() => setSelectedVendorRequest(null)}
                onApprove={approveVendorRequest}
                onReject={rejectVendorRequest}
            />

            {activeTab === 'payment_records' && isFinance && (
                <div className="card vendor-table-container">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(paymentRecords.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                    <PaymentRecordTable
                        payments={paymentRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        onRowClick={(p: Payment) => router.push(`/payments/${p.id}`)}
                    />
                </div>
            )}

            {activeTab === 'all_applications' && (
                <div className="card vendor-table-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                                    style={{ paddingLeft: '28px', width: '160px', fontSize: '0.9rem', padding: '0.3rem 0.5rem 0.3rem 1.8rem' }}
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
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(allApplications.length / ITEMS_PER_PAGE)}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                    <ClaimTable
                        claims={allApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                        emptyMessage="無符合條件的申請單"
                        onRowClick={(claim: Claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
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

export default function ReviewDashboard() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReviewDashboardInner />
        </Suspense>
    );
}
