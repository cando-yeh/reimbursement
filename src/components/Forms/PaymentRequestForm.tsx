'use client';

import React from 'react';
import { Save, Send, Loader2 } from 'lucide-react';
import FormPage from '@/components/Common/FormPage';
import FormActions from '@/components/Common/FormActions';
import PaymentVendorSection from '@/components/Forms/PaymentRequest/PaymentVendorSection';
import PaymentContentSection from '@/components/Forms/PaymentRequest/PaymentContentSection';
import PaymentAttachmentsSection from '@/components/Forms/PaymentRequest/PaymentAttachmentsSection';
import { usePaymentRequestForm } from '@/hooks/usePaymentRequestForm';

export default function PaymentRequestForm({ editId }: { editId?: string }) {
    const {
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
    } = usePaymentRequestForm(editId);

    return (
        <FormPage
            title="廠商請款"
            subtitle="請填寫付款對象、金額及相關憑證資料。"
        >
            <form onSubmit={handleSubmit} className="space-y-10">
                <PaymentVendorSection
                    vendors={vendors}
                    vendorRequests={vendorRequests}
                    vendorId={vendorId}
                    setVendorId={setVendorId}
                    selectedVendor={selectedVendor}
                    manualBankCode={manualBankCode}
                    setManualBankCode={setManualBankCode}
                    manualBankAccount={manualBankAccount}
                    setManualBankAccount={setManualBankAccount}
                    bankAccountDisplay={bankAccountDisplay}
                    isSubmitting={isSubmitting}
                    markTouched={markTouched}
                    getError={getError}
                />

                <PaymentContentSection
                    expenseCategory={expenseCategory}
                    setExpenseCategory={setExpenseCategory}
                    amountInput={amountInput}
                    setAmountInput={setAmountInput}
                    description={description}
                    setDescription={setDescription}
                    memo={memo}
                    setMemo={setMemo}
                    isSubmitting={isSubmitting}
                    markTouched={markTouched}
                    getError={getError}
                />

                <PaymentAttachmentsSection
                    receiptStatus={receiptStatus}
                    setReceiptStatus={setReceiptStatus}
                    invoiceNumber={invoiceNumber}
                    setInvoiceNumber={setInvoiceNumber}
                    invoiceDate={invoiceDate}
                    setInvoiceDate={setInvoiceDate}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    existingInvoiceFile={existingInvoiceFile}
                    setExistingInvoiceFile={setExistingInvoiceFile}
                    invoiceUrl={invoiceUrl}
                    setInvoiceUrl={setInvoiceUrl}
                    isSubmitting={isSubmitting}
                    markTouched={markTouched}
                    getError={getError}
                />

                <FormActions
                    containerStyle={{ display: 'flex', gap: '1rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', marginTop: '2rem' }}
                    buttons={[
                        {
                            type: 'button',
                            variant: 'ghost',
                            onClick: () => router.back(),
                            disabled: isSubmitting,
                            label: '取消離開',
                            style: { marginRight: 'auto', color: 'var(--color-text-secondary)' }
                        },
                        {
                            show: !isResubmit,
                            type: 'button',
                            variant: 'ghost',
                            onClick: handleSaveDraft,
                            disabled: isSubmitting,
                            icon: isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />,
                            label: <span style={{ marginLeft: '0.5rem' }}>儲存草稿</span>,
                            style: { border: '1px solid var(--color-border)', minWidth: '120px' }
                        },
                        {
                            type: 'submit',
                            variant: 'primary',
                            disabled: isSubmitting,
                            icon: isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />,
                            label: <span style={{ marginLeft: '0.5rem' }}>{isResubmit ? '重新提交申請' : '提交申請並送出'}</span>,
                            style: { minWidth: '150px', fontSize: '1rem' }
                        }
                    ]}
                />
            </form>
        </FormPage>
    );
}
