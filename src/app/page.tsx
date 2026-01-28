import React from 'react';
import { getClaims } from './actions/claims';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { User } from '@/types';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/Dashboard/DashboardClient';

// Mock payments for now
const payments: any[] = [];
// Mock availableUsers for now
const availableUsers: User[] = [];

// Server Component
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const currentTab = params.tab as string;
  const activeTab = (currentTab && ['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'completed'].includes(currentTab))
    ? currentTab as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'completed'
    : 'drafts';

  // Fetch DB User for permissions
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email || '' }
  });

  if (!dbUser) {
    return <div className="p-8">找不到使用者資料，請聯絡管理員。</div>;
  }

  // Fetch Claims
  const result = await getClaims();
  const allClaims = result.data || [];

  // Filter Logic:
  // 1. Regular users only see their own claims.
  // 2. Finance ('財務') and Manager ('管理者') see all claims.
  // 3. Approvers? In the pending items they should see subordinates' claims, 
  //    but for "My Claims" (this page), it usually only shows their own submissions.

  // Check based on permissions or role name containing key terms
  const isPrivileged =
    (dbUser.permissions && (dbUser.permissions.includes('finance_audit') || dbUser.permissions.includes('user_management'))) ||
    dbUser.roleName.includes('財務') ||
    dbUser.roleName.includes('管理者');

  const myClaims = isPrivileged ? allClaims : allClaims.filter(c => c.applicantId === dbUser.id);

  const drafts = myClaims.filter(c => c.status === 'draft');
  const pendingEvidence = myClaims.filter(c => c.status === 'pending_evidence');
  const returned = myClaims.filter(c => c.status === 'rejected');
  const inReview = myClaims.filter(c =>
    ['pending_approval', 'pending_finance', 'pending_finance_review'].includes(c.status)
  );
  const pendingPayment = myClaims.filter(c => c.status === 'approved');
  const completed = myClaims.filter(c => c.status === 'completed');

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <DashboardClient
        activeTab={activeTab}
        data={{ drafts, pendingEvidence, returned, inReview, pendingPayment, completed }}
        payments={payments}
        availableUsers={availableUsers}
      />
    </div>
  );
}
