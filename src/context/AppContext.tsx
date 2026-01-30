'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Vendor, Claim, VendorRequest, User, Payment } from '../types';
import { createVendorRequest, getVendorRequests, getVendors, approveVendorRequest as approveVendorRequestAction } from '@/app/actions/vendors';
import { updateUser as updateUserAction, deleteUser as deleteUserAction, getDBUsers } from '@/app/actions/users';
import { createClaim as createClaimAction, updateClaim as updateClaimAction, updateClaimStatus as updateClaimStatusAction, deleteClaim as deleteClaimAction, getClaims, getMyClaimCounts as getMyClaimCountsAction } from '@/app/actions/claims';

interface AppContextType {
  vendors: Vendor[];
  claims: Claim[];
  vendorRequests: VendorRequest[];
  payments: Payment[];
  fetchVendors: (params?: { page?: number; pageSize?: number }) => Promise<{ data: Vendor[], pagination: any } | null>;
  fetchClaims: (filters?: { status?: string, applicantId?: string, page?: number, pageSize?: number }) => Promise<{ data: Claim[], pagination: any } | null>;
  fetchVendorRequests: (params?: { page?: number; pageSize?: number }) => Promise<{ data: VendorRequest[], pagination: any } | null>;
  addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status' | 'lineItems'> & { amount?: number; status?: Claim['status']; items?: any[] }) => Promise<Claim | null>;
  updateClaim: (id: string, data: Partial<Claim> & { items?: any[] }, note?: string) => Promise<void>;
  updateClaimStatus: (id: string, newStatus: Claim['status'], note?: string) => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;
  getMyClaimCounts: (applicantId: string) => Promise<{ drafts: number, evidence: number, returned: number, inReview: number, pendingPayment: number, closed: number } | null>;
  addPayment: (payee: string, claimIds: string[], paymentDate: string) => Payment;
  cancelPayment: (paymentId: string) => void;
  requestAddVendor: (vendor: Omit<Vendor, 'id'>) => Promise<boolean>;
  requestUpdateVendor: (id: string, data: Partial<Vendor>) => Promise<boolean>;
  requestDeleteVendor: (id: string) => Promise<boolean>;
  approveVendorRequest: (requestId: string) => Promise<void>;
  rejectVendorRequest: (requestId: string) => Promise<void>;
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  isVendorsLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Static supabase client to prevent re-creation and infinite loops
const supabase = createClient();

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // State initialization
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);
  const availableUsersRef = useRef<User[]>([]);

  // Sync ref with state for use in event listeners
  useEffect(() => {
    availableUsersRef.current = availableUsers;
  }, [availableUsers]);
  const isInitialLoad = useRef(true);

  // Initial Data Load (Auth only, data is fetched in separate useEffect)
  useEffect(() => {
    if (!isInitialLoad.current) return;

    setIsInitialized(true);
    isInitialLoad.current = false;
  }, []);

  // 6. Targeted Fetch Functions
  const fetchClaims = useCallback(async (filters?: { status?: string, applicantId?: string, page?: number, pageSize?: number }) => {
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

  const fetchVendors = useCallback(async (params?: { page?: number; pageSize?: number }) => {
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
        const formattedRequests = result.data.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data,
          originalData: r.originalData
        }));
        setVendorRequests(formattedRequests);
        return { data: formattedRequests, pagination: result.pagination };
      }
      return null;
    } catch (error) {
      console.error('Error fetching vendor requests:', error);
      return null;
    }
  }, []);

  // 3. Keep track of Auth status separately
  useEffect(() => {
    setIsAuthenticated(!!currentUser);
  }, [currentUser]);

  // 4. Supabase Auth Integration (Stabilized)
  useEffect(() => {
    const handleAuthChange = async (sessionUser: any) => {

      if (!sessionUser) {
        setCurrentUser(null);
        return;
      }

      // 1. First, check what we have in memory
      const users = availableUsersRef.current;
      const foundUser = users.find(u => u.id === sessionUser.id || (u.email && u.email.toLowerCase() === sessionUser.email?.toLowerCase()));

      if (foundUser) {
        // If found in memory, use it
        setCurrentUser(foundUser);
      } else {
        // If NOT in memory, set a minimal user and trigger DB sync immediately
        const minimalUser: User = {
          id: sessionUser.id,
          name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Unknown',
          email: sessionUser.email || '',
          roleName: '讀取中...',
          permissions: ['general'],
        };
        setCurrentUser(minimalUser);
      }

      // 2. Trigger DB sync, passing auth email to avoid re-fetching
      fetchDBUsers(sessionUser.email);
    };

    // Check initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        await handleAuthChange(user);
      }
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {

      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthChange(session.user);
        // Only redirect if on login page and not already navigating
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          router.refresh();
          router.push('/');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        router.refresh();
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);
  // supabase is now static, availableUsers is used via functional update or closure (ref would be better but this is fine)

  // 5. Fetch Users from DB (accepts optional authEmail to avoid redundant auth check)
  const fetchDBUsers = useCallback(async (authEmail?: string) => {
    try {
      const { data, success } = await getDBUsers();
      if (success && data && data.length > 0) {
        setAvailableUsers(prev => {
          const dbUsers = data as User[];
          const userMap = new Map();
          prev.forEach(u => userMap.set(u.id, u));
          dbUsers.forEach(u => userMap.set(u.id, u));
          dbUsers.forEach(u => {
            if (u.email) {
              const existingByEmail = Array.from(userMap.values()).find((ex: any) => ex.email === u.email);
              if (existingByEmail && existingByEmail.id !== u.id) {
                userMap.delete(existingByEmail.id);
                userMap.set(u.id, u);
              }
            }
          });

          const result = Array.from(userMap.values());
          // Only update if count or IDs changed to prevent shallow object comparison re-renders
          if (prev.length === result.length && prev.every((u, i) => u.id === result[i].id)) {
            return prev;
          }
          return result;
        });

        // Use passed authEmail if available, otherwise fetch from supabase
        let currentEmail = authEmail;
        if (!currentEmail) {
          const authData = await supabase.auth.getUser();
          currentEmail = authData.data.user?.email;
        }

        if (currentEmail) {
          const dbUser = (data as User[]).find(u => u.email?.toLowerCase() === currentEmail!.toLowerCase());

          if (dbUser) {
            setCurrentUser(prevUser => {
              if (!prevUser) return dbUser;
              const hasChanges =
                dbUser.id !== prevUser.id ||
                dbUser.roleName !== prevUser.roleName ||
                JSON.stringify(dbUser.permissions) !== JSON.stringify(prevUser.permissions) ||
                dbUser.name !== prevUser.name ||
                dbUser.approverId !== prevUser.approverId;

              if (hasChanges) {
                return dbUser;
              }
              return prevUser;
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch users from DB:', err);
    }
  }, []);

  useEffect(() => {
    // Only fetch users if not on login page
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      fetchDBUsers();
    }
  }, [isAuthenticated, fetchDBUsers]);

  // --- App Actions ---

  const login = useCallback((userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      router.push('/');
    }
  }, [availableUsers, router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  const switchUser = useCallback((userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  }, [availableUsers]);

  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    // Optimistic update
    setAvailableUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
    // Server update
    const result = await updateUserAction(id, updates);
    if (result.success) {
      // Re-sync after success to handle any DB-level logic or triggers
      await fetchDBUsers();
    } else {
      // If it failed, we should ideally revert, but for now we re-sync from DB
      await fetchDBUsers();
    }
    return result;
  }, [currentUser?.id, fetchDBUsers]);

  const deleteUser = useCallback(async (id: string) => {
    // Optimistic update
    setAvailableUsers(prev => prev.filter(u => u.id !== id));

    // Server update
    const result = await deleteUserAction(id);
    if (!result.success) {
      console.error('Failed to delete user from DB:', result.error);
      alert('刪除失敗，請重試');
      await fetchDBUsers(); // Re-sync if failed
    }

    if (currentUser?.id === id) logout();
  }, [currentUser?.id, fetchDBUsers, logout]);

  const addClaim = useCallback(async (claimData: Omit<Claim, 'id' | 'amount' | 'status' | 'lineItems'> & { amount?: number; status?: Claim['status']; items?: any[] }) => {
    // 1. Calculate amount if needed (for server action input)
    const calculatedAmount = claimData.amount !== undefined
      ? claimData.amount
      : (claimData.items || []).reduce((sum: number, item: any) => sum + item.amount, 0);

    // 2. Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const itemsForOptimistic = (claimData.items || []) as any[];
    const optimisticClaim: Claim = {
      ...claimData,
      id: tempId,
      amount: calculatedAmount,
      status: claimData.status || 'draft',
      lineItems: itemsForOptimistic.map(i => ({ ...i, date: i.date || new Date().toISOString().split('T')[0] })),
      date: claimData.date || new Date().toISOString().split('T')[0],
      applicantId: currentUser?.id || 'unknown',
      history: []
    } as any;

    setClaims(prev => [optimisticClaim, ...prev]);

    // 3. Server Action
    const result = await createClaimAction({
      ...claimData,
      amount: calculatedAmount,
      status: claimData.status as any,
      lineItems: claimData.items || []
    });

    if (result.success && result.data) {
      // Replace optimistic claim with real one
      setClaims(prev => prev.map(c => c.id === tempId ? (result.data as Claim) : c));
      return result.data as Claim;
    } else {
      // Revert optimistic update
      setClaims(prev => prev.filter(c => c.id !== tempId));
      alert('建立申請單失敗: ' + result.error);
      return null;
    }
  }, [currentUser?.id]);

  const updateClaim = useCallback(async (id: string, data: Partial<Claim> & { items?: any[] }, note?: string) => {
    // 1. Optimistic Update
    const { items: _, ...restData } = data;
    setClaims(prev => prev.map(c => c.id === id ? {
      ...c,
      ...restData,
      lineItems: data.items ? data.items.map(i => ({ ...i })) : c.lineItems
    } : c));

    // 2. Server Action
    const result = await updateClaimAction(id, {
      ...restData,
      lineItems: data.items
    });

    // 3. Sync with actual server data (handles history/timestamps)
    if (result.success && result.data) {
      setClaims(prev => prev.map(c => c.id === id ? result.data as any as Claim : c));
    } else if (!result.success) {
      console.error('Update Claim Failed:', result.error);
    }
  }, []);

  const updateClaimStatus = useCallback(async (id: string, newStatus: Claim['status'], note?: string) => {
    // 1. Optimistic Update
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

    // 2. Server Action
    const result = await updateClaimStatusAction(id, newStatus, note);

    // 3. Sync
    if (result.success && result.data) {
      setClaims(prev => prev.map(c => c.id === id ? result.data as any as Claim : c));
    }
  }, []);

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

  const requestAddVendor = useCallback(async (vendor: Omit<Vendor, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: any = {
      id: tempId,
      type: 'add',
      status: 'pending',
      timestamp: new Date().toISOString().split('T')[0],
      data: vendor,
      applicantId: currentUser?.id,
      applicantName: currentUser?.name
    };

    setVendorRequests(prev => [optimisticRequest, ...prev]);

    const result = await createVendorRequest({ type: 'add', data: vendor });
    if (result.success) {
      // Background sync
      const { success, data } = await getVendorRequests();
      if (success && data) {
        setVendorRequests(data.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      await fetchVendors();
      return true;
    } else {
      // Revert if failed
      setVendorRequests(prev => prev.filter(r => r.id !== tempId));
      alert('申請失敗: ' + result.error);
      return false;
    }
  }, [currentUser?.id, currentUser?.name, fetchVendors]);

  const requestUpdateVendor = useCallback(async (id: string, data: Partial<Vendor>) => {
    const existingVendor = vendors.find(v => v.id === id);
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: any = {
      id: tempId,
      type: 'update',
      status: 'pending',
      vendorId: id,
      timestamp: new Date().toISOString().split('T')[0],
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
      // Background sync
      const { success, data: reqs } = await getVendorRequests();
      if (success && reqs) {
        setVendorRequests(reqs.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      return true;
    } else {
      // Revert
      setVendorRequests(prev => prev.filter(r => r.id !== tempId));
      alert('申請失敗: ' + result.error);
      return false;
    }
  }, [currentUser?.id, currentUser?.name, vendors]);

  const requestDeleteVendor = useCallback(async (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    const tempId = `temp-${Date.now()}`;
    const optimisticRequest: any = {
      id: tempId,
      type: 'delete',
      status: 'pending',
      vendorId: id,
      timestamp: new Date().toISOString().split('T')[0],
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
      // Background sync
      const { success, data: reqs } = await getVendorRequests();
      if (success && reqs) {
        setVendorRequests(reqs.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      return true;
    } else {
      // Revert
      setVendorRequests(prev => prev.filter(r => r.id !== tempId));
      alert('申請失敗: ' + result.error);
      return false;
    }
  }, [currentUser?.id, currentUser?.name, vendors]);

  const approveVendorRequest = useCallback(async (requestId: string) => {
    // 1. Optimistic Update
    const request = vendorRequests.find(r => r.id === requestId);
    if (!request) return;

    // Mark request as approved
    setVendorRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'approved' } : r
    ));

    // Update Vendors list optimistically based on request type
    if (request.type === 'add' && request.data) {
      setVendors(prev => [...prev, { ...request.data, id: `temp-${Date.now()}` } as Vendor]);
    } else if (request.type === 'update' && request.vendorId && request.data) {
      setVendors(prev => prev.map(v =>
        v.id === request.vendorId ? { ...v, ...request.data } as Vendor : v
      ));
    } else if (request.type === 'delete' && request.vendorId) {
      setVendors(prev => prev.filter(v => v.id !== request.vendorId));
    }

    // 2. Server Action
    const result = await approveVendorRequestAction(requestId, 'approve');

    if (result?.success) {
      // Background re-sync
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      await fetchVendors();
    } else {
      // Revert if failed (simplest is to re-fetch everything)
      await fetchVendors();
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      alert('審核失敗');
    }
  }, [vendorRequests, fetchVendors]);

  const rejectVendorRequest = useCallback(async (requestId: string) => {
    // 1. Optimistic Update
    setVendorRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'rejected' } : r
    ));

    // 2. Server Action
    const result = await approveVendorRequestAction(requestId, 'reject');

    if (result?.success) {
      // Background re-sync
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      await fetchVendors();
    } else {
      // Revert
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      alert('審核失敗');
    }
  }, [fetchVendors]);


  const contextValue = useMemo(() => ({
    vendors,
    claims,
    vendorRequests,
    payments,
    fetchVendors,
    fetchClaims,
    fetchVendorRequests,
    addClaim,
    updateClaim,
    updateClaimStatus,
    deleteClaim,
    getMyClaimCounts,
    addPayment,
    cancelPayment,
    requestAddVendor,
    requestUpdateVendor,
    requestDeleteVendor,
    approveVendorRequest,
    rejectVendorRequest,
    currentUser,
    isAuthenticated,
    login,
    logout,
    switchUser,
    availableUsers,
    updateUser,
    deleteUser,
    refreshUsers: fetchDBUsers,
    isAuthLoading,
    isDataLoading,
    isVendorsLoading
  }), [
    vendors, claims, vendorRequests, payments, fetchVendors, fetchClaims,
    fetchVendorRequests, addClaim, updateClaim, updateClaimStatus, deleteClaim,
    getMyClaimCounts, addPayment, cancelPayment, requestAddVendor,
    requestUpdateVendor, requestDeleteVendor, approveVendorRequest,
    rejectVendorRequest, currentUser, isAuthenticated, login, logout,
    switchUser, availableUsers, updateUser, deleteUser, fetchDBUsers,
    isAuthLoading, isDataLoading, isVendorsLoading
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
