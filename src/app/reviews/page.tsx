'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useApp } from '@/context/AppContext';
import { Claim, Payment, VendorRequest } from '@/types';
import { Search, Filter, AlertCircle, Clock, CheckCircle, FileText, Send } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import Pagination from '@/components/Common/Pagination';
import ClaimTable from '@/components/Common/ClaimTable';
import TabButton from '@/components/Common/TabButton';
import VendorRequestTable from '@/components/Common/VendorRequestTable';
import PaymentRecordTable from '@/components/Common/PaymentRecordTable';
import VendorRequestDetailModal from '@/components/Common/VendorRequestDetailModal';
import PageHeader from '@/components/Common/PageHeader';
import TabContainer from '@/components/Common/TabContainer';

function PendingItemsInner() {
    const app = useApp();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filters
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

    const { claims, vendorRequests, currentUser, availableUsers, payments, addPayment, approveVendorRequest, rejectVendorRequest } = app;

    if (!currentUser) return null;

    const isFinance = currentUser.permissions.includes('finance_audit') || currentUser.roleName.includes('財務');
    const isManager = availableUsers.some(u => u.approverId === currentUser.id);

    // Derived values from searchParams
    const currentTab = searchParams.get('tab') || (isManager ? 'manager_approvals' : isFinance ? 'finance_review' : 'all_applications');
    const activeTab = currentTab;

    // Effect to reset state on tab change
    useEffect(() => {
        setSelectedClaimIds([]);
        setSelectionError(null);
        setCurrentPage(1);
    }, [activeTab]);

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/reviews?${params.toString()}`);
    };

    // --- Logic for different categories ---

    // 1. My Pending (Drafts, Returned, Pending Evidence)
    const myPendingClaims = claims.filter(c =>
        c.applicantId === currentUser.id &&
        (['draft', 'rejected', 'pending_evidence'].includes(c.status))
    );

    // 2. Approvals (Manager)
    const managerApprovals = claims.filter(c => {
        if (c.status !== 'pending_approval') return false;
        const applicant = availableUsers.find(u => u.id === c.applicantId);
        return applicant?.approverId === currentUser.id;
    });

    // 3. Finance Review
    const financeReviewClaims = isFinance ? claims.filter(c =>
        ['pending_finance', 'pending_finance_review'].includes(c.status)
    ) : [];

    // 4. Finance Payment
    const financePaymentClaims = isFinance ? claims.filter(c => c.status === 'approved') : [];

    // 5. My Applications (All applications by current user)
    const myApplications = claims.filter(c => {
        if (c.applicantId !== currentUser.id) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (filterPayee && !c.payee.toLowerCase().includes(filterPayee.toLowerCase())) return false;
        if (filterType && c.type !== filterType) return false;
        return true;
    });

    // 6. Vendor Requests (Finance)
    const vendorApprovals = isFinance ? vendorRequests.filter(r => r.status === 'pending') : [];

    // 7. All Applications (Finance/Admin)
    const allApplications = claims.filter(c => {
        if (!isFinance && !currentUser.permissions.includes('user_management')) return false;
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
                subtitle="處理主管與財務審核任務"
            />

            <TabContainer>
                {isManager && (
                    <TabButton
                        active={activeTab === 'manager_approvals'}
                        onClick={() => handleTabChange('manager_approvals')}
                        label="主管審核"
                        count={managerApprovals.length}
                        badge={managerApprovals.length}
                    />
                )}

                {isFinance && (
                    <>
                        <TabButton
                            active={activeTab === 'finance_review'}
                            onClick={() => handleTabChange('finance_review')}
                            label="財務審核"
                            count={financeReviewClaims.length}
                            badge={financeReviewClaims.length}
                        />
                        <TabButton
                            active={activeTab === 'finance_payment'}
                            onClick={() => handleTabChange('finance_payment')}
                            label="待付款"
                            count={financePaymentClaims.length}
                            badge={financePaymentClaims.length}
                        />
                        <TabButton
                            active={activeTab === 'vendor_requests'}
                            onClick={() => handleTabChange('vendor_requests')}
                            label="廠商審核"
                            count={vendorApprovals.length}
                            badge={vendorApprovals.length}
                        />
                    </>
                )}

                {(isFinance || currentUser.permissions.includes('user_management')) && (
                    <TabButton
                        active={activeTab === 'all_applications'}
                        onClick={() => handleTabChange('all_applications')}
                        label="所有申請單"
                        count={allApplications.length}
                    />
                )}

                {isFinance && (
                    <TabButton
                        active={activeTab === 'payment_records'}
                        onClick={() => handleTabChange('payment_records')}
                        label="付款紀錄"
                        count={payments.length}
                    />
                )}
            </TabContainer>

            {/* Render Tab Content */}
            <div className="card vendor-table-container">
                {/* Filters for applicable tabs */}
                {(activeTab === 'all_applications') && (
                    <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                        {activeTab === 'all_applications' && (
                            <select
                                className="form-input"
                                value={filterApplicant}
                                onChange={(e) => setFilterApplicant(e.target.value)}
                                style={{ width: 'auto' }}
                            >
                                <option value="">所有申請人</option>
                                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        )}
                        <select
                            className="form-input"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ width: 'auto' }}
                        >
                            <option value="">所有狀態</option>
                            <option value="draft">草稿</option>
                            <option value="pending_approval">待主管審核</option>
                            <option value="pending_finance">待財務審核</option>
                            <option value="approved">待付款</option>
                            <option value="paid">已付款</option>
                            <option value="rejected">已退回</option>
                            <option value="completed">已完成</option>
                        </select>
                        <select
                            className="form-input"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{ width: 'auto' }}
                        >
                            <option value="">所有類型</option>
                            <option value="employee">員工報銷</option>
                            <option value="vendor">廠商請款</option>
                            <option value="service">個人勞務</option>
                        </select>
                        <input
                            type="text"
                            placeholder="搜尋付款對象..."
                            className="form-input"
                            value={filterPayee}
                            onChange={(e) => setFilterPayee(e.target.value)}
                            style={{ width: '200px' }}
                        />
                    </div>
                )}

                {/* Main Content Area */}

                {activeTab === 'manager_approvals' && (
                    <ClaimTable
                        claims={managerApprovals}
                        emptyMessage="無待審核項目"
                        onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                )}

                {activeTab === 'finance_review' && (
                    <ClaimTable
                        claims={financeReviewClaims}
                        emptyMessage="無待財務核核項目"
                        onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                    />
                )}

                {activeTab === 'finance_payment' && (
                    <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span>已選擇 {selectedClaimIds.length} 筆</span>
                            <button className="btn btn-primary" onClick={handlePreparePayment} disabled={selectedClaimIds.length === 0}>準備付款</button>
                        </div>
                        {selectionError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{selectionError}</div>}
                        <ClaimTable
                            claims={financePaymentClaims}
                            selectable
                            selectedIds={selectedClaimIds}
                            onSelectChange={handleSelectClaim}
                            onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                            availableUsers={availableUsers}
                            emptyMessage="無待付款項目"
                        />
                    </div>
                )}

                {activeTab === 'vendor_requests' && (
                    <VendorRequestTable
                        requests={vendorApprovals}
                        onRowClick={(r) => setSelectedVendorRequest(r)}
                    />
                )}


                {activeTab === 'all_applications' && (
                    <>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(allApplications.length / ITEMS_PER_PAGE)}
                            onPageChange={setCurrentPage}
                        />
                        <ClaimTable
                            claims={allApplications.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)}
                            onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                            availableUsers={availableUsers}
                            emptyMessage="無符合條件的申請單"
                        />
                    </>
                )}

                {activeTab === 'payment_records' && (
                    <PaymentRecordTable
                        payments={payments}
                        onRowClick={(p) => router.push(`/payments/${p.id}`)}
                    />
                )}
            </div>

            {/* Modals */}
            <VendorRequestDetailModal
                request={selectedVendorRequest}
                onClose={() => setSelectedVendorRequest(null)}
                onApprove={approveVendorRequest}
                onReject={rejectVendorRequest}
            />

            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="card modal-content" style={{ maxWidth: '400px' }}>
                        <h3 className="heading-md">確認付款</h3>
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label>付款日期</label>
                            <input type="date" className="form-input" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div className="modal-actions" style={{ marginTop: '2rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleConfirmPayment}>確認</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PendingItemsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PendingItemsInner />
        </Suspense>
    );
}
