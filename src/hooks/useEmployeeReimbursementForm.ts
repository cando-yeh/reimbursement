'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { Claim } from '@/types';
import { todayISO } from '@/utils/date';
import { APPROVER_REQUIRED_MESSAGE, CLAIM_DRAFT_SAVED_MESSAGE, CLAIM_SUBMITTED_MESSAGE } from '@/utils/messages';
import { ensureApprover, initializeEditClaim, isResubmission } from '@/utils/claimForm';
import { getValidExpenseItems, validateEmployeeReimbursement } from '@/utils/claimValidation';
import { saveOrUpdateClaim } from '@/utils/claimSubmit';
import { goHome } from '@/utils/claimNavigation';
import { buildEmployeeClaimItem, deleteFilesSilently } from '@/utils/claimUpload';
import { getClaimById } from '@/app/actions/claims';

interface ExpenseItemWithAttachment {
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
}

export function useEmployeeReimbursementForm(editId?: string) {
    const { claims, currentUser, addClaim, updateClaim } = useApp();
    const { showToast } = useToast();
    const router = useRouter();

    const [items, setItems] = useState<ExpenseItemWithAttachment[]>([
        { id: '1', amount: 0, date: todayISO(), description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
    ]);
    const [filesToDelete, setFilesToDelete] = useState<string[]>([]);
    const [noReceiptReason, setNoReceiptReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [submitType, setSubmitType] = useState<'submit' | 'draft'>('submit');

    const objectUrlsRef = useRef<Map<string, string>>(new Map());
    const formInitializedRef = useRef(false);

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = isResubmission(existingClaim?.status);

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [items]);

    const getObjectUrl = (itemId: string, file: File): string => {
        const existingUrl = objectUrlsRef.current.get(itemId);
        if (existingUrl) return existingUrl;
        const newUrl = URL.createObjectURL(file);
        objectUrlsRef.current.set(itemId, newUrl);
        return newUrl;
    };

    const handleRemoveFile = (itemId: string) => {
        const url = objectUrlsRef.current.get(itemId);
        if (url) {
            URL.revokeObjectURL(url);
            objectUrlsRef.current.delete(itemId);
        }
        handleItemChange(itemId, 'receiptFile', null);
    };

    useEffect(() => {
        const urls = objectUrlsRef.current;
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    useEffect(() => {
        const initFromClaim = (claim: Claim) => {
            const loadedItems = (claim.lineItems || []).map(i => ({
                id: i.id,
                date: i.date,
                amount: i.amount,
                description: i.description,
                category: i.category || '',
                invoiceNumber: i.invoiceNumber || '',
                noReceipt: i.notes === '無憑證',
                receiptFile: null,
                existingReceiptName: (i.notes && i.notes !== '無憑證') ? i.notes : undefined,
                fileUrl: i.fileUrl || undefined
            }));
            if (loadedItems.length > 0) setItems(loadedItems);
            if (claim.noReceiptReason) setNoReceiptReason(claim.noReceiptReason);
        };

        initializeEditClaim({
            editId,
            claims,
            formInitializedRef,
            isReady: (claim) => !!claim.lineItems && claim.lineItems.length > 0,
            initFromClaim,
            fetcher: getClaimById
        });
    }, [editId, claims]);

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now().toString(), amount: 0, date: todayISO(), description: '', category: '', invoiceNumber: '', noReceipt: false, receiptFile: null }
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleItemChange = (id: string, key: keyof ExpenseItemWithAttachment, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item));
    };

    const markExistingFileForDeletion = (id: string, fileUrl?: string) => {
        if (fileUrl) {
            setFilesToDelete(prev => [...prev, fileUrl]);
        }
        handleItemChange(id, 'existingReceiptName', undefined);
        handleItemChange(id, 'fileUrl', undefined);
    };

    const handleSubmit = async (action: 'submit' | 'draft') => {
        if (!currentUser) return;
        if (action === 'submit' && !ensureApprover(currentUser, showToast, APPROVER_REQUIRED_MESSAGE)) return;

        const validation = validateEmployeeReimbursement({
            items,
            noReceiptReason,
            action
        });
        if (validation.error) {
            showToast(validation.error, 'error');
            return;
        }

        if (action === 'submit') {
            setSubmitType('submit');
            setShowConfirmSubmit(true);
            return;
        }

        executeSubmit('draft');
    };

    const executeSubmit = async (action: 'submit' | 'draft') => {
        setIsSubmitting(true);
        const validItems = getValidExpenseItems(items);

        try {
            const processedItems = await Promise.all(validItems.map(async (item, index) => (
                buildEmployeeClaimItem({
                    item: {
                        id: item.id,
                        date: item.date,
                        amount: Number(item.amount),
                        description: item.description,
                        category: item.category || '',
                        invoiceNumber: item.invoiceNumber,
                        noReceipt: item.noReceipt,
                        receiptFile: item.receiptFile,
                        existingReceiptName: item.existingReceiptName,
                        fileUrl: item.fileUrl
                    },
                    index,
                    applicantName: currentUser!.name
                })
            )));

            const generatedDescription = `${validItems[0].category} 等費用報銷`;
            const status = action === 'draft' ? 'draft' : undefined;

            const claimData = {
                description: generatedDescription,
                date: todayISO(),
                type: 'employee' as const,
                payee: currentUser!.name,
                status: status || 'pending_finance',
                noReceiptReason: validItems.some(i => i.noReceipt) ? noReceiptReason : undefined,
                items: processedItems,
                amount: totalAmount
            };

            const updateStatus = action === 'draft' ? 'draft' : 'pending_approval';
            const ok = await saveOrUpdateClaim({
                editId,
                addClaim,
                updateClaim,
                data: editId
                    ? { ...claimData, status: updateStatus }
                    : { ...claimData, status: status || 'pending_approval' },
                showToast,
                errorMessage: '提交失敗，請稍後再試'
            });
            if (!ok) return;

            if (filesToDelete.length > 0) {
                await deleteFilesSilently(filesToDelete);
            }

            showToast(action === 'draft' ? CLAIM_DRAFT_SAVED_MESSAGE : CLAIM_SUBMITTED_MESSAGE, 'success');
            goHome(router, { tab: action === 'draft' ? 'drafts' : undefined, refresh: true });
        } catch (error: any) {
            console.error(error);
            showToast('提交失敗: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    return {
        items,
        isSubmitting,
        isResubmit,
        noReceiptReason,
        setNoReceiptReason,
        showConfirmSubmit,
        setShowConfirmSubmit,
        submitType,
        setSubmitType,
        totalAmount,
        addItem,
        removeItem,
        handleItemChange,
        handleRemoveFile,
        getObjectUrl,
        markExistingFileForDeletion,
        handleSubmit,
        executeSubmit,
        router
    };
}
