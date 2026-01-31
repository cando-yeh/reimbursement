'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import VendorListClient from './VendorListClient';
import { useVendors } from '@/context/VendorsContext';
import { useAuth } from '@/context/AuthContext';
import { Vendor, VendorRequest } from '@/types';

const PAGE_SIZE = 10;

export default function VendorListPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const currentPage = Number.parseInt(searchParams.get('page') || '1', 10) || 1;
  const { currentUser, isAuthLoading } = useAuth();
  const isFinance = currentUser?.permissions?.includes('finance_audit') || currentUser?.roleName?.includes('財務');

  const {
    vendors,
    vendorRequests,
    isVendorsLoading,
    fetchVendors,
    fetchVendorRequests,
    primeVendorsCache,
    primeVendorRequestsCache
  } = useVendors();

  const [pagination, setPagination] = useState<any>(null);
  const [vendorsReady, setVendorsReady] = useState(false);
  const [vendorRequestsReady, setVendorRequestsReady] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (vendorsReady) return;
    fetchVendors({ page: currentPage, pageSize: PAGE_SIZE, query, cache: true })
      .then(res => {
        if (res?.pagination) setPagination(res.pagination);
        setVendorsReady(true);
      });
    if (isFinance) {
      fetchVendorRequests({ page: 1, pageSize: 50, cache: true }).then(() => {
        setVendorRequestsReady(true);
      });
    }
  }, [currentUser?.id, currentPage, query, isFinance, vendorsReady, fetchVendors, fetchVendorRequests]);

  useEffect(() => {
    if (!currentUser?.id) return;
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
    if (!currentUser?.id) return;
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
  }, [currentUser?.id, currentPage, query, isFinance, fetchVendors, fetchVendorRequests]);

  const mergedVendorRequests = useMemo(() => (isFinance ? vendorRequests : []), [isFinance, vendorRequests]);

  if (isAuthLoading || !currentUser) {
    return (
      <VendorListClient
        currentUser={{ id: '', name: '', roleName: '', permissions: [] }}
        vendors={[]}
        vendorRequests={[]}
        pagination={pagination}
        isLoading
      />
    );
  }

  return (
    <VendorListClient
      currentUser={currentUser}
      vendors={vendorsReady ? vendors : []}
      vendorRequests={vendorRequestsReady ? mergedVendorRequests : []}
      pagination={pagination}
      isLoading={isVendorsLoading}
    />
  );
}
