'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Vendor, Claim, VendorRequest, User, Payment } from '../types';
import { createVendorRequest, getVendorRequests, getVendors, approveVendorRequest as approveVendorRequestAction } from '@/app/actions/vendors';

interface AppContextType {
  vendors: Vendor[];
  claims: Claim[];
  vendorRequests: VendorRequest[];
  payments: Payment[];
  addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => Claim;
  updateClaim: (id: string, data: Partial<Claim>, note?: string) => void;
  updateClaimStatus: (id: string, newStatus: Claim['status'], note?: string) => void;
  deleteClaim: (id: string) => void;
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
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  isAuthLoading: boolean;
}

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A', roleName: '一般員工', permissions: ['general'], email: 'user.a@company.com', approverId: 'u2' },
  { id: 'u2', name: 'User B', roleName: '一般員工', permissions: ['general'], email: 'user.b@company.com', approverId: 'u3' },
  { id: 'u3', name: 'User C', roleName: '財務', permissions: ['general', 'finance_audit'], email: 'finance.c@company.com', approverId: 'u2' },
  { id: 'u4', name: '管理者', roleName: '一般員工 (管理員)', permissions: ['general', 'user_management'], email: 'admin.d@company.com', approverId: 'u2' },
  { id: 'u5', name: 'Cando Yeh', roleName: '財務 + 管理者', permissions: ['general', 'finance_audit', 'user_management'], email: 'cando.yeh@gmail.com', approverId: 'u2' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

// Static supabase client to prevent re-creation and infinite loops
const supabase = createClient();

// Mock Initial Data
const INITIAL_VENDORS: Vendor[] = [
  { id: 'v1', name: 'TechSolutions Inc.', serviceContent: 'IT Support & Hardware', bankCode: '004', bankAccount: '123456789012' },
  { id: 'v2', name: 'CleanOffice Supplies', serviceContent: 'Office Supplies', bankCode: '822', bankAccount: '987654321098' },
  { id: 'v3', name: 'Global Logistics', serviceContent: 'Shipping & Delivery', bankCode: '013', bankAccount: '456789012345' },
];

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
  const availableUsersRef = useRef<User[]>(MOCK_USERS);

  // Sync ref with state for use in event listeners
  useEffect(() => {
    availableUsersRef.current = availableUsers;
  }, [availableUsers]);
  const isInitialLoad = useRef(true);

  // 1. Initial Data Load from LocalStorage
  useEffect(() => {
    if (!isInitialLoad.current) return;

    console.log('--- AppContext: Initializing State from LocalStorage ---');

    try {
      const savedVendors = localStorage.getItem('vendors');
      if (savedVendors) setVendors(JSON.parse(savedVendors));

      const savedClaims = localStorage.getItem('claims');
      if (savedClaims) setClaims(JSON.parse(savedClaims));

      const savedRequests = localStorage.getItem('vendorRequests');
      if (savedRequests) setVendorRequests(JSON.parse(savedRequests));

      const savedUsers = localStorage.getItem('users');
      if (savedUsers) setAvailableUsers(JSON.parse(savedUsers));
      else setAvailableUsers(MOCK_USERS);

      const savedPayments = localStorage.getItem('payments');
      if (savedPayments) setPayments(JSON.parse(savedPayments));

      const savedUserId = localStorage.getItem('currentUserId');
      if (savedUserId && savedUsers) {
        const users = JSON.parse(savedUsers) as User[];
        const user = users.find(u => u.id === savedUserId);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse localStorage:', e);
    } finally {
      setIsInitialized(true);
      isInitialLoad.current = false;
    }
  }, []);

  // 2. Persistence to LocalStorage (Consolidated)
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('vendors', JSON.stringify(vendors));
    localStorage.setItem('claims', JSON.stringify(claims));
    localStorage.setItem('vendorRequests', JSON.stringify(vendorRequests));
    localStorage.setItem('users', JSON.stringify(availableUsers));
    localStorage.setItem('payments', JSON.stringify(payments));
  }, [vendors, claims, vendorRequests, availableUsers, payments, isInitialized]);

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
        localStorage.removeItem('currentUserId');
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

        localStorage.setItem('currentUserId', foundUser.id);
        return foundUser;
      });
    };

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        handleAuthChange(user);
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

  // 5. Fetch Users from DB (optional/utility)
  useEffect(() => {
    const fetchDBUsers = async () => {
      if (!currentUser) return;
      try {
        const { data, error } = await supabase.from('User').select('*');
        if (!error && data && data.length > 0) {
          setAvailableUsers(prev => {
            const dbUsers = data as User[];
            // Create a map by ID for efficient merge
            const userMap = new Map();
            // Add existing (mock) users first
            prev.forEach(u => userMap.set(u.id, u));
            // Add/Overwrite with DB users
            dbUsers.forEach(u => userMap.set(u.id, u));
            // Also merge by email to handle UUID vs Mock ID transition
            dbUsers.forEach(u => {
              if (u.email) {
                const existingByEmail = Array.from(userMap.values()).find(ex => ex.email === u.email);
                if (existingByEmail && existingByEmail.id !== u.id) {
                  // If we found a mock user with same email but different ID, 
                  // we should probably keep the DB one (UUID) as the source of truth for name lookup
                  userMap.delete(existingByEmail.id);
                  userMap.set(u.id, u);
                }
              }
            });
            return Array.from(userMap.values());
          });
        }
      } catch (err) {
        console.error('Failed to fetch users from DB:', err);
      }
    };
    fetchDBUsers();
  }, [currentUser]);

  // --- App Actions ---

  const login = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
      setIsAuthenticated(true);
      router.push('/');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
    setIsAuthenticated(false);
    router.push('/login');
  };

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
    }
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setAvailableUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    setAvailableUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser?.id === id) logout();
  };

  const addClaim = (claimData: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => {
    const calculatedAmount = claimData.amount !== undefined
      ? claimData.amount
      : (claimData.items || []).reduce((sum, item) => sum + item.amount, 0);

    const initialStatus = currentUser?.approverId ? 'pending_approval' : 'pending_finance';

    const newClaim: Claim = {
      ...claimData,
      id: `c${Date.now()}`,
      applicantId: currentUser?.id || 'unknown',
      amount: calculatedAmount,
      status: claimData.status || initialStatus,
      date: claimData.date || new Date().toISOString().split('T')[0],
      history: [{
        timestamp: new Date().toISOString(),
        actorId: currentUser?.id || 'unknown',
        actorName: currentUser?.name || 'Unknown',
        action: (claimData.status === 'draft') ? 'draft' : 'submitted',
      }]
    };
    setClaims(prev => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaim = (id: string, data: Partial<Claim>, note?: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        let newHistory = c.history || [];
        if (data.status && data.status !== c.status) {
          newHistory = [
            ...newHistory,
            {
              timestamp: new Date().toISOString(),
              actorId: currentUser?.id || 'system',
              actorName: currentUser?.name || 'System',
              action: `status_change_to_${data.status}`,
              note: note
            }
          ];
        }
        return { ...c, ...data, history: newHistory };
      }
      return c;
    }));
  };

  const updateClaimStatus = (id: string, newStatus: Claim['status'], note?: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        const historyItem = {
          timestamp: new Date().toISOString(),
          actorId: currentUser?.id || 'system',
          actorName: currentUser?.name || 'System',
          action: `status_change_to_${newStatus}`,
          note: note
        };
        return {
          ...c,
          status: newStatus,
          datePaid: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : c.datePaid,
          history: [...(c.history || []), historyItem]
        };
      }
      return c;
    }));
  };

  const deleteClaim = (id: string) => {
    setClaims(prev => prev.filter(c => c.id !== id));
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
      alert('審核已駁回');
    }
  };

  return (
    <AppContext.Provider value={{
      vendors,
      claims,
      vendorRequests,
      payments,
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
