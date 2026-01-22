import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vendor, Claim, VendorRequest } from '../types';

interface AppContextType {
  vendors: Vendor[];
  claims: Claim[];
  vendorRequests: VendorRequest[];
  addClaim: (claim: Omit<Claim, 'id' | 'amount'> & { amount?: number }) => Claim;
  updateClaimStatus: (id: string, newStatus: Claim['status']) => void;
  deleteClaim: (id: string) => void;
  requestAddVendor: (vendor: Omit<Vendor, 'id'>) => VendorRequest;
  requestUpdateVendor: (id: string, data: Partial<Vendor>) => void;
  requestDeleteVendor: (id: string) => void;
  approveVendorRequest: (requestId: string) => void;
  rejectVendorRequest: (requestId: string) => void;
  userRole: 'applicant' | 'finance';
  setUserRole: (role: 'applicant' | 'finance') => void;
}

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
    status: 'pending',
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
    status: 'pending',
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
    const saved = localStorage.getItem('claims');
    return saved ? JSON.parse(saved) : INITIAL_CLAIMS;
  });
  const [userRole, setUserRole] = useState<'applicant' | 'finance'>('applicant');

  useEffect(() => {
    localStorage.setItem('vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('vendorRequests', JSON.stringify(vendorRequests));
  }, [vendorRequests]);

  useEffect(() => {
    localStorage.setItem('claims', JSON.stringify(claims));
  }, [claims]);

  const addClaim = (claimData: Omit<Claim, 'id' | 'amount'> & { amount?: number }) => {
    // Calculate total from items if not provided
    const calculatedAmount = claimData.items.reduce((sum, item) => sum + item.amount, 0);

    const newClaim: Claim = {
      ...claimData,
      id: `c${Date.now()}`,
      amount: calculatedAmount,
      status: claimData.status || 'pending',
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
      userRole,
      setUserRole
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
