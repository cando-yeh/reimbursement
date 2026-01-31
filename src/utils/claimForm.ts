import type { MutableRefObject } from 'react';
import type { Claim, User } from '@/types';

type FetchClaimById = (id: string) => Promise<{ success: boolean; data?: Claim }>;

export async function initializeEditClaim(options: {
    editId?: string;
    claims: Claim[];
    formInitializedRef: MutableRefObject<boolean>;
    isReady: (claim: Claim) => boolean;
    initFromClaim: (claim: Claim) => void;
    fetcher: FetchClaimById;
}) {
    const { editId, claims, formInitializedRef, isReady, initFromClaim, fetcher } = options;
    if (formInitializedRef.current || !editId) return;

    const localClaim = claims.find(c => c.id === editId);
    if (localClaim && isReady(localClaim)) {
        formInitializedRef.current = true;
        initFromClaim(localClaim);
        return;
    }

    const res = await fetcher(editId);
    if (res.success && res.data && isReady(res.data)) {
        formInitializedRef.current = true;
        initFromClaim(res.data);
    }
}

export function ensureApprover(
    currentUser: User | null,
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void,
    message: string
) {
    if (!currentUser?.approverId) {
        showToast(message, 'error');
        return false;
    }
    return true;
}

export function isResubmission(status?: Claim['status']) {
    return status === 'rejected' || status === 'pending_evidence';
}
