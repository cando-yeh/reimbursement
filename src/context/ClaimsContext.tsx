'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Claim, Payment } from '../types';
import { createClaim as createClaimAction, updateClaim as updateClaimAction, updateClaimStatus as updateClaimStatusAction, deleteClaim as deleteClaimAction, getClaims, getMyClaimCounts as getMyClaimCountsAction, getDashboardData as getDashboardDataAction } from '@/app/actions/claims';
import { useAuth } from './AuthContext';
import { todayISO } from '@/utils/date';

// --- Types ---
interface ClaimsContextType {
    claims: Claim[];
    payments: Payment[];
    isDataLoading: boolean;
    fetchClaims: (filters?: { status?: string | string[], applicantId?: string, page?: number, pageSize?: number, cache?: boolean, type?: string, payee?: string }) => Promise<{ data: Claim[], pagination: any } | null>;
    fetchDashboardData: (filters: { applicantId: string; status?: string | string[]; page?: number; pageSize?: number }) => Promise<{ counts: { drafts: number; evidence: number; returned: number; inReview: number; pendingPayment: number; closed: number }; claims: Claim[]; pagination: any } | null>;
    addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status' | 'lineItems'> & { amount?: number; status?: Claim['status']; items?: any[] }) => Promise<Claim | null>;
    updateClaim: (id: string, data: Partial<Claim> & { items?: any[] }, note?: string) => Promise<void>;
    updateClaimStatus: (id: string, newStatus: Claim['status'], note?: string) => Promise<void>;
    deleteClaim: (id: string) => Promise<void>;
    getMyClaimCounts: (applicantId: string) => Promise<{ drafts: number, evidence: number, returned: number, inReview: number, pendingPayment: number, closed: number } | null>;
    addPayment: (payee: string, claimIds: string[], paymentDate: string) => Payment;
    cancelPayment: (paymentId: string) => void;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

// --- Provider ---
export function ClaimsProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();

    const [claims, setClaims] = useState<Claim[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const claimsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleClaimsRefresh = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (claimsRefreshTimerRef.current) {
            clearTimeout(claimsRefreshTimerRef.current);
        }
        claimsRefreshTimerRef.current = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('claims:refresh'));
        }, 800);
    }, []);

    // --- Fetch Functions ---
    const fetchClaims = useCallback(async (filters?: { status?: string | string[], applicantId?: string, page?: number, pageSize?: number, cache?: boolean, type?: string, payee?: string }) => {
        setIsDataLoading(true);
        try {
            const result = await getClaims(filters);
            if (result.success && result.data) {
                setClaims(result.data);
                return { data: result.data, pagination: result.pagination };
            }
            return null;
        } catch (error) {
            console.error('Error fetching claims:', error);
            return null;
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    const fetchDashboardData = useCallback(async (filters: { applicantId: string; status?: string | string[]; page?: number; pageSize?: number }) => {
        setIsDataLoading(true);
        try {
            const result = await getDashboardDataAction(filters);
            if (result.success && result.data) {
                setClaims(result.data.claims);
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return null;
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    // --- Claim Actions ---
    const addClaim = useCallback(async (claimData: Omit<Claim, 'id' | 'amount' | 'status' | 'lineItems'> & { amount?: number; status?: Claim['status']; items?: any[] }) => {
        const calculatedAmount = claimData.amount !== undefined
            ? claimData.amount
            : (claimData.items || []).reduce((sum: number, item: any) => sum + item.amount, 0);

        const tempId = `temp-${Date.now()}`;
        const itemsForOptimistic = (claimData.items || []) as any[];
        const optimisticClaim: Claim = {
            ...claimData,
            id: tempId,
            amount: calculatedAmount,
            status: claimData.status || 'draft',
            lineItems: itemsForOptimistic.map(i => ({ ...i, date: i.date || todayISO() })),
            date: claimData.date || todayISO(),
            applicantId: currentUser?.id || 'unknown',
            history: []
        } as any;

        setClaims(prev => [optimisticClaim, ...prev]);

        const result = await createClaimAction({
            ...claimData,
            amount: calculatedAmount,
            status: claimData.status as any,
            lineItems: claimData.items || []
        });

        if (result.success && result.data) {
            setClaims(prev => prev.map(c => c.id === tempId ? (result.data as Claim) : c));
            scheduleClaimsRefresh();
            return result.data as Claim;
        } else {
            setClaims(prev => prev.filter(c => c.id !== tempId));
            alert('建立申請單失敗: ' + result.error);
            return null;
        }
    }, [currentUser?.id, scheduleClaimsRefresh]);

    const updateClaim = useCallback(async (id: string, data: Partial<Claim> & { items?: any[] }, note?: string) => {
        const { items: _, ...restData } = data;
        setClaims(prev => prev.map(c => c.id === id ? {
            ...c,
            ...restData,
            lineItems: data.items ? data.items.map(i => ({ ...i })) : c.lineItems
        } : c));

        const result = await updateClaimAction(id, {
            ...restData,
            lineItems: data.items
        });

        if (result.success && result.data) {
            setClaims(prev => prev.map(c => c.id === id ? result.data as any as Claim : c));
            scheduleClaimsRefresh();
        } else if (!result.success) {
            console.error('Update Claim Failed:', result.error);
        }
    }, [scheduleClaimsRefresh]);

    const updateClaimStatus = useCallback(async (id: string, newStatus: Claim['status'], note?: string) => {
        setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

        const result = await updateClaimStatusAction(id, newStatus, note);

        if (result.success && result.data) {
            setClaims(prev => prev.map(c => c.id === id ? result.data as any as Claim : c));
            scheduleClaimsRefresh();
        }
    }, [scheduleClaimsRefresh]);

    const deleteClaim = useCallback(async (id: string) => {
        setClaims(prev => prev.filter(c => c.id !== id));
        await deleteClaimAction(id);
    }, []);

    const getMyClaimCounts = useCallback(async (applicantId: string) => {
        const result = await getMyClaimCountsAction(applicantId);
        if (result.success && result.data) {
            return result.data;
        }
        return null;
    }, []);

    // --- Payment Actions ---
    const addPayment = useCallback((payee: string, claimIds: string[], paymentDate: string): Payment => {
        const selectedClaims = claims.filter(c => claimIds.includes(c.id));
        const totalAmount = selectedClaims.reduce((sum, c) => sum + c.amount, 0);

        const newPayment: Payment = {
            id: `p${Date.now()}`,
            payee,
            paymentDate: paymentDate,
            amount: totalAmount,
            claimIds
        };

        setClaims(prev => prev.map(c => {
            if (claimIds.includes(c.id)) {
                const needsEvidence = c.paymentDetails?.invoiceStatus === 'not_yet';
                const nextStatus = needsEvidence ? 'pending_evidence' : 'completed';

                const historyItem = {
                    timestamp: new Date().toISOString(),
                    actorId: currentUser?.id || 'system',
                    actorName: currentUser?.name || 'System',
                    action: 'paid',
                };
                return {
                    ...c,
                    status: nextStatus as 'pending_evidence' | 'completed',
                    datePaid: newPayment.paymentDate,
                    history: [...(c.history || []), historyItem]
                };
            }
            return c;
        }));

        setPayments(prev => [newPayment, ...prev]);
        return newPayment;
    }, [claims, currentUser?.id, currentUser?.name]);

    const cancelPayment = useCallback((paymentId: string) => {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        setClaims(prev => prev.map(c =>
            payment.claimIds.includes(c.id) ? { ...c, status: 'approved', datePaid: undefined } : c
        ));

        setPayments(prev => prev.filter(p => p.id !== paymentId));
    }, [payments]);

    const contextValue = useMemo(() => ({
        claims,
        payments,
        isDataLoading,
        fetchClaims,
        fetchDashboardData,
        addClaim,
        updateClaim,
        updateClaimStatus,
        deleteClaim,
        getMyClaimCounts,
        addPayment,
        cancelPayment,
    }), [
        claims, payments, isDataLoading,
        fetchClaims, fetchDashboardData, addClaim, updateClaim, updateClaimStatus, deleteClaim,
        getMyClaimCounts, addPayment, cancelPayment
    ]);

    return (
        <ClaimsContext.Provider value={contextValue}>
            {children}
        </ClaimsContext.Provider>
    );
}

// --- Hook ---
export function useClaims() {
    const context = useContext(ClaimsContext);
    if (context === undefined) {
        throw new Error('useClaims must be used within a ClaimsProvider');
    }
    return context;
}
