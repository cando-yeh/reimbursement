import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Vendor, Claim, VendorRequest, User, Payment } from '../types';

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
  requestAddVendor: (vendor: Omit<Vendor, 'id'>) => VendorRequest;
  requestUpdateVendor: (id: string, data: Partial<Vendor>) => void;
  requestDeleteVendor: (id: string) => void;
  approveVendorRequest: (requestId: string) => void;
  rejectVendorRequest: (requestId: string) => void;
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A', roleName: '一般員工', permissions: ['general'], email: 'user.a@company.com', approverId: 'u2' }, // User A reports to User B
  { id: 'u2', name: 'User B', roleName: '一般員工', permissions: ['general'], email: 'user.b@company.com', approverId: 'u3' }, // User B is manager, reports to Finance (or Director)
  { id: 'u3', name: 'User C', roleName: '財務', permissions: ['general', 'finance_audit'], email: 'finance.c@company.com', approverId: 'u2' }, // Finance reports to Manager
  { id: 'u4', name: '管理者', roleName: '一般員工 (管理員)', permissions: ['general', 'user_management'], email: 'admin.d@company.com', approverId: 'u2' }, // Admin reports to Manager
];

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_VENDORS: Vendor[] = [
  { id: 'v1', name: 'TechSolutions Inc.', serviceContent: 'IT Support & Hardware', bankCode: '004', bankAccount: '123456789012' },
  { id: 'v2', name: 'CleanOffice Supplies', serviceContent: 'Office Supplies', bankCode: '822', bankAccount: '987654321098' },
  { id: 'v3', name: 'Global Logistics', serviceContent: 'Shipping & Delivery', bankCode: '013', bankAccount: '456789012345' },
];

const INITIAL_CLAIMS: Claim[] = [
  {
    id: 'c1',
    type: 'employee',
    payee: 'John Doe',
    description: '10月份差旅費報銷',
    amount: 120.50,
    date: '2023-10-25',
    status: 'pending_finance', // Migrated from 'pending'
    items: [
      { id: 'i1', date: '2023-10-24', amount: 120.50, description: 'Client A 訪問交通費' }
    ]
  },
  {
    id: 'c2',
    type: 'vendor',
    payee: 'TechSolutions Inc.',
    description: 'Q4 伺服器維護',
    amount: 5000.00,
    date: '2023-10-26',
    status: 'approved',
    items: [
      { id: 'i1', date: '2023-10-26', amount: 5000.00, description: 'Q4 伺服器維護費' }
    ]
  },
  {
    id: 'c3',
    type: 'employee',
    payee: 'Jane Smith',
    description: '團隊聚餐',
    amount: 45.00,
    date: '2023-10-27',
    status: 'pending_approval', // Example pending General Approval
    items: [
      { id: 'i1', date: '2023-10-27', amount: 45.00, description: '迎新午餐' }
    ]
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'p1',
    payee: 'John Doe',
    paymentDate: '2023-11-01',
    amount: 120.50,
    claimIds: ['c1']
  },
  {
    id: 'p2',
    payee: 'TechSolutions Inc.',
    paymentDate: '2023-11-05',
    amount: 5000.00,
    claimIds: ['c2']
  }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const saved = localStorage.getItem('vendors');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
  });
  const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>(() => {
    const saved = localStorage.getItem('vendorRequests');
    return saved ? JSON.parse(saved) : [];
  });
  const [claims, setClaims] = useState<Claim[]>(() => {
    // Basic migration for old status 'pending' -> 'pending_finance' if reloading old data
    const saved = localStorage.getItem('claims');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((c: any) => ({
        ...c,
        status: c.status === 'pending' ? 'pending_finance' : c.status
      }));
    }
    return INITIAL_CLAIMS;
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Try to recover from localStorage first (for Mock users)
    const savedId = localStorage.getItem('currentUserId');
    if (savedId) {
      const user = availableUsers.find(u => u.id === savedId);
      return user || null;
    }
    return null;
  });

  // Supabase Auth Integration
  useEffect(() => {
    const handleAuthChange = async (sessionUser: any) => {
      if (sessionUser) {
        // 1. Try to find matching mock user by email
        const matchedUser = availableUsers.find(u => u.email === sessionUser.email);
        if (matchedUser) {
          setCurrentUser(matchedUser);
          localStorage.setItem('currentUserId', matchedUser.id);
        } else {
          // 2. If no match, create a transient "Guest/New" user session
          // In a real app, you would fetch this profile from your 'users' table in DB
          const newUser: User = {
            id: sessionUser.id,
            name: sessionUser.user_metadata.full_name || sessionUser.email?.split('@')[0] || 'Google User',
            email: sessionUser.email || '',
            roleName: '新進員工 (Google Auth)',
            permissions: ['general'],
            approverId: undefined
          };
          setCurrentUser(newUser);
          // We don't save ephemeral Google users to localStorage 'currentUserId' to avoid mock logic conflicts,
          // or we could save it if we added them to availableUsers. 
          // For now, relies on Supabase session persistence.
        }
      } else {
        // If Supabase says no user...
        // We only clear if we are NOT using a locked-in Mock user (check logic?)
        // Actually, if we want to support hybird, we might leave this alone?
        // But for "Testing Google Auth", we usually want Supabase to be source of truth.
        // Let's rely on manual logout for Mock users for now.
      }
    };

    // Check initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) handleAuthChange(user);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleAuthChange(session.user);
        router.refresh(); // Refresh Server Components
        router.push('/');
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
        router.refresh();
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [availableUsers, router, supabase]);

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const isAuthenticated = !!currentUser;

  const login = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', userId);
    }
  };

  const logout = async () => {
    // Check if it's a Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
    router.push('/login');
  };

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', userId);
    }
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setAvailableUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    // If updating current user, update that state too
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    setAvailableUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser?.id === id) {
      alert('You deleted your current user session.');
      logout();
    }
  };

  useEffect(() => {
    localStorage.setItem('vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('vendorRequests', JSON.stringify(vendorRequests));
  }, [vendorRequests]);

  useEffect(() => {
    localStorage.setItem('claims', JSON.stringify(claims));
  }, [claims]);

  // Persist users too for better DX during reload
  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(availableUsers));
  }, [availableUsers]);

  useEffect(() => {
    localStorage.setItem('payments', JSON.stringify(payments));
  }, [payments]);


  const addClaim = (claimData: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => {
    // Use provided amount, or calculate from items if not provided
    const calculatedAmount = claimData.amount !== undefined
      ? claimData.amount
      : claimData.items.reduce((sum, item) => sum + item.amount, 0);

    // Determine initial status: if user has approver -> pending_approval, else -> pending_finance
    // Note: In real app, we check if current user IS the applicant. If not, logic might differ.
    // For now assume current user creates claim for themselves.
    const initialStatus = currentUser?.approverId ? 'pending_approval' : 'pending_finance';

    const newClaim: Claim = {
      ...claimData,
      id: `c${Date.now()}`,
      applicantId: currentUser?.id || 'unknown', // Enforce ownership
      amount: calculatedAmount,
      status: claimData.status || initialStatus, // Allow overriding if specific flow demands
      date: claimData.date || new Date().toISOString().split('T')[0],
      history: [{
        timestamp: new Date().toISOString(),
        actorId: currentUser?.id || 'unknown',
        actorName: currentUser?.name || 'Unknown',
        action: (claimData.status === 'draft') ? 'draft' : 'submitted',
        note: undefined
      }]
    };
    setClaims(prev => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaim = (id: string, data: Partial<Claim>, note?: string) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        // If status is changing, log it
        let newHistory = c.history || [];
        if (data.status && data.status !== c.status) {
          newHistory = [
            ...newHistory,
            {
              timestamp: new Date().toISOString(),
              actorId: currentUser?.id || 'system',
              actorName: currentUser?.name || 'System',
              action: data.status === 'pending_approval' || data.status === 'pending_finance'
                ? 'submitted'
                : `status_change_to_${data.status}`,
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
    // Calculate total amount from selected claims
    const totalAmount = claims
      .filter(c => claimIds.includes(c.id))
      .reduce((sum, c) => sum + c.amount, 0);

    const newPayment: Payment = {
      id: `p${Date.now()}`,
      payee,
      paymentDate: paymentDate,
      amount: totalAmount,
      claimIds
    };

    // Update claim statuses
    setClaims(prev => prev.map(c => {
      if (claimIds.includes(c.id)) {
        // Determine next status: if invoice is missing ('not_yet'), go to pending_evidence
        // Only applicable for 'payment' type or ensure paymentDetails exists
        const needsEvidence = c.paymentDetails?.invoiceStatus === 'not_yet';
        const nextStatus = needsEvidence ? 'pending_evidence' : 'completed';

        const historyItem = {
          timestamp: new Date().toISOString(),
          actorId: currentUser?.id || 'system',
          actorName: currentUser?.name || 'System',
          action: 'paid',
          note: undefined
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

    // Set claims back to approved
    setClaims(prev => prev.map(c =>
      payment.claimIds.includes(c.id) ? { ...c, status: 'approved' as const, datePaid: undefined } : c
    ));

    // Remove payment record
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  const requestAddVendor = (vendor: Omit<Vendor, 'id'>) => {
    const request: VendorRequest = {
      id: `req${Date.now()}`,
      type: 'add',
      status: 'pending',
      data: { ...vendor, id: `v${Date.now()}` },
      timestamp: new Date().toISOString().split('T')[0],
      applicantName: currentUser?.name || 'Unknown'
    };
    setVendorRequests(prev => [request, ...prev]);
    return request;
  };

  const requestUpdateVendor = (id: string, data: Partial<Vendor>) => {
    const existingVendor = vendors.find(v => v.id === id);
    const request: VendorRequest = {
      id: `req${Date.now()}`,
      type: 'update',
      status: 'pending',
      vendorId: id,
      data: data,
      originalData: existingVendor,
      timestamp: new Date().toISOString().split('T')[0],
      applicantName: currentUser?.name || 'Unknown'
    };
    setVendorRequests(prev => [request, ...prev]);
  };

  const requestDeleteVendor = (id: string) => {
    const vendor = vendors.find(v => v.id === id);
    const request: VendorRequest = {
      id: `req${Date.now()}`,
      type: 'delete',
      status: 'pending',
      vendorId: id,
      originalData: vendor, // Snapshot for display
      timestamp: new Date().toISOString().split('T')[0],
      applicantName: currentUser?.name || 'Unknown'
    };
    setVendorRequests(prev => [request, ...prev]);
  };

  const approveVendorRequest = (requestId: string) => {
    const request = vendorRequests.find(r => r.id === requestId);
    if (!request) return;

    // Execute Action
    if (request.type === 'add' && request.data) {
      // We know data includes id here because we set it in requestAddVendor
      setVendors(current => [...current, request.data as Vendor]);
    } else if (request.type === 'update' && request.vendorId && request.data) {
      setVendors(current => current.map(v => v.id === request.vendorId ? { ...v, ...request.data } : v));
    } else if (request.type === 'delete' && request.vendorId) {
      setVendors(current => current.filter(v => v.id !== request.vendorId));
    }

    // Mark approved
    setVendorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r));
  };

  const rejectVendorRequest = (requestId: string) => {
    setVendorRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
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
      deleteUser
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
