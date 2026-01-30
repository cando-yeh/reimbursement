import React, { cache } from 'react';
import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';
import { getCurrentUser, getDashboardData } from '@/app/actions/claims';
import { getDBUserByEmail, getDBUsers } from '@/app/actions/users';
import { Claim, Permission, User } from '@/types';

// Dynamic import for code splitting - DashboardClient loads lazily
const DashboardClient = dynamic(() => import('@/components/Dashboard/DashboardClient'), {
  loading: () => <DashboardSkeleton />,
});

const getDBUserByEmailCached = cache(async (email: string) => getDBUserByEmail(email));
const getDBUsersCached = cache(async () => getDBUsers());

// Server Component
export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentTab = resolvedSearchParams?.tab || 'drafts';
  const currentPage = parseInt(resolvedSearchParams?.page || '1');
  const activeTab = (['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'closed'].includes(currentTab))
    ? currentTab as 'drafts' | 'evidence' | 'returned' | 'in_review' | 'pending_payment' | 'closed'
    : 'drafts';

  const user = await getCurrentUser();
  if (!user?.email) {
    return <DashboardSkeleton />;
  }

  const dbUserResult = await getDBUserByEmailCached(user.email);
  const dbUser = dbUserResult.success ? dbUserResult.data : null;
  if (!dbUser?.id) {
    return <DashboardSkeleton />;
  }

  const statusMap: Record<string, string | string[]> = {
    'drafts': 'draft',
    'evidence': 'pending_evidence',
    'returned': 'rejected',
    'in_review': ['pending_approval', 'pending_finance', 'pending_finance_review'],
    'pending_payment': 'approved',
    'closed': ['completed', 'cancelled']
  };

  const [dashboardResult, usersResult] = await Promise.all([
    getDashboardData({
      applicantId: dbUser.id,
      status: statusMap[activeTab],
      page: currentPage,
      pageSize: 10
    }),
    getDBUsersCached()
  ]);

  const claims = dashboardResult.success && dashboardResult.data ? dashboardResult.data.claims : [];
  const pagination = dashboardResult.success && dashboardResult.data ? dashboardResult.data.pagination : null;
  const counts = dashboardResult.success && dashboardResult.data ? dashboardResult.data.counts : null;

  const availableUsers: User[] = usersResult.success && usersResult.data
    ? usersResult.data.map((u: any) => ({
      id: u.id,
      name: u.name,
      roleName: u.roleName,
      permissions: (u.permissions || []) as Permission[],
      email: u.email,
      approverId: u.approverId || undefined,
    }))
    : [];

  return (
    <DashboardClient
      activeTab={activeTab}
      data={claims as Claim[]}
      pagination={pagination}
      counts={counts}
      payments={[]}
      availableUsers={availableUsers}
      isLoading={false}
    />
  );
}
