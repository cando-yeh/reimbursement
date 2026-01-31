export interface Vendor {
    id: string;
    name: string;
    serviceContent?: string | null;
    bankCode?: string | null;
    bankAccount?: string | null;
    isFloatingAccount?: boolean | null;
}

export interface ExpenseItem {
    id: string;
    date: string; // Expense date
    amount: number;
    description: string;
    category?: string; // Expense Category
    notes?: string;
    fileUrl?: string; // For session preview
}

export interface ClaimItem {
    id: string;
    claimId?: string;
    date: string;
    category?: string;
    description: string;
    amount: number;
    invoiceNumber?: string;
    fileUrl?: string;
    notes?: string;
}

export interface Claim {
    id: string;
    type: 'employee' | 'vendor' | 'service' | 'payment';
    payee: string; // User Name or Vendor Name
    vendorId?: string; // Optional Vendor ID
    applicantId?: string; // ID of the user who submitted the claim

    // Header Info
    date: string; // Submission Date
    status: 'draft' | 'pending_approval' | 'pending_finance' | 'approved' | 'paid' | 'pending_evidence' | 'pending_finance_review' | 'completed' | 'rejected' | 'cancelled';
    description: string; // Main title/summary of the claim
    amount: number; // Total amount
    paymentDetails?: PaymentDetails;

    // Items
    lineItems: ClaimItem[];

    // Service Payment Specific Details (勞務報酬單)
    serviceDetails?: ServiceDetails;

    applicant?: {
        name: string;
        email?: string;
        roleName?: string;
    };
    datePaid?: string; // Optional, set when status becomes 'paid'
    evidenceFiles?: string[]; // Array of file paths/base64 for post-payment evidence
    noReceiptReason?: string; // Reason for any "no receipt" claim items
    history?: any;
}

export interface PaymentDetails {
    transactionContent: string;
    payerNotes?: string;
    invoiceStatus: 'obtained' | 'not_yet' | 'unable';
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceFile?: string;
    invoiceUrl?: string;
    bankCode?: string;
    bankAccount?: string;
    expenseCategory?: string;
}

export interface ServiceDetails {
    idNumber?: string;
    email?: string;
    registeredAddress?: string;
    servicePeriodStart?: string;
    servicePeriodEnd?: string;
    bankName?: string;
    bankCode?: string;
    bankAccount?: string;
    idFrontImage?: string;
    idBackImage?: string;
    bankBookImage?: string;
    idFrontUrl?: string;
    idBackUrl?: string;
    bankBookUrl?: string;
}

export interface ClaimHistory {
    timestamp: string; // ISO string
    actorId: string; // User ID who performed the action
    actorName: string; // Snapshot of name
    action: string; // e.g., 'submitted', 'approved', 'rejected', 'finance_approved', 'paid', 'edited'
    note?: string; // Optional comment
}

export interface VendorRequest {
    id: string;
    type: 'add' | 'update' | 'delete';
    vendorId?: string; // For update/delete
    data?: Partial<Vendor>; // The new data (or partial data for updates)
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string;
    applicantName?: string; // Name of the user who requested the change
    originalData?: Vendor; // Snapshot of data before change (for audit/comparison)
}

export type Permission = 'general' | 'finance_audit' | 'user_management';

export interface User {
    id: string;
    name: string;
    roleName: string;
    permissions: Permission[];
    email?: string;
    approverId?: string; // ID of the general approver (manager)
}

export interface Payment {
    id: string;           // 付款編號
    payee: string;        // 付款對象
    paymentDate: string;  // 付款日期
    amount: number;       // 付款金額
    claimIds: string[];   // 關聯的申請單 ID 列表
}
