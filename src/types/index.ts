export interface Vendor {
    id: string;
    name: string;
    serviceContent?: string;
    bankCode?: string;
    bankAccount?: string;
    isFloatingAccount?: boolean;
}

export interface ExpenseItem {
    id: string;
    date: string; // Expense date
    amount: number;
    description: string;
    category?: string; // Expense Category
    notes?: string;
}

export interface Claim {
    id: string;
    type: string; // 'employee' | 'vendor' | 'service'
    payee: string; // User Name or Vendor Name
    payeeId?: string; // Optional ID for linking
    applicantId?: string; // ID of the user who submitted the claim

    // Header Info
    date: string; // Submission Date
    status: 'draft' | 'pending_approval' | 'pending_finance' | 'approved' | 'paid' | 'pending_evidence' | 'pending_finance_review' | 'completed' | 'rejected';
    description: string; // Main title/summary of the claim
    amount: number; // Total amount
    paymentDetails?: {
        transactionContent: string;
        payerNotes?: string;
        invoiceStatus: 'obtained' | 'not_yet' | 'unable';
        invoiceNumber?: string;
        invoiceFile?: string;
        // For non-fixed vendor accounts
        bankCode?: string;
        bankAccount?: string;
    };

    // Items
    items: ExpenseItem[];

    // Service Payment Specific Details (勞務報酬單)
    serviceDetails?: {
        idNumber: string;          // 身分證字號
        email: string;             // 電子信箱
        registeredAddress: string; // 戶籍地址
        servicePeriodStart: string; // 勞務期間起
        servicePeriodEnd: string;   // 勞務期間訖
        bankName: string;           // 銀行名稱
        bankCode: string;           // 銀行代號
        bankAccount: string;        // 銀行帳號
        // 附件 (Base64 或檔名)
        idFrontImage?: string;
        idBackImage?: string;
        bankBookImage?: string;
    };

    datePaid?: string; // Optional, set when status becomes 'paid'
    evidenceFiles?: string[]; // Array of file paths/base64 for post-payment evidence
}

export interface VendorRequest {
    id: string;
    type: 'add' | 'update' | 'delete';
    vendorId?: string; // For update/delete
    data?: Partial<Vendor>; // The new data (or partial data for updates)
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string;
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
