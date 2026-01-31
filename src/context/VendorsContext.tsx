'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Vendor, VendorRequest } from '../types';
import { createVendorRequest, getVendorRequests, getVendors, approveVendorRequest as approveVendorRequestAction } from '@/app/actions/vendors';
import { formatVendorRequests } from '@/utils/vendorHelpers';
import { useAuth } from './AuthContext';
import { todayISO } from '@/utils/date';

// --- Types ---
interface VendorsContextType {
    vendors: Vendor[];
    vendorRequests: VendorRequest[];
    isVendorsLoading: boolean;
    fetchVendors: (params?: { page?: number; pageSize?: number; query?: string; cache?: boolean; staleMs?: number }) => Promise<{ data: Vendor[], pagination: any } | null>;
    fetchVendorRequests: (params?: { page?: number; pageSize?: number; cache?: boolean; staleMs?: number }) => Promise<{ data: VendorRequest[], pagination: any } | null>;
    primeVendorsCache: (params: { page?: number; pageSize?: number; query?: string }, data: Vendor[], pagination: any) => void;
    primeVendorRequestsCache: (params: { page?: number; pageSize?: number }, data: VendorRequest[], pagination: any) => void;
    requestAddVendor: (vendor: Omit<Vendor, 'id'>) => Promise<boolean>;
    requestUpdateVendor: (id: string, data: Partial<Vendor>) => Promise<boolean>;
    requestDeleteVendor: (id: string) => Promise<boolean>;
    approveVendorRequest: (requestId: string) => Promise<void>;
    rejectVendorRequest: (requestId: string) => Promise<void>;
}

const VendorsContext = createContext<VendorsContextType | undefined>(undefined);

// --- Provider ---
export function VendorsProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
    const [isVendorsLoading, setIsVendorsLoading] = useState(false);
    const vendorsCacheRef = useRef<Map<string, { data: Vendor[]; pagination: any; timestamp: number }>>(new Map());
    const vendorRequestsCacheRef = useRef<Map<string, { data: VendorRequest[]; pagination: any; timestamp: number }>>(new Map());
    const vendorsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const buildVendorsCacheKey = (params?: { page?: number; pageSize?: number; query?: string }) => {
        const page = params?.page || 1;
        const pageSize = params?.pageSize || 10;
        const query = params?.query?.trim() || '';
        return `vendors:${query || 'all'}:${page}:${pageSize}`;
    };

    const buildVendorRequestsCacheKey = (params?: { page?: number; pageSize?: number }) => {
        const page = params?.page || 1;
        const pageSize = params?.pageSize || 10;
        return `vendorRequests:${page}:${pageSize}`;
    };

    const scheduleVendorsRefresh = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (vendorsRefreshTimerRef.current) {
            clearTimeout(vendorsRefreshTimerRef.current);
        }
        vendorsRefreshTimerRef.current = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('vendors:refresh'));
        }, 800);
    }, []);

    // --- Fetch Functions ---
    const fetchVendors = useCallback(async (params?: { page?: number; pageSize?: number; query?: string; cache?: boolean; staleMs?: number }) => {
        const useCache = params?.cache ?? true;
        const staleMs = params?.staleMs ?? 30_000;
        const cacheKey = buildVendorsCacheKey(params);
        if (useCache) {
            const cached = vendorsCacheRef.current.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < staleMs) {
                setVendors(cached.data);
                return { data: cached.data, pagination: cached.pagination };
            }
        }
        setIsVendorsLoading(true);
        try {
            const result = await getVendors(params);
            if (result.success && result.data) {
                vendorsCacheRef.current.set(cacheKey, { data: result.data, pagination: result.pagination, timestamp: Date.now() });
                setVendors(result.data);
                return { data: result.data, pagination: result.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching vendors:', error);
            return null;
        } finally {
            setIsVendorsLoading(false);
        }
    }, []);

    const fetchVendorRequests = useCallback(async (params?: { page?: number; pageSize?: number; cache?: boolean; staleMs?: number }) => {
        const useCache = params?.cache ?? true;
        const staleMs = params?.staleMs ?? 30_000;
        const cacheKey = buildVendorRequestsCacheKey(params);
        if (useCache) {
            const cached = vendorRequestsCacheRef.current.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < staleMs) {
                setVendorRequests(cached.data);
                return { data: cached.data, pagination: cached.pagination };
            }
        }
        try {
            const result = await getVendorRequests(params);
            if (result.success && result.data) {
                const formattedRequests = formatVendorRequests(result.data);
                vendorRequestsCacheRef.current.set(cacheKey, { data: formattedRequests, pagination: result.pagination, timestamp: Date.now() });
                setVendorRequests(formattedRequests);
                return { data: formattedRequests, pagination: result.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching vendor requests:', error);
            return null;
        }
    }, []);

    const primeVendorsCache = useCallback((params: { page?: number; pageSize?: number; query?: string }, data: Vendor[], pagination: any) => {
        const cacheKey = buildVendorsCacheKey(params);
        vendorsCacheRef.current.set(cacheKey, { data, pagination, timestamp: Date.now() });
        setVendors(data);
    }, []);

    const primeVendorRequestsCache = useCallback((params: { page?: number; pageSize?: number }, data: VendorRequest[], pagination: any) => {
        const cacheKey = buildVendorRequestsCacheKey(params);
        vendorRequestsCacheRef.current.set(cacheKey, { data, pagination, timestamp: Date.now() });
        setVendorRequests(data);
    }, []);

    // Helper to sync vendor requests from server
    const syncVendorRequests = useCallback(async () => {
        const { success, data } = await getVendorRequests();
        if (success && data) {
            setVendorRequests(formatVendorRequests(data));
        }
    }, []);

    // --- Vendor Request Actions ---
    const requestAddVendor = useCallback(async (vendor: Omit<Vendor, 'id'>) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticRequest: any = {
            id: tempId,
            type: 'add',
            status: 'pending',
            timestamp: todayISO(),
            data: vendor,
            applicantId: currentUser?.id,
            applicantName: currentUser?.name
        };

        setVendorRequests(prev => [optimisticRequest, ...prev]);

        const result = await createVendorRequest({ type: 'add', data: vendor });
        if (result.success) {
            await syncVendorRequests();
            await fetchVendors();
            scheduleVendorsRefresh();
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, fetchVendors, syncVendorRequests, scheduleVendorsRefresh]);

    const requestUpdateVendor = useCallback(async (id: string, data: Partial<Vendor>) => {
        const existingVendor = vendors.find(v => v.id === id);
        const tempId = `temp-${Date.now()}`;
        const optimisticRequest: any = {
            id: tempId,
            type: 'update',
            status: 'pending',
            vendorId: id,
            timestamp: todayISO(),
            data: data,
            originalData: existingVendor,
            applicantId: currentUser?.id,
            applicantName: currentUser?.name
        };

        setVendorRequests(prev => [optimisticRequest, ...prev]);

        const result = await createVendorRequest({
            type: 'update',
            vendorId: id,
            data: data,
            originalData: existingVendor
        });

        if (result.success) {
            await syncVendorRequests();
            scheduleVendorsRefresh();
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, vendors, syncVendorRequests, scheduleVendorsRefresh]);

    const requestDeleteVendor = useCallback(async (id: string) => {
        const vendor = vendors.find(v => v.id === id);
        const tempId = `temp-${Date.now()}`;
        const optimisticRequest: any = {
            id: tempId,
            type: 'delete',
            status: 'pending',
            vendorId: id,
            timestamp: todayISO(),
            data: {},
            originalData: vendor,
            applicantId: currentUser?.id,
            applicantName: currentUser?.name
        };

        setVendorRequests(prev => [optimisticRequest, ...prev]);

        const result = await createVendorRequest({
            type: 'delete',
            vendorId: id,
            originalData: vendor,
            data: {}
        });

        if (result.success) {
            await syncVendorRequests();
            scheduleVendorsRefresh();
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, vendors, syncVendorRequests, scheduleVendorsRefresh]);

    const approveVendorRequest = useCallback(async (requestId: string) => {
        const request = vendorRequests.find(r => r.id === requestId);
        if (!request) return;

        // Optimistic update
        setVendorRequests(prev => prev.map(r =>
            r.id === requestId ? { ...r, status: 'approved' } : r
        ));

        if (request.type === 'add' && request.data) {
            setVendors(prev => [...prev, { ...request.data, id: `temp-${Date.now()}` } as Vendor]);
        } else if (request.type === 'update' && request.vendorId && request.data) {
            setVendors(prev => prev.map(v =>
                v.id === request.vendorId ? { ...v, ...request.data } as Vendor : v
            ));
        } else if (request.type === 'delete' && request.vendorId) {
            setVendors(prev => prev.filter(v => v.id !== request.vendorId));
        }

        const result = await approveVendorRequestAction(requestId, 'approve');

        if (result?.success) {
            await syncVendorRequests();
            await fetchVendors();
            scheduleVendorsRefresh();
        } else {
            await fetchVendors();
            await syncVendorRequests();
            alert('審核失敗');
        }
    }, [vendorRequests, fetchVendors, syncVendorRequests, scheduleVendorsRefresh]);

    const rejectVendorRequest = useCallback(async (requestId: string) => {
        setVendorRequests(prev => prev.map(r =>
            r.id === requestId ? { ...r, status: 'rejected' } : r
        ));

        const result = await approveVendorRequestAction(requestId, 'reject');

        if (result?.success) {
            await syncVendorRequests();
            await fetchVendors();
            scheduleVendorsRefresh();
        } else {
            await syncVendorRequests();
            alert('審核失敗');
        }
    }, [fetchVendors, syncVendorRequests, scheduleVendorsRefresh]);

    const contextValue = useMemo(() => ({
        vendors,
        vendorRequests,
        isVendorsLoading,
        fetchVendors,
        fetchVendorRequests,
        primeVendorsCache,
        primeVendorRequestsCache,
        requestAddVendor,
        requestUpdateVendor,
        requestDeleteVendor,
        approveVendorRequest,
        rejectVendorRequest,
    }), [
        vendors, vendorRequests, isVendorsLoading,
        fetchVendors, fetchVendorRequests, primeVendorsCache, primeVendorRequestsCache,
        requestAddVendor, requestUpdateVendor, requestDeleteVendor,
        approveVendorRequest, rejectVendorRequest
    ]);

    return (
        <VendorsContext.Provider value={contextValue}>
            {children}
        </VendorsContext.Provider>
    );
}

// --- Hook ---
export function useVendors() {
    const context = useContext(VendorsContext);
    if (context === undefined) {
        throw new Error('useVendors must be used within a VendorsProvider');
    }
    return context;
}
