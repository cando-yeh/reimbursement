'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';
import DashboardClient from '@/components/Dashboard/DashboardClient';
import { useAuth } from '@/context/AuthContext';
import { getClaims } from '@/app/actions/claims';
import { Claim } from '@/types';

const MAX_PAGE_SIZE = 500;

export default function DashboardPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, availableUsers, isAuthLoading } = useAuth();

  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);

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

  const fetchAllClaims = useCallback(async (options?: { cache?: boolean }) => {
    if (!currentUser?.id) return;
    const useCache = options?.cache ?? true;
    setIsLoading(true);
    try {
      const res = await getClaims({
        applicantId: currentUser.id,
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        compact: true,
        cache: useCache
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

  useEffect(() => {
    if (!currentUser?.id) return;
    if (lastUserIdRef.current === currentUser.id) return;
    lastUserIdRef.current = currentUser.id;
    fetchAllClaims();
  }, [currentUser?.id, fetchAllClaims]);

  useEffect(() => {
    const refreshFlag = searchParams.get('refresh') === '1';
    if (!refreshFlag) return;
    fetchAllClaims({ cache: false }).finally(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('refresh');
      router.replace(`/?${params.toString()}`);
    });
  }, [searchParams, fetchAllClaims, router]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOptimistic = (event: Event) => {
      const custom = event as CustomEvent<{ claim: Claim }>;
      const claim = custom.detail?.claim;
      if (!claim) return;
      setAllClaims(prev => {
        const idx = prev.findIndex(c => c.id === claim.id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = claim;
          return next;
        }
        return [claim, ...prev];
      });
    };
    window.addEventListener('claims:optimistic', handleOptimistic as EventListener);
    return () => {
      window.removeEventListener('claims:optimistic', handleOptimistic as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAllClaims();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
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
