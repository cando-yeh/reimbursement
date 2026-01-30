'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useClaims } from '@/context/ClaimsContext';
import { Claim, VendorRequest } from '@/types';
import { todayISO } from '@/utils/date';
import { getClaims, getReviewBadgeCounts } from '@/app/actions/claims';
import { approveVendorRequest as approveVendorRequestAction, getPendingVendorRequestCount, getVendorRequests } from '@/app/actions/vendors';
import { formatVendorRequests } from '@/utils/vendorHelpers';
import Pagination from '@/components/Common/Pagination';
import TabButton from '@/components/Common/TabButton';
import PageHeader from '@/components/Common/PageHeader';
import TabContainer from '@/components/Common/TabContainer';
import ClaimTable from '@/components/Common/ClaimTable';

const VendorRequestTable = dynamic(() => import('@/components/Common/VendorRequestTable'), {
    loading: () => <div style={{ padding: '1rem' }}>載入中...</div>,
});
const PaymentRecordTable = dynamic(() => import('@/components/Common/PaymentRecordTable'), {
    loading: () => <div style={{ padding: '1rem' }}>載入中...</div>,
});
const VendorRequestDetailModal = dynamic(() => import('@/components/Common/VendorRequestDetailModal'));

function useDebouncedValue<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timeoutId = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timeoutId);
    }, [value, delay]);
    return debounced;
}

function PendingItemsInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser, availableUsers } = useAuth();
    const { payments, addPayment } = useClaims();

    // Filters
    const [filterApplicant, setFilterApplicant] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPayee, setFilterPayee] = useState('');
    const [filterType, setFilterType] = useState('');
    const debouncedPayee = useDebouncedValue(filterPayee, 300);

    // Payment selection state
    const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentDate, setPaymentDate] = useState(todayISO());
    const [selectionError, setSelectionError] = useState<string | null>(null);

    // Vendor Request Modal State
    const [selectedVendorRequest, setSelectedVendorRequest] = useState<VendorRequest | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [allApplications, setAllApplications] = useState<Claim[]>([]);
    const [allApplicationsPagination, setAllApplicationsPagination] = useState<any>(null);
    const [isAllApplicationsLoading, setIsAllApplicationsLoading] = useState(false);

    const [claims, setClaims] = useState<Claim[]>([]);
    const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
    const [isClaimsLoading, setIsClaimsLoading] = useState(false);

    const [badgeCounts, setBadgeCounts] = useState({
        managerApprovals: 0,
        financeReview: 0,
        financePayment: 0,
    });
    const [vendorPendingCount, setVendorPendingCount] = useState(0);

    const [claimOverrides, setClaimOverrides] = useState<Record<string, { status: Claim['status']; datePaid?: string }>>({});

    const currentUserId = currentUser?.id;
    const isFinance = currentUser?.permissions?.includes('finance_audit') || currentUser?.roleName?.includes('財務');
    const isManager = currentUserId ? availableUsers.some(u => u.approverId === currentUserId) : false;

    const reviewStatuses: Claim['status'][] = ['pending_approval', 'pending_finance', 'pending_finance_review', 'approved'];

    // Initial claims + vendor requests load
    useEffect(() => {
        if (!currentUserId) return;
        setIsClaimsLoading(true);
        getClaims({ status: reviewStatuses, pageSize: 200, cache: true, compact: true })
            .then(res => {
                if (res.success && res.data) {
                    setClaims(res.data);
                } else {
                    setClaims([]);
                }
            })
            .finally(() => setIsClaimsLoading(false));

        if (isFinance) {
            getVendorRequests({ page: 1, pageSize: 50 })
                .then(res => {
                    if (res.success && res.data) {
                        setVendorRequests(formatVendorRequests(res.data));
                    } else {
                        setVendorRequests([]);
                    }
                });
        }
    }, [currentUserId, isFinance]);

    useEffect(() => {
        if (!currentUserId) return;
        getReviewBadgeCounts({ userId: currentUserId, includeFinance: isFinance })
            .then(res => {
                if (res.success && res.data) {
                    setBadgeCounts(res.data);
                }
            });

        if (isFinance) {
            getPendingVendorRequestCount()
                .then(res => {
                    if (res.success && res.data) {
                        setVendorPendingCount(res.data.count);
                    }
                });
        }
    }, [currentUserId, isFinance]);

    // Derived values from searchParams
    const currentTab = searchParams.get('tab') || (isManager ? 'manager_approvals' : isFinance ? 'finance_review' : 'all_applications');
    const activeTab = currentTab;

    // Effect to reset state on tab change
    useEffect(() => {
        setSelectedClaimIds([]);
        setSelectionError(null);
        setCurrentPage(1);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'all_applications') return;
        setCurrentPage(1);
    }, [activeTab, filterApplicant, filterStatus, filterType, filterPayee]);

    useEffect(() => {
        if (!currentUserId || activeTab !== 'all_applications') return;
        setIsAllApplicationsLoading(true);
        getClaims({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            applicantId: filterApplicant || undefined,
            status: filterStatus || undefined,
            type: filterType || undefined,
            payee: debouncedPayee || undefined,
            cache: true,
            compact: true,
            excludeDraft: !filterStatus,
        }).then(res => {
            if (res.success && res.data) {
                const merged = res.data.map(claim => {
                    const override = claimOverrides[claim.id];
                    return override ? { ...claim, ...override } : claim;
                });
                setAllApplications(merged);
                setAllApplicationsPagination(res.pagination);
            } else {
                setAllApplications([]);
                setAllApplicationsPagination(null);
            }
        }).finally(() => {
            setIsAllApplicationsLoading(false);
        });
    }, [activeTab, currentUserId, currentPage, filterApplicant, filterStatus, filterType, debouncedPayee, ITEMS_PER_PAGE, claimOverrides]);

    if (!currentUser) return null;

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`/reviews?${params.toString()}`);
    };

    const managerApprovals = useMemo(() => (
        claims.filter(c => {
            if (c.status !== 'pending_approval') return false;
            const applicant = availableUsers.find(u => u.id === c.applicantId);
            return applicant?.approverId === currentUser.id;
        })
    ), [claims, availableUsers, currentUser.id]);

    const financeReviewClaims = useMemo(() => (
        isFinance ? claims.filter(c => ['pending_finance', 'pending_finance_review'].includes(c.status)) : []
    ), [claims, isFinance]);

    const financePaymentClaims = useMemo(() => (
        isFinance ? claims.filter(c => c.status === 'approved') : []
    ), [claims, isFinance]);

    const vendorApprovals = useMemo(() => (
        isFinance ? vendorRequests.filter(r => r.status === 'pending') : []
    ), [vendorRequests, isFinance]);

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

        setClaims(prev => prev.map(c => {
            if (!selectedClaimIds.includes(c.id)) return c;
            const needsEvidence = c.paymentDetails?.invoiceStatus === 'not_yet';
            const nextStatus = needsEvidence ? 'pending_evidence' : 'completed';
            return { ...c, status: nextStatus, datePaid: paymentDate };
        }));

        setClaimOverrides(prev => {
            const updated = { ...prev };
            selectedClaimIds.forEach(id => {
                const claim = claims.find(c => c.id === id);
                const needsEvidence = claim?.paymentDetails?.invoiceStatus === 'not_yet';
                const nextStatus = needsEvidence ? 'pending_evidence' : 'completed';
                updated[id] = { status: nextStatus, datePaid: paymentDate } as any;
            });
            return updated;
        });

        setShowPaymentModal(false);
        setSelectedClaimIds([]);
        handleTabChange('payment_records');
    };

    const handleApproveVendorRequest = async (requestId: string) => {
        setVendorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
        const result = await approveVendorRequestAction(requestId, 'approve');
        if (!result?.success) {
            alert('審核失敗');
        }
        if (isFinance) {
            const res = await getVendorRequests({ page: 1, pageSize: 50 });
            if (res.success && res.data) {
                setVendorRequests(formatVendorRequests(res.data));
            }
            const countRes = await getPendingVendorRequestCount();
            if (countRes.success && countRes.data) {
                setVendorPendingCount(countRes.data.count);
            }
        }
    };

    const handleRejectVendorRequest = async (requestId: string) => {
        setVendorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
        const result = await approveVendorRequestAction(requestId, 'reject');
        if (!result?.success) {
            alert('審核失敗');
        }
        if (isFinance) {
            const res = await getVendorRequests({ page: 1, pageSize: 50 });
            if (res.success && res.data) {
                setVendorRequests(formatVendorRequests(res.data));
            }
            const countRes = await getPendingVendorRequestCount();
            if (countRes.success && countRes.data) {
                setVendorPendingCount(countRes.data.count);
            }
        }
    };

    const managerApprovalsCount = badgeCounts.managerApprovals || managerApprovals.length;
    const financeReviewCount = badgeCounts.financeReview || financeReviewClaims.length;
    const financePaymentCount = badgeCounts.financePayment || financePaymentClaims.length;
    const vendorApprovalsCount = vendorPendingCount || vendorApprovals.length;

    return (
        <div className="container">
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
                        count={managerApprovalsCount}
                        badge={managerApprovalsCount}
                    />
                )}

                {isFinance && (
                    <>
                        <TabButton
                            active={activeTab === 'finance_review'}
                            onClick={() => handleTabChange('finance_review')}
                            label="財務審核"
                            count={financeReviewCount}
                            badge={financeReviewCount}
                        />
                        <TabButton
                            active={activeTab === 'finance_payment'}
                            onClick={() => handleTabChange('finance_payment')}
                            label="待付款"
                            count={financePaymentCount}
                            badge={financePaymentCount}
                        />
                        <TabButton
                            active={activeTab === 'vendor_requests'}
                            onClick={() => handleTabChange('vendor_requests')}
                            label="廠商審核"
                            count={vendorApprovalsCount}
                            badge={vendorApprovalsCount}
                        />
                    </>
                )}

                {(isFinance || currentUser.permissions.includes('user_management')) && (
                    <TabButton
                        active={activeTab === 'all_applications'}
                        onClick={() => handleTabChange('all_applications')}
                        label="所有申請單"
                        count={allApplicationsPagination?.totalCount || 0}
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
            <div className="card vendor-table-container" style={{ overflowX: 'auto' }}>
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
                        loading={isClaimsLoading}
                    />
                )}

                {activeTab === 'finance_review' && (
                    <ClaimTable
                        claims={financeReviewClaims}
                        emptyMessage="無待財務核核項目"
                        onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                        availableUsers={availableUsers}
                        loading={isClaimsLoading}
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
                            loading={isClaimsLoading}
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
                            totalPages={allApplicationsPagination?.totalPages || 1}
                            onPageChange={setCurrentPage}
                        />
                        <ClaimTable
                            claims={allApplications}
                            onRowClick={(claim) => router.push(`/claims/${claim.id}`)}
                            availableUsers={availableUsers}
                            loading={isAllApplicationsLoading}
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
                onApprove={handleApproveVendorRequest}
                onReject={handleRejectVendorRequest}
            />

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="card modal-content" style={{ maxWidth: '440px' }}>
                        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>確認付款</h3>
                        <p style={{ marginBottom: '1rem' }}>付款日期</p>
                        <input
                            type="date"
                            className="form-input"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            style={{ marginBottom: '1.5rem' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowPaymentModal(false)}>取消</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirmPayment}>確認付款</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PendingItemsPage() {
    return (
        <Suspense fallback={<div />}> 
            <PendingItemsInner />
        </Suspense>
    );
}
