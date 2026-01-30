'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
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
    fetchVendors: (params?: { page?: number; pageSize?: number; query?: string }) => Promise<{ data: Vendor[], pagination: any } | null>;
    fetchVendorRequests: (params?: { page?: number; pageSize?: number }) => Promise<{ data: VendorRequest[], pagination: any } | null>;
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

    // --- Fetch Functions ---
    const fetchVendors = useCallback(async (params?: { page?: number; pageSize?: number; query?: string }) => {
        setIsVendorsLoading(true);
        try {
            const result = await getVendors(params);
            if (result.success && result.data) {
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

    const fetchVendorRequests = useCallback(async (params?: { page?: number; pageSize?: number }) => {
        try {
            const result = await getVendorRequests(params);
            if (result.success && result.data) {
                const formattedRequests = formatVendorRequests(result.data);
                setVendorRequests(formattedRequests);
                return { data: formattedRequests, pagination: result.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching vendor requests:', error);
            return null;
        }
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
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, fetchVendors, syncVendorRequests]);

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
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, vendors, syncVendorRequests]);

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
            return true;
        } else {
            setVendorRequests(prev => prev.filter(r => r.id !== tempId));
            alert('申請失敗: ' + result.error);
            return false;
        }
    }, [currentUser?.id, currentUser?.name, vendors, syncVendorRequests]);

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
        } else {
            await fetchVendors();
            await syncVendorRequests();
            alert('審核失敗');
        }
    }, [vendorRequests, fetchVendors, syncVendorRequests]);

    const rejectVendorRequest = useCallback(async (requestId: string) => {
        setVendorRequests(prev => prev.map(r =>
            r.id === requestId ? { ...r, status: 'rejected' } : r
        ));

        const result = await approveVendorRequestAction(requestId, 'reject');

        if (result?.success) {
            await syncVendorRequests();
            await fetchVendors();
        } else {
            await syncVendorRequests();
            alert('審核失敗');
        }
    }, [fetchVendors, syncVendorRequests]);

    const contextValue = useMemo(() => ({
        vendors,
        vendorRequests,
        isVendorsLoading,
        fetchVendors,
        fetchVendorRequests,
        requestAddVendor,
        requestUpdateVendor,
        requestDeleteVendor,
        approveVendorRequest,
        rejectVendorRequest,
    }), [
        vendors, vendorRequests, isVendorsLoading,
        fetchVendors, fetchVendorRequests,
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
