'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import DashboardClient from '@/components/Dashboard/DashboardClient';
import { useSearchParams, useRouter } from 'next/navigation';
import PageSkeleton from '@/components/Common/PageSkeleton';

// Client Component
export default function Dashboard() {
  const { currentUser, claims, availableUsers, payments, isAuthLoading, isDataLoading } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Auth Redirection is now handled in AppContext/Layout, 
  // but we can do a quick check here too or just show skeleton.
  if (isAuthLoading || isDataLoading) {
    return <PageSkeleton />;
  }

  if (!currentUser) {
    // Should be redirected by logic elsewhere, but render nothing or skeleton
    return <PageSkeleton />;
  }

  const currentTab = searchParams.get('tab');
  const activeTab = (currentTab && ['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'closed'].includes(currentTab))
    ? currentTab as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'closed'
    : 'drafts';

  // Filter Logic:
  // "My Claims" strictly filters for claims applied by the current user.
  // Administrative views are handled in the Reviews page.
  const myClaims = claims.filter(c => c.applicantId === currentUser.id);

  const drafts = myClaims.filter(c => c.status === 'draft');
  const pendingEvidence = myClaims.filter(c => c.status === 'pending_evidence');
  const returned = myClaims.filter(c => c.status === 'rejected');
  const inReview = myClaims.filter(c =>
    ['pending_approval', 'pending_finance', 'pending_finance_review'].includes(c.status)
  );
  const pendingPayment = myClaims.filter(c => c.status === 'approved');
  const closed = myClaims.filter(c => ['completed', 'cancelled'].includes(c.status));

  return (
    <DashboardClient
      activeTab={activeTab}
      data={{ drafts, pendingEvidence, returned, inReview, pendingPayment, closed }}
      payments={payments}
      availableUsers={availableUsers}
    />
  );
}
