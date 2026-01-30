'use client';

/**
 * AppContext - Composition Layer
 * 
 * This file provides backward compatibility by re-exporting the useApp hook
 * that combines all domain-specific contexts (Auth, Vendors, Claims).
 * 
 * For new code, prefer using the domain-specific hooks directly:
 * - useAuth() for authentication and user management
 * - useVendors() for vendor and vendor request operations
 * - useClaims() for claims and payments
 */

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { VendorsProvider, useVendors } from './VendorsContext';
import { ClaimsProvider, useClaims } from './ClaimsContext';
import { Vendor, Claim, VendorRequest, User, Payment } from '../types';

// --- Combined AppContextType (for backward compatibility) ---
interface AppContextType {
  // From VendorsContext
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

  // From ClaimsContext
  claims: Claim[];
  payments: Payment[];
  isDataLoading: boolean;
  fetchClaims: (filters?: { status?: string | string[], applicantId?: string, page?: number, pageSize?: number, cache?: boolean, type?: string, payee?: string }) => Promise<{ data: Claim[], pagination: any } | null>;
  fetchDashboardData: (filters: { applicantId: string; status?: string | string[]; page?: number; pageSize?: number }) => Promise<{ counts: { drafts: number, evidence: number, returned: number, inReview: number, pendingPayment: number, closed: number }; claims: Claim[]; pagination: any } | null>;
  addClaim: (claim: Omit<Claim, 'id' | 'amount' | 'status' | 'lineItems'> & { amount?: number; status?: Claim['status']; items?: any[] }) => Promise<Claim | null>;
  updateClaim: (id: string, data: Partial<Claim> & { items?: any[] }, note?: string) => Promise<void>;
  updateClaimStatus: (id: string, newStatus: Claim['status'], note?: string) => Promise<void>;
  deleteClaim: (id: string) => Promise<void>;
  getMyClaimCounts: (applicantId: string) => Promise<{ drafts: number, evidence: number, returned: number, inReview: number, pendingPayment: number, closed: number } | null>;
  addPayment: (payee: string, claimIds: string[], paymentDate: string) => Payment;
  cancelPayment: (paymentId: string) => void;

  // From AuthContext
  currentUser: User | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  availableUsers: User[];
  login: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Internal Component that combines all contexts ---
function AppContextCombiner({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const vendors = useVendors();
  const claims = useClaims();

  const combinedValue = useMemo(() => ({
    // Auth
    currentUser: auth.currentUser,
    isAuthenticated: auth.isAuthenticated,
    isAuthLoading: auth.isAuthLoading,
    availableUsers: auth.availableUsers,
    login: auth.login,
    logout: auth.logout,
    switchUser: auth.switchUser,
    updateUser: auth.updateUser,
    deleteUser: auth.deleteUser,
    refreshUsers: auth.refreshUsers,

    // Vendors
    vendors: vendors.vendors,
    vendorRequests: vendors.vendorRequests,
    isVendorsLoading: vendors.isVendorsLoading,
    fetchVendors: vendors.fetchVendors,
    fetchVendorRequests: vendors.fetchVendorRequests,
    requestAddVendor: vendors.requestAddVendor,
    requestUpdateVendor: vendors.requestUpdateVendor,
    requestDeleteVendor: vendors.requestDeleteVendor,
    approveVendorRequest: vendors.approveVendorRequest,
    rejectVendorRequest: vendors.rejectVendorRequest,

    // Claims
    claims: claims.claims,
    payments: claims.payments,
    isDataLoading: claims.isDataLoading,
    fetchClaims: claims.fetchClaims,
    fetchDashboardData: claims.fetchDashboardData,
    addClaim: claims.addClaim,
    updateClaim: claims.updateClaim,
    updateClaimStatus: claims.updateClaimStatus,
    deleteClaim: claims.deleteClaim,
    getMyClaimCounts: claims.getMyClaimCounts,
    addPayment: claims.addPayment,
    cancelPayment: claims.cancelPayment,
  }), [auth, vendors, claims]);

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

// --- AppProvider (composes all domain providers) ---
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <VendorsProvider>
        <ClaimsProvider>
          <AppContextCombiner>
            {children}
          </AppContextCombiner>
        </ClaimsProvider>
      </VendorsProvider>
    </AuthProvider>
  );
}

// --- Backward-compatible hook ---
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// --- Re-exports for gradual migration ---
export { useAuth } from './AuthContext';
export { useVendors } from './VendorsContext';
export { useClaims } from './ClaimsContext';
