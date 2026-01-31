'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';
import DashboardClient from '@/components/Dashboard/DashboardClient';
import { useAuth } from '@/context/AuthContext';
import { getClaims } from '@/app/actions/claims';
import { Claim } from '@/types';

const MAX_PAGE_SIZE = 500;

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const { currentUser, availableUsers, isAuthLoading } = useAuth();

  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchAllClaims = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const res = await getClaims({
        applicantId: currentUser.id,
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        compact: true,
        cache: true
      });
      if (res.success && res.data) {
        setAllClaims(res.data);
      } else {
        setAllClaims([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  const activeTab = useMemo(() => {
    const currentTab = searchParams.get('tab') || 'drafts';
    const validTabs = ['drafts', 'evidence', 'returned', 'in_review', 'pending_payment', 'closed'];
    return (validTabs.includes(currentTab) ? currentTab : 'drafts') as
      | 'drafts'
      | 'evidence'
      | 'returned'
      | 'in_review'
      | 'pending_payment'
      | 'closed';
  }, [searchParams]);

  const currentPage = useMemo(() => {
    const page = parseInt(searchParams.get('page') || '1');
    return Number.isFinite(page) && page > 0 ? page : 1;
  }, [searchParams]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (lastUserIdRef.current === currentUser.id) return;
    lastUserIdRef.current = currentUser.id;

    fetchAllClaims();
  }, [currentUser?.id, fetchAllClaims]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchAllClaims();
      }, 800);
    };
    window.addEventListener('claims:refresh', handleRefresh as EventListener);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('claims:refresh', handleRefresh as EventListener);
    };
  }, [fetchAllClaims]);

  if (isAuthLoading || !currentUser) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardClient
      activeTab={activeTab}
      currentPage={currentPage}
      claims={allClaims}
      availableUsers={availableUsers}
      isLoading={isLoading}
      onClaimsChange={setAllClaims}
    />
  );
}
