import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, Claim, VendorRequest, User } from '../types';

interface AppContextType {
  vendors: Vendor[];
  claims: Claim[];
  vendorRequests: VendorRequest[];
  addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => Claim;
  updateClaimStatus: (id: string, newStatus: Claim['status']) => void;
  deleteClaim: (id: string) => void;
  requestAddVendor: (vendor: Omit<Vendor, 'id'>) => VendorRequest;
  requestUpdateVendor: (id: string, data: Partial<Vendor>) => void;
  requestDeleteVendor: (id: string) => void;
  approveVendorRequest: (requestId: string) => void;
  rejectVendorRequest: (requestId: string) => void;
  currentUser: User;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'User A', roleName: '員工 (一般權限)', permissions: ['general'], email: 'user.a@company.com', approverId: 'u2' }, // User A reports to User B
  { id: 'u2', name: 'User B', roleName: '員工 (一般權限)', permissions: ['general'], email: 'user.b@company.com' }, // User B is manager, reports to Finance? or self-approve? Let's assume reports to Finance implicitly if no approver.
  { id: 'u3', name: 'User C', roleName: '財務 (一般+財務)', permissions: ['general', 'finance_audit'], email: 'finance.c@company.com' },
  { id: 'u4', name: 'User D', roleName: '管理者 (管理)', permissions: ['user_management'], email: 'admin.d@company.com' },
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
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [availableUsers, setAvailableUsers] = useState<User[]>(MOCK_USERS);

  const switchUser = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setAvailableUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    // If updating current user, update that state too
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updates }));
    }
  };

  const deleteUser = (id: string) => {
    setAvailableUsers(prev => prev.filter(u => u.id !== id));
    if (currentUser.id === id) {
      alert('You deleted your current user session.');
      window.location.reload();
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
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      setAvailableUsers(JSON.parse(savedUsers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(availableUsers));
  }, [availableUsers]);


  const addClaim = (claimData: Omit<Claim, 'id' | 'amount' | 'status'> & { amount?: number; status?: Claim['status'] }) => {
    // Calculate total from items if not provided
    const calculatedAmount = claimData.items.reduce((sum, item) => sum + item.amount, 0);

    // Determine initial status: if user has approver -> pending_approval, else -> pending_finance
    // Note: In real app, we check if current user IS the applicant. If not, logic might differ.
    // For now assume current user creates claim for themselves.
    const initialStatus = currentUser.approverId ? 'pending_approval' : 'pending_finance';

    const newClaim: Claim = {
      ...claimData,
      id: `c${Date.now()}`,
      amount: calculatedAmount,
      status: claimData.status || initialStatus, // Allow overriding if specific flow demands
      date: claimData.date || new Date().toISOString().split('T')[0]
    };
    setClaims(prev => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaimStatus = (id: string, newStatus: Claim['status']) => {
    setClaims(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: newStatus,
          datePaid: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : c.datePaid
        };
      }
      return c;
    }));
  };

  const deleteClaim = (id: string) => {
    setClaims(prev => prev.filter(c => c.id !== id));
  };

  const requestAddVendor = (vendor: Omit<Vendor, 'id'>) => {
    const request: VendorRequest = {
      id: `req${Date.now()}`,
      type: 'add',
      status: 'pending',
      data: { ...vendor, id: `v${Date.now()}` },
      timestamp: new Date().toISOString().split('T')[0]
    };
    setVendorRequests(prev => [request, ...prev]);
    return request;
  };

  const requestUpdateVendor = (id: string, data: Partial<Vendor>) => {
    const request: VendorRequest = {
      id: `req${Date.now()}`,
      type: 'update',
      status: 'pending',
      vendorId: id,
      data: data,
      timestamp: new Date().toISOString().split('T')[0]
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
      timestamp: new Date().toISOString().split('T')[0]
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
      addClaim,
      updateClaimStatus,
      deleteClaim,
      requestAddVendor,
      requestUpdateVendor,
      requestDeleteVendor,
      approveVendorRequest,
      rejectVendorRequest,
      currentUser,
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
