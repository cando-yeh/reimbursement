export const ClaimStatus = {
    draft: 'draft',
    pending_approval: 'pending_approval',
    pending_finance: 'pending_finance',
    approved: 'approved',
    paid: 'paid',
    pending_evidence: 'pending_evidence',
    pending_finance_review: 'pending_finance_review',
    completed: 'completed',
    rejected: 'rejected',
    cancelled: 'cancelled'
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];

export const ClaimType = {
    employee: 'employee',
    vendor: 'vendor',
    service: 'service',
    payment: 'payment'
} as const;

export type ClaimType = (typeof ClaimType)[keyof typeof ClaimType];
