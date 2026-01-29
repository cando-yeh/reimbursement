import { createClient } from './supabase/client';

/**
 * Compresses an image file before upload.
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File | Blob> {
    if (!file.type.startsWith('image/')) return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Uploads a file to Supabase Storage with a date-based folder structure and semantic naming.
 * Includes automatic image compression for photos.
 * Path format: YYYYMM/Payee_Category_Amount_Index.ext
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

    // 0. Compress if it's an image
    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
    }

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
    // Strict sanitization: remove non-ASCII characters to prevent S3 invalid key errors
    const safePayee = payeeName.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '-');
    const safeCategory = category.replace(/[^\x00-\x7F]/g, '').replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '-');
    const fileName = `${safePayee}_${safeCategory}_${amount}_${index}.${fileExt}`;
    const filePath = `${yearMonth}/${fileName}`;

    // 3. Upload to 'receipts' bucket
    const { error } = await supabase.storage
        .from('receipts')
        .upload(filePath, fileToUpload);

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
