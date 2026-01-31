'use client';

import React from 'react';
import { Save, Send, Loader2 } from 'lucide-react';
import ConfirmModal from '@/components/Common/ConfirmModal';
import FormSection from '@/components/Common/FormSection';
import FormPage from '@/components/Common/FormPage';
import FormActions from '@/components/Common/FormActions';
import EmployeeItemsTable from '@/components/Forms/EmployeeReimbursement/EmployeeItemsTable';
import { useEmployeeReimbursementForm } from '@/hooks/useEmployeeReimbursementForm';

export default function EmployeeReimbursementForm({ editId }: { editId?: string }) {
    const {
        items,
        isSubmitting,
        isResubmit,
        noReceiptReason,
        setNoReceiptReason,
        showConfirmSubmit,
        setShowConfirmSubmit,
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
    } = useEmployeeReimbursementForm(editId);

    return (
        <FormPage
            title="員工報銷"
            subtitle="適用於交通費、差旅費、交際費等代墊款項報銷。"
            cardStyle={{ padding: '2rem' }}
        >
            <div className="space-y-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <FormSection title="費用明細">
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>請逐筆填寫報銷項目並上傳憑證</p>
                        </FormSection>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block' }}>總計金額 (TWD)</span>
                        <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.75rem', lineHeight: 1 }}>
                            <span style={{ fontSize: '1rem', marginRight: '4px' }}>NT$</span>
                            {totalAmount.toLocaleString()}
                        </div>
                    </div>
                </div>

                <EmployeeItemsTable
                    items={items}
                    isSubmitting={isSubmitting}
                    onItemChange={handleItemChange}
                    onRemoveItem={removeItem}
                    onAddItem={addItem}
                    onRemoveReceiptFile={handleRemoveFile}
                    onRemoveExistingFile={markExistingFileForDeletion}
                    getObjectUrl={getObjectUrl}
                />

                {items.some(i => i.noReceipt) && (
                    <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                        <label className="label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                            ⚠️ 無憑證原因 <span style={{ color: 'var(--color-danger)' }}>*</span>
                        </label>
                        <textarea
                            className="form-input"
                            value={noReceiptReason}
                            onChange={e => setNoReceiptReason(e.target.value)}
                            placeholder="請說明為何此筆費用無法提供憑證..."
                            rows={3}
                            style={{ marginTop: '0.5rem' }}
                            disabled={isSubmitting}
                        />
                    </div>
                )}

                <FormActions
                    containerClassName="form-actions"
                    containerStyle={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem' }}
                    buttons={[
                        {
                            type: 'button',
                            variant: 'ghost',
                            onClick: () => router.back(),
                            disabled: isSubmitting,
                            label: '取消',
                            style: { marginRight: 'auto', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }
                        },
                        {
                            show: !isResubmit,
                            type: 'button',
                            variant: 'ghost',
                            onClick: () => handleSubmit('draft'),
                            disabled: isSubmitting,
                            icon: isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />,
                            label: <span style={{ marginLeft: '0.5rem' }}>儲存草稿</span>,
                            style: { border: '1px solid var(--color-border)', whiteSpace: 'nowrap' }
                        },
                        {
                            type: 'button',
                            variant: 'primary',
                            onClick: () => handleSubmit('submit'),
                            disabled: isSubmitting,
                            icon: isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />,
                            label: <span style={{ marginLeft: '0.5rem' }}>{isResubmit ? '重新提交' : '提交申請'}</span>,
                            style: { whiteSpace: 'nowrap' }
                        }
                    ]}
                />
            </div>

            <ConfirmModal
                isOpen={showConfirmSubmit}
                title="確認提交申請"
                message={`您確定要提交這筆共 NT$ ${totalAmount.toLocaleString()} 的報銷申請嗎？提交後將進入審核流程。`}
                confirmText="確認提交"
                onConfirm={() => executeSubmit('submit')}
                onCancel={() => setShowConfirmSubmit(false)}
                confirmDisabled={isSubmitting}
                cancelDisabled={isSubmitting}
                confirmLoading={isSubmitting}
            />
        </FormPage>
    );
}
