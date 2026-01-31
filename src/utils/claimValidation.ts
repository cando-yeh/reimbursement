import type { Claim } from '@/types';

type ReceiptStatus = 'obtained' | 'pending' | 'none';

export function validatePaymentRequest(params: {
    vendorId: string;
    amount: number;
    description: string;
    expenseCategory: string;
    memo: string;
    receiptStatus: ReceiptStatus;
    invoiceNumber: string;
    selectedVendor: { isFloatingAccount?: boolean | null } | null;
    manualBankCode: string;
    manualBankAccount: string;
    attachments: File[];
    existingInvoiceFile?: string;
}) {
    const {
        vendorId,
        amount,
        description,
        expenseCategory,
        memo,
        receiptStatus,
        invoiceNumber,
        selectedVendor,
        manualBankCode,
        manualBankAccount,
        attachments,
        existingInvoiceFile
    } = params;

    const errors: Record<string, string> = {};
    if (!vendorId) errors.vendorId = '請選擇廠商';
    if (!amount || amount <= 0) errors.amount = '請輸入大於 0 的金額';
    if (!description.trim()) errors.description = '請填寫交易內容';
    if (!expenseCategory) errors.expenseCategory = '請選擇費用類別';
    if (memo.length > 10) errors.memo = '備註不得超過 10 個字';
    if (receiptStatus === 'obtained' && !invoiceNumber.trim()) errors.invoiceNumber = '已取得發票/收據時，請填寫號碼';
    if (receiptStatus === 'none' && !invoiceNumber.trim()) errors.invoiceNumber = '請填寫無法取得的原因';
    if (receiptStatus === 'obtained' && attachments.length === 0 && !existingInvoiceFile) errors.attachments = '請上傳發票或收據';
    if (selectedVendor?.isFloatingAccount) {
        if (!manualBankCode) errors.manualBankCode = '請選擇銀行';
        if (!manualBankAccount) errors.manualBankAccount = '請填寫銀行帳號';
    }
    return errors;
}

export function getValidExpenseItems<T extends { amount: number | string; description: string; category?: string }>(items: T[]) {
    return items.filter(i => (Number(i.amount) > 0) && i.description.trim() !== '' && !!i.category);
}

export function validateEmployeeReimbursement(params: {
    items: Array<{
        amount: number | string;
        description: string;
        category?: string;
        noReceipt: boolean;
        receiptFile: File | null;
        existingReceiptName?: string;
        fileUrl?: string;
    }>;
    noReceiptReason: string;
    action: 'submit' | 'draft';
}) {
    const { items, noReceiptReason, action } = params;
    const validItems = getValidExpenseItems(items);

    if (validItems.length === 0) {
        return { validItems, error: '請至少新增一筆有效的費用明細' };
    }

    const invalidAmountItems = items.filter(i => (Number(i.amount) <= 0 || isNaN(Number(i.amount))));
    if (invalidAmountItems.length > 0) {
        return { validItems, error: '金額必須大於 0' };
    }

    if (action === 'submit') {
        const missingReceipts = validItems.filter(i => !i.noReceipt && !i.receiptFile && !i.existingReceiptName && !i.fileUrl);
        if (missingReceipts.length > 0) {
            return { validItems, error: '請為所有項目上傳憑證，或勾選「無憑證」' };
        }
        const hasNoReceiptItems = validItems.some(i => i.noReceipt);
        if (hasNoReceiptItems && noReceiptReason.trim() === '') {
            return { validItems, error: '請填寫無憑證原因' };
        }
    }

    return { validItems };
}

export function validateServicePayment(params: {
    action: 'submit' | 'draft';
    formData: {
        payeeName: string;
        idNumber: string;
        email: string;
        registeredAddress: string;
        description: string;
        bankCode: string;
        bankAccount: string;
        amount: string | number;
    };
    files: {
        idFrontFile: File | null;
        idBackFile: File | null;
        bankBookFile: File | null;
    };
    fileUrls: {
        idFront: string;
        idBack: string;
        bankBook: string;
    };
}): string | null {
    const { action, formData, files, fileUrls } = params;
    const amountNum = Number(formData.amount);

    if (action === 'submit') {
        if (!amountNum || !formData.payeeName || !formData.idNumber || !formData.email ||
            !formData.registeredAddress || !formData.description || !formData.bankCode || !formData.bankAccount) {
            return '請填寫所有必填欄位';
        }
        if ((!files.idFrontFile && !fileUrls.idFront) || (!files.idBackFile && !fileUrls.idBack) || (!files.bankBookFile && !fileUrls.bankBook)) {
            return '請上傳所有必要附件';
        }
    }
    return null;
}

export function getSubmitStatus(action: 'submit' | 'draft'): Claim['status'] {
    return action === 'submit' ? 'pending_approval' : 'draft';
}
