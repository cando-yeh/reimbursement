import { createClient } from './supabase/client';

/**
 * Uploads a file to Supabase Storage with a date-based folder structure.
 * Path format: YYYYMM/random_timestamp.ext
 * 
 * @param file The file to upload
 * @param date YYYY-MM-DD format string
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, dateString: string) {
    const supabase = createClient();

    // 1. Extract YYYYMM from dateString (format: YYYY-MM-DD or similar)
    // If the date is invalid, fallback to current date
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

    // 2. Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
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
