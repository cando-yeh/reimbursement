'use client';

import React, { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import DashboardClient from '@/components/Dashboard/DashboardClient';
import { useSearchParams, useRouter } from 'next/navigation';
import PageSkeleton from '@/components/Common/PageSkeleton';

// Client Component
export default function Dashboard() {
  const { currentUser, claims, availableUsers, payments, isAuthLoading, fetchClaims, getMyClaimCounts } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pagination, setPagination] = React.useState<any>(null);
  const [counts, setCounts] = React.useState<any>(null);
  const [isDataLoading, setIsDataLoading] = React.useState(true);

  const currentTab = searchParams.get('tab') || 'drafts';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const activeTab = (['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'closed'].includes(currentTab))
    ? currentTab as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'closed'
    : 'drafts';

  // Stabilize function references to prevent useEffect re-triggers
  const fetchClaimsRef = useRef(fetchClaims);
  const getMyClaimCountsRef = useRef(getMyClaimCounts);
  useEffect(() => {
    fetchClaimsRef.current = fetchClaims;
    getMyClaimCountsRef.current = getMyClaimCounts;
  });

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      setIsDataLoading(true);

      // 1. Fetch counts for tabs
      const countsResult = await getMyClaimCountsRef.current(currentUser.id);
      if (countsResult) setCounts(countsResult);

      // 2. Fetch specific claims for active tab
      const statusMap: Record<string, string | string[]> = {
        'drafts': 'draft',
        'evidence': 'pending_evidence',
        'returned': 'rejected',
        'in_review': ['pending_approval', 'pending_finance', 'pending_finance_review'],
        'pending_payment': 'approved',
        'closed': ['completed', 'cancelled']
      };

      const filter: any = {
        applicantId: currentUser.id,
        status: statusMap[activeTab],
        page: currentPage,
        pageSize: 10
      };

      const claimsResult = await fetchClaimsRef.current(filter);
      if (claimsResult) {
        setPagination(claimsResult.pagination);
      }
      setIsDataLoading(false);
    };

    fetchData();
  }, [currentUser?.id, activeTab, currentPage]);

  if (isAuthLoading || (isDataLoading && !claims.length)) {
    return <PageSkeleton />;
  }

  if (!currentUser) {
    return <PageSkeleton />;
  }

  return (
    <DashboardClient
      activeTab={activeTab}
      data={claims}
      pagination={pagination}
      counts={counts}
      payments={payments}
      availableUsers={availableUsers}
      isLoading={isDataLoading}
    />
  );
}
