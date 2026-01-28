'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Vendor, Claim, VendorRequest, User, Payment } from '../types';
import { createVendorRequest, getVendorRequests, getVendors, approveVendorRequest as approveVendorRequestAction } from '@/app/actions/vendors';
import { updateUser as updateUserAction, deleteUser as deleteUserAction } from '@/app/actions/users';
import { createClaim as createClaimAction, updateClaim as updateClaimAction, updateClaimStatus as updateClaimStatusAction, deleteClaim as deleteClaimAction, getClaims } from '@/app/actions/claims';

interface AppContextType {
  vendors: Vendor[];
  claims: Claim[];
  vendorRequests: VendorRequest[];
  payments: Payment[];
  fetchVendors: () => Promise<void>;
  addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => Promise<Claim | null>;
  updateClaim: (id: string, data: Partial<Claim>, note?: string) => Promise<void>;
  updateClaimStatus: (id: string, newStatus: Claim['status'], note?: string) => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;
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

  // 6. Fetch Claims & Vendors from Server when User is authenticated
  useEffect(() => {
    const fetchServerData = async () => {
      if (!currentUser) return;

      console.time('fetchServerData');
      try {
        const [claimsResult, requestsResult] = await Promise.all([
          getClaims(),
          getVendorRequests()
        ]);

        // 1. Claims
        if (claimsResult.success && claimsResult.data) {
          setClaims(claimsResult.data);
        }

        // 2. Vendors (Lazy loaded now)

        // 3. Vendor Requests
        if (requestsResult.success && requestsResult.data) {
          setVendorRequests(requestsResult.data.map((r: any) => ({
            ...r,
            timestamp: new Date(r.timestamp).toISOString().split('T')[0],
            data: r.data,
            originalData: r.originalData
          })));
        }
      } catch (error) {
        console.error('Error fetching server data:', error);
      }
      console.timeEnd('fetchServerData');
    };

    fetchServerData();
  }, [currentUser]);

  // 3. Keep track of Auth status separately
  useEffect(() => {
    setIsAuthenticated(!!currentUser);
  }, [currentUser]);

  // 4. Supabase Auth Integration (Stabilized)
  useEffect(() => {
    const handleAuthChange = async (sessionUser: any) => {
      console.log('--- AppContext: handleAuthChange ---', sessionUser?.email);

      if (!sessionUser) {
        setCurrentUser(null);
        return;
      }

      // Avoid redundant updates
      setCurrentUser(prevUser => {
        if (prevUser?.id === sessionUser.id || (prevUser?.email && prevUser.email === sessionUser.email)) {
          return prevUser;
        }

        // Find existing user or create mock profile
        const users = availableUsersRef.current;
        let foundUser = users.find(u => u.id === sessionUser.id || u.email === sessionUser.email);

        if (!foundUser) {
          foundUser = {
            id: sessionUser.id,
            name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Unknown',
            email: sessionUser.email || '',
            roleName: '一般員工',
            permissions: ['general'],
          };
          setAvailableUsers(prev => [...prev.filter(u => u.id !== foundUser!.id), foundUser!]);
        }

        return foundUser;
      });
    };

    // Check initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        await handleAuthChange(user);
      }
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('--- AppContext: onAuthStateChange ---', event, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthChange(session.user);
        // Only redirect if on login page and not already navigating
        if (window.location.pathname === '/login') {
          router.refresh();
          router.push('/');
        }
      } else if (event === 'SIGNED_OUT') {
        handleAuthChange(null);
        router.refresh();
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]); // supabase is now static, availableUsers is used via functional update or closure (ref would be better but this is fine)

  // 5. Fetch Users from DB
  const fetchDBUsers = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase.from('User').select('*');
      if (!error && data && data.length > 0) {
        setAvailableUsers(prev => {
          const dbUsers = data as User[];
          const userMap = new Map();
          prev.forEach(u => userMap.set(u.id, u));
          dbUsers.forEach(u => userMap.set(u.id, u));
          dbUsers.forEach(u => {
            if (u.email) {
              const existingByEmail = Array.from(userMap.values()).find(ex => ex.email === u.email);
              if (existingByEmail && existingByEmail.id !== u.id) {
                userMap.delete(existingByEmail.id);
                userMap.set(u.id, u);
              }
            }
          });
          return Array.from(userMap.values());
        });

        if (currentUser?.email) {
          const dbUser = (data as User[]).find(u => u.email === currentUser.email);
          if (dbUser && dbUser.id !== currentUser.id) {
            console.log('--- AppContext: Migrating currentUser to DB ID ---', dbUser.id);
            setCurrentUser(dbUser);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch users from DB:', err);
    }
  };

  useEffect(() => {
    fetchDBUsers();
  }, [currentUser?.id]); // Only refetch when the actual identity changes, not just any property

  // --- App Actions ---

  const login = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      router.push('/');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
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
  };

  const deleteUser = async (id: string) => {
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
  };

  const addClaim = async (claimData: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => {
    // 1. Calculate amount if needed (for server action input)
    const calculatedAmount = claimData.amount !== undefined
      ? claimData.amount
      : (claimData.items || []).reduce((sum, item) => sum + item.amount, 0);

    // 2. Optimistic Update (Optional but tricky with ID generation, skipping for simpler consistency)
    // Or we can generate a temp ID. Let's rely on server response for now to get real ID.

    // 3. Server Action
    const result = await createClaimAction({
      ...claimData,
      amount: calculatedAmount,
      status: claimData.status as any,
      // We need to ensure types match for items (ExpenseItem[])
      items: claimData.items as any
    });

    if (result.success && result.data) {
      setClaims(prev => [result.data as Claim, ...prev]);
      return result.data as Claim;
    } else {
      alert('建立申請單失敗: ' + result.error);
      return null;
    }
  };

  const updateClaim = async (id: string, data: Partial<Claim>, note?: string) => {
    // 1. Optimistic Update
    setClaims(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));

    // 2. Server Action
    const result = await updateClaimAction(id, data);

    // 3. Sync with actual server data (handles history/timestamps)
    if (result.success && result.data) {
      setClaims(prev => prev.map(c => c.id === id ? result.data as Claim : c));
    } else if (!result.success) {
      console.error('Update Claim Failed:', result.error);
      // Re-sync from server to revert optimistic change if really needed, 
      // but let's assume success for now or the next refresh will fix it.
    }
  };

  const updateClaimStatus = async (id: string, newStatus: Claim['status'], note?: string) => {
    // 1. Optimistic Update
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));

    // 2. Server Action
    const result = await updateClaimStatusAction(id, newStatus, note);

    // 3. Sync
    if (result.success && result.data) {
      setClaims(prev => prev.map(c => c.id === id ? result.data as Claim : c));
    }
  };

  const deleteClaim = async (id: string) => {
    setClaims(prev => prev.filter(c => c.id !== id));
    await deleteClaimAction(id);
  };

  const addPayment = (payee: string, claimIds: string[], paymentDate: string): Payment => {
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
  };

  const cancelPayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    setClaims(prev => prev.map(c =>
      payment.claimIds.includes(c.id) ? { ...c, status: 'approved', datePaid: undefined } : c
    ));

    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const requestAddVendor = async (vendor: Omit<Vendor, 'id'>) => {
    const result = await createVendorRequest({ type: 'add', data: vendor });
    if (result.success) {
      alert('廠商新增申請已送出');
      const { success, data } = await getVendorRequests();
      if (success && data) {
        setVendorRequests(data.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      // Refresh vendors if it was an instant change (though requests go to approval)
      // but for consistency if we ever add direct additions.
      await fetchVendors();
      return true;
    }
    alert('申請失敗: ' + result.error);
    return false;
  };

  const requestUpdateVendor = async (id: string, data: Partial<Vendor>) => {
    const existingVendor = vendors.find(v => v.id === id);
    const result = await createVendorRequest({
      type: 'update',
      vendorId: id,
      data: data,
      originalData: existingVendor
    });

    if (result.success) {
      alert('廠商變更申請已送出');
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
    }
    alert('申請失敗: ' + result.error);
    return false;
  };

  const requestDeleteVendor = async (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    const result = await createVendorRequest({
      type: 'delete',
      vendorId: id,
      originalData: vendor,
      data: {}
    });

    if (result.success) {
      alert('廠商刪除申請已送出');
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
    }
    alert('申請失敗: ' + result.error);
    return false;
  };

  const approveVendorRequest = async (requestId: string) => {
    const result = await approveVendorRequestAction(requestId, 'approve');
    if (result?.success) {
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      // Crucial: Refresh the actual vendors list so they appear in the UI
      await fetchVendors();
      alert('審核已核准');
    }
  };

  const rejectVendorRequest = async (requestId: string) => {
    const result = await approveVendorRequestAction(requestId, 'reject');
    if (result?.success) {
      const { success: rSuccess, data: rData } = await getVendorRequests();
      if (rSuccess && rData) {
        setVendorRequests(rData.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp).toISOString().split('T')[0],
          data: r.data as any,
          originalData: r.originalData as any
        })));
      }
      // Refresh to ensure consistency if any status changed
      await fetchVendors();
      alert('審核已駁回');
    }
  };

  const fetchVendors = async () => {
    console.log('Fetching vendors...');
    const { success, data } = await getVendors();
    if (success && data) {
      setVendors(data);
    }
  };

  return (
    <AppContext.Provider value={{
      vendors,
      claims,
      vendorRequests,
      payments,
      fetchVendors,
      addClaim,
      updateClaim,
      updateClaimStatus,
      deleteClaim,
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
      isAuthLoading
    }}>
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
