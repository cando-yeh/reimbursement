'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import { formatNumberWithCommas, parseAmountToNumber } from '@/utils/format';
import { BANK_LIST } from '@/utils/constants';
import { todayISO } from '@/utils/date';
import { APPROVER_REQUIRED_MESSAGE } from '@/utils/messages';
import { ensureApprover, initializeEditClaim, isResubmission } from '@/utils/claimForm';
import { validatePaymentRequest } from '@/utils/claimValidation';
import { uploadInvoiceIfNeeded } from '@/utils/claimUpload';
import { saveOrUpdateClaim } from '@/utils/claimSubmit';
import { goHome } from '@/utils/claimNavigation';
import { getClaimById } from '@/app/actions/claims';

export function usePaymentRequestForm(editId?: string) {
    const router = useRouter();
    const { vendors, addClaim, updateClaim, claims, currentUser, vendorRequests } = useApp();
    const { showToast } = useToast();

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = isResubmission(existingClaim?.status);

    const [vendorId, setVendorId] = useState<string>('');
    const [amountInput, setAmountInput] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [expenseCategory, setExpenseCategory] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [receiptStatus, setReceiptStatus] = useState<'obtained' | 'pending' | 'none'>('obtained');
    const [invoiceNumber, setInvoiceNumber] = useState<string>('');
    const [invoiceDate, setInvoiceDate] = useState<string>('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [manualBankCode, setManualBankCode] = useState('');
    const [manualBankAccount, setManualBankAccount] = useState('');
    const [existingInvoiceFile, setExistingInvoiceFile] = useState<string | undefined>(undefined);
    const [invoiceUrl, setInvoiceUrl] = useState<string | undefined>(undefined);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formInitializedRef = useRef(false);

    useEffect(() => {
        const initFromClaim = (claim: any) => {
            if (!claim || claim.type !== 'payment') return;
            setVendorId(claim.vendorId || '');
            setAmountInput(formatNumberWithCommas(String(claim.amount)));
            setDescription(claim.paymentDetails?.transactionContent || claim.description || '');
            setExpenseCategory(claim.paymentDetails?.expenseCategory || '');
            setMemo(claim.paymentDetails?.payerNotes || '');
            const status = claim.paymentDetails?.invoiceStatus;
            if (status === 'not_yet') setReceiptStatus('pending');
            else if (status === 'unable') setReceiptStatus('none');
            else setReceiptStatus('obtained');
            if (status === 'obtained' || status === 'unable') setInvoiceNumber(claim.paymentDetails?.invoiceNumber || '');
            if ((claim.paymentDetails as any)?.invoiceDate) setInvoiceDate((claim.paymentDetails as any).invoiceDate);
            if (claim.paymentDetails?.bankCode) setManualBankCode(claim.paymentDetails.bankCode);
            if (claim.paymentDetails?.bankAccount) setManualBankAccount(claim.paymentDetails.bankAccount);
            if (claim.paymentDetails?.invoiceFile) setExistingInvoiceFile(claim.paymentDetails.invoiceFile);
            if (claim.paymentDetails?.invoiceUrl) setInvoiceUrl(claim.paymentDetails.invoiceUrl);
        };

        initializeEditClaim({
            editId,
            claims,
            formInitializedRef,
            isReady: (claim) => claim.type === 'payment' && !!claim.paymentDetails,
            initFromClaim,
            fetcher: getClaimById
        });
    }, [editId, claims]);

    const selectedVendor = useMemo(() => vendors.find((v) => v.id === vendorId) || null, [vendors, vendorId]);

    useEffect(() => {
        if (selectedVendor && !selectedVendor.isFloatingAccount) {
            setManualBankCode('');
            setManualBankAccount('');
        }
    }, [selectedVendor]);

    const bankAccountDisplay = useMemo(() => {
        if (!selectedVendor) return '';
        if (selectedVendor.isFloatingAccount) return '需自行填寫';
        const bank = BANK_LIST.find(b => b.code === selectedVendor.bankCode);
        return `(${selectedVendor.bankCode} ${bank?.name || ''}) ${selectedVendor.bankAccount}`;
    }, [selectedVendor]);

    const amount = parseAmountToNumber(amountInput);

    const errors = useMemo(() => validatePaymentRequest({
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
    }), [vendorId, amount, description, expenseCategory, memo, receiptStatus, invoiceNumber, selectedVendor, manualBankCode, manualBankAccount, attachments, existingInvoiceFile]);

    const isValid = Object.keys(errors).length === 0;

    const markTouched = (key: string) => setTouched(t => ({ ...t, [key]: true }));
    const getError = (key: string) => (touched[key] && errors[key]) || undefined;

    const handleSaveDraft = async () => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            const finalInvoiceUrl = await uploadInvoiceIfNeeded({
                attachments,
                invoiceDate: invoiceDate || todayISO(),
                vendorName: selectedVendor?.name || '未知廠商',
                expenseCategory: expenseCategory || '未分類',
                amount: amount || 0,
                existingUrl: invoiceUrl
            });

            const newClaim = {
                applicantId: currentUser.id,
                type: 'payment',
                amount: amount || 0,
                description: description.trim() || '未命名廠商付款',
                vendorId: vendorId || '',
                payee: selectedVendor?.name || '',
                items: [],
                date: todayISO(),
                status: 'draft' as const,
                paymentDetails: {
                    transactionContent: description.trim(),
                    payerNotes: memo.trim(),
                    invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as any,
                    invoiceNumber: (receiptStatus === 'obtained' || receiptStatus === 'none') ? invoiceNumber.trim() : undefined,
                    invoiceDate: receiptStatus === 'obtained' ? invoiceDate : undefined,
                    invoiceFile: attachments.length > 0 ? attachments[0].name : existingInvoiceFile,
                    invoiceUrl: finalInvoiceUrl,
                    bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                    bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
                    expenseCategory: expenseCategory || '',
                }
            };
            const ok = await saveOrUpdateClaim({
                editId,
                addClaim,
                updateClaim,
                data: newClaim,
                showToast,
                errorMessage: '儲存失敗，請稍後再試'
            });
            if (!ok) return;
            goHome(router, { tab: 'drafts', refresh: true });
        } catch (error: any) {
            console.error(error);
            alert('儲存失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTouched({
            vendorId: true, manualBankCode: true, manualBankAccount: true,
            amount: true, description: true, expenseCategory: true,
            memo: true, invoiceNumber: true, attachments: true,
        });
        if (!isValid || !currentUser) return;
        if (!ensureApprover(currentUser, showToast, APPROVER_REQUIRED_MESSAGE)) return;

        setIsSubmitting(true);
        try {
            const finalInvoiceUrl = await uploadInvoiceIfNeeded({
                attachments,
                invoiceDate: invoiceDate || todayISO(),
                vendorName: selectedVendor?.name || '未知廠商',
                expenseCategory,
                amount,
                existingUrl: invoiceUrl
            });

            const newClaim = {
                applicantId: currentUser.id,
                type: 'payment',
                amount: amount,
                description: description.trim(),
                vendorId: vendorId,
                payee: selectedVendor?.name || '',
                items: [],
                date: todayISO(),
                status: 'pending_approval' as any,
                paymentDetails: {
                    transactionContent: description.trim(),
                    payerNotes: memo.trim(),
                    invoiceStatus: (receiptStatus === 'pending' ? 'not_yet' : receiptStatus === 'none' ? 'unable' : 'obtained') as any,
                    invoiceNumber: (receiptStatus === 'obtained' || receiptStatus === 'none') ? invoiceNumber.trim() : undefined,
                    invoiceDate: receiptStatus === 'obtained' ? invoiceDate : undefined,
                    invoiceFile: attachments.length > 0 ? attachments[0].name : existingInvoiceFile,
                    invoiceUrl: finalInvoiceUrl,
                    bankCode: selectedVendor?.isFloatingAccount ? manualBankCode : undefined,
                    bankAccount: selectedVendor?.isFloatingAccount ? manualBankAccount : undefined,
                    expenseCategory: expenseCategory || '',
                }
            };
            const ok = await saveOrUpdateClaim({
                editId,
                addClaim,
                updateClaim,
                data: newClaim,
                showToast,
                errorMessage: '提交失敗，請稍後再試'
            });
            if (!ok) return;
            goHome(router, { refresh: true });
        } catch (error: any) {
            console.error(error);
            alert('提交失敗: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        vendorId,
        setVendorId,
        amountInput,
        setAmountInput,
        description,
        setDescription,
        expenseCategory,
        setExpenseCategory,
        memo,
        setMemo,
        receiptStatus,
        setReceiptStatus,
        invoiceNumber,
        setInvoiceNumber,
        invoiceDate,
        setInvoiceDate,
        attachments,
        setAttachments,
        manualBankCode,
        setManualBankCode,
        manualBankAccount,
        setManualBankAccount,
        existingInvoiceFile,
        setExistingInvoiceFile,
        invoiceUrl,
        setInvoiceUrl,
        isSubmitting,
        isResubmit,
        selectedVendor,
        bankAccountDisplay,
        markTouched,
        getError,
        handleSaveDraft,
        handleSubmit,
        router,
        vendorRequests,
        vendors
    };
}
