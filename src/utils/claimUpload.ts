import { uploadFile, deleteFile } from '@/utils/storage';

export async function uploadInvoiceIfNeeded(params: {
    attachments: File[];
    invoiceDate: string;
    vendorName: string;
    expenseCategory: string;
    amount: number;
    existingUrl?: string;
}) {
    const { attachments, invoiceDate, vendorName, expenseCategory, amount, existingUrl } = params;
    if (!attachments || attachments.length === 0) return existingUrl;
    const file = attachments[0];
    const uploadedUrl = await uploadFile(
        file,
        invoiceDate,
        vendorName,
        expenseCategory,
        amount,
        0
    );
    return uploadedUrl;
}

export async function buildEmployeeClaimItem(params: {
    item: {
        id: string;
        date: string;
        amount: number;
        description: string;
        category?: string;
        invoiceNumber?: string;
        noReceipt: boolean;
        receiptFile: File | null;
        existingReceiptName?: string;
        fileUrl?: string;
    };
    index: number;
    applicantName: string;
}) {
    const { item, index, applicantName } = params;
    let fileUrl = item.fileUrl;
    if (item.receiptFile) {
        fileUrl = await uploadFile(
            item.receiptFile,
            item.date,
            applicantName,
            item.category || '',
            item.amount,
            index
        );
    }

    return {
        id: item.id,
        date: item.date,
        amount: item.amount,
        description: item.description,
        category: item.category || '',
        invoiceNumber: item.invoiceNumber,
        notes: item.noReceipt ? '無憑證' : (item.receiptFile?.name || item.existingReceiptName || ''),
        fileUrl: fileUrl
    };
}

export async function deleteFilesSilently(urls: string[]) {
    if (!urls || urls.length === 0) return;
    await Promise.all(urls.map(url => deleteFile(url))).catch(e => console.error(e));
}
