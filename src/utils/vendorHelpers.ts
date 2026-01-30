import { VendorRequest } from '@/types';

/**
 * Format raw vendor request data from server action to VendorRequest type.
 * This is a shared helper to reduce code duplication in AppContext.
 */
export function formatVendorRequest(r: any): VendorRequest {
    return {
        ...r,
        timestamp: new Date(r.timestamp).toISOString().split('T')[0],
        data: r.data,
        originalData: r.originalData
    };
}

/**
 * Format an array of vendor requests.
 */
export function formatVendorRequests(data: any[]): VendorRequest[] {
    return data.map(formatVendorRequest);
}
