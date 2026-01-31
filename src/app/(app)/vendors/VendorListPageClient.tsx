'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import VendorListClient from './VendorListClient';
import { useVendors } from '@/context/VendorsContext';
import { User, Vendor, VendorRequest } from '@/types';

interface VendorListPageClientProps {
  currentUser: User;
  initialVendors: Vendor[];
  initialVendorRequests: VendorRequest[];
  initialPagination: any;
  initialQuery: string;
  initialPage: number;
  isFinance: boolean;
}

const PAGE_SIZE = 10;

export default function VendorListPageClient({
  currentUser,
  initialVendors,
  initialVendorRequests,
  initialPagination,
  initialQuery,
  initialPage,
  isFinance
}: VendorListPageClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || initialQuery || '';
  const currentPage = Number.parseInt(searchParams.get('page') || String(initialPage || 1), 10) || 1;

  const {
    vendors,
    vendorRequests,
    isVendorsLoading,
    fetchVendors,
    fetchVendorRequests,
    primeVendorsCache,
    primeVendorRequestsCache
  } = useVendors();

  const [pagination, setPagination] = useState(initialPagination);
  const [vendorsReady, setVendorsReady] = useState(false);
  const [vendorRequestsReady, setVendorRequestsReady] = useState(false);

  useEffect(() => {
    primeVendorsCache({ page: initialPage, pageSize: PAGE_SIZE, query: initialQuery }, initialVendors, initialPagination);
    setVendorsReady(true);
    if (isFinance) {
      primeVendorRequestsCache({ page: 1, pageSize: 50 }, initialVendorRequests, { currentPage: 1, pageSize: 50 });
      setVendorRequestsReady(true);
    }
  }, [initialPage, initialPagination, initialQuery, initialVendors, initialVendorRequests, isFinance, primeVendorsCache, primeVendorRequestsCache]);

  useEffect(() => {
    let isActive = true;
    fetchVendors({ page: currentPage, pageSize: PAGE_SIZE, query, cache: true })
      .then(res => {
        if (!isActive) return;
        if (res?.pagination) setPagination(res.pagination);
        setVendorsReady(true);
      });
    if (isFinance) {
      fetchVendorRequests({ page: 1, pageSize: 50, cache: true }).then(() => {
        if (!isActive) return;
        setVendorRequestsReady(true);
      });
    }
    return () => {
      isActive = false;
    };
  }, [currentPage, query, isFinance, fetchVendors, fetchVendorRequests]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fetchVendors({ page: currentPage, pageSize: PAGE_SIZE, query, cache: false }).then(() => {
          setVendorsReady(true);
        });
        if (isFinance) {
          fetchVendorRequests({ page: 1, pageSize: 50, cache: false }).then(() => {
            setVendorRequestsReady(true);
          });
        }
      }, 800);
    };
    window.addEventListener('vendors:refresh', handleRefresh as EventListener);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('vendors:refresh', handleRefresh as EventListener);
    };
  }, [currentPage, query, isFinance, fetchVendors, fetchVendorRequests]);

  const mergedVendorRequests = useMemo(() => (isFinance ? vendorRequests : []), [isFinance, vendorRequests]);

  return (
    <VendorListClient
      currentUser={currentUser}
      vendors={vendorsReady ? vendors : initialVendors}
      vendorRequests={vendorRequestsReady ? mergedVendorRequests : initialVendorRequests}
      pagination={pagination || initialPagination}
      isLoading={isVendorsLoading}
    />
  );
}
