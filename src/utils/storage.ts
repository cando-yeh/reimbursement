import { createClient } from './supabase/client';

/**
 * Uploads a file to Supabase Storage with a date-based folder structure and semantic naming.
 * Path format: YYYYMM/Name_Category_Amount_Index.ext
 * 
 * @param file The file to upload
 * @param dateString YYYY-MM-DD format string for folder classification
 * @param payeeName Name of the payee (vendor or employee)
 * @param category Expense category
 * @param amount Expense amount
 * @param index Sequence index (starting from 0)
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
    file: File,
    dateString: string,
    payeeName: string,
    category: string,
    amount: number,
    index: number
) {
    const supabase = createClient();

    // 1. Extract YYYYMM from dateString
    let yearMonth = '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error('Invalid date');
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        yearMonth = `${year}${month}`;
    } catch (e) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        yearMonth = `${year}${month}`;
    }

    // 2. Generate semantic filename: Payee_Category_Amount_Index.ext
    const fileExt = file.name.split('.').pop();
    const safePayee = payeeName.replace(/[/\\?%*:|"<>]/g, '-'); // Basic sanitization
    const safeCategory = category.replace(/[/\\?%*:|"<>]/g, '-');
    const fileName = `${safePayee}_${safeCategory}_${amount}_${index}.${fileExt}`;
    const filePath = `${yearMonth}/${fileName}`;

    // 3. Upload to 'receipts' bucket
    const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, file);

    if (error) {
        console.error('Upload Error:', error);
        throw new Error(`憑證上傳失敗: ${error.message}`);
    }

    // 4. Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

    return publicUrl;
}
