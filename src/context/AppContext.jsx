import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Mock Initial Data
const INITIAL_VENDORS = [
  { id: 'v1', name: 'TechSolutions Inc.', contact: 'Alice Smith', email: 'alice@techsolutions.com' },
  { id: 'v2', name: 'CleanOffice Supplies', contact: 'Bob Jones', email: 'orders@cleanoffice.com' },
  { id: 'v3', name: 'Global Logistics', contact: 'Charlie Day', email: 'charlie@globallogistics.com' },
];

const INITIAL_CLAIMS = [
  {
    id: 'c1',
    type: 'employee',
    payee: 'John Doe',
    amount: 120.50,
    date: '2023-10-25',
    status: 'pending',
    description: 'Travel expenses for Client A'
  },
  {
    id: 'c2',
    type: 'vendor',
    vendorId: 'v1',
    payee: 'TechSolutions Inc.',
    amount: 5000.00,
    date: '2023-10-26',
    status: 'approved',
    description: 'Q4 Server Maintenance'
  },
  {
    id: 'c3',
    type: 'employee',
    payee: 'Jane Smith',
    amount: 45.00,
    date: '2023-10-27',
    status: 'draft',
    description: 'Team Lunch'
  },
];

export function AppProvider({ children }) {
  const [vendors, setVendors] = useState(INITIAL_VENDORS);
  const [claims, setClaims] = useState(INITIAL_CLAIMS);

  const addVendor = (vendor) => {
    const newVendor = { ...vendor, id: `v${Date.now()}` };
    setVendors(prev => [...prev, newVendor]);
    return newVendor;
  };

  const addClaim = (claim) => {
    const newClaim = {
      ...claim,
      id: `c${Date.now()}`,
      status: claim.status || 'draft', // Default only if not provided
      date: new Date().toISOString().split('T')[0]
    };
    setClaims(prev => [newClaim, ...prev]);
    return newClaim;
  };

  const updateClaimStatus = (id, newStatus) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const deleteClaim = (id) => {
    setClaims(prev => prev.filter(c => c.id !== id));
  };

  return (
    <AppContext.Provider value={{
      vendors,
      claims,
      addVendor,
      addClaim,
      updateClaimStatus,
      deleteClaim
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
