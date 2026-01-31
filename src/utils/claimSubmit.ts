import type { Claim } from '@/types';

export async function saveOrUpdateClaim(params: {
    editId?: string;
    addClaim: (data: any) => Promise<Claim | null>;
    updateClaim: (id: string, data: Partial<Claim> & { items?: any[] }) => Promise<{ success: boolean; error?: string }>;
    data: any;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    errorMessage: string;
}) {
    const { editId, addClaim, updateClaim, data, showToast, errorMessage } = params;
    if (editId) {
        const result = await updateClaim(editId, data);
        if (!result.success) {
            showToast(result.error || errorMessage, 'error');
            return false;
        }
        return true;
    }

    const created = await addClaim(data);
    if (!created) {
        showToast(errorMessage, 'error');
        return false;
    }
    return true;
}
