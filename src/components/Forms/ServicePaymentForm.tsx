'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Claim } from '@/types';
import { Save, Send, ArrowLeft, Mail, MapPin, Upload, Image, ChevronDown, CreditCard } from 'lucide-react';
import { BANK_LIST } from '@/utils/constants';
import { formatNumberWithCommas, parseAmountToNumber } from '@/utils/format';
import PageHeader from '@/components/Common/PageHeader';
import FormSection from '@/components/Common/FormSection';
import { todayISO } from '@/utils/date';
import { useToast } from '@/context/ToastContext';
import { APPROVER_REQUIRED_MESSAGE } from '@/utils/messages';

export default function ServicePaymentForm({ editId }: { editId?: string }) {
    const router = useRouter();
    const { addClaim, updateClaim, claims, currentUser } = useApp();
    const { showToast } = useToast();

    const existingClaim = editId ? claims.find(c => c.id === editId) : null;
    const isResubmit = existingClaim?.status === 'rejected' || existingClaim?.status === 'pending_evidence';

    const [formData, setFormData] = useState({
        payeeName: '',
        idNumber: '',
        email: '',
        registeredAddress: '',
        description: '',
        servicePeriodStart: todayISO(),
        servicePeriodEnd: todayISO(),
        amount: '' as string | number,
        bankCode: '',
        bankAccount: '',
    });

    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [bankBookFile, setBankBookFile] = useState<File | null>(null);
    const [fileUrls, setFileUrls] = useState({
        idFront: '',
        idBack: '',
        bankBook: ''
    });

    const formInitializedRef = React.useRef(false);

    useEffect(() => {
        if (formInitializedRef.current) return;
        if (editId) {
            const claim = claims.find(c => c.id === editId);
            if (claim) {
                formInitializedRef.current = true;
                setFormData({
                    payeeName: claim.payee || '',
                    idNumber: claim.serviceDetails?.idNumber || '',
                    email: claim.serviceDetails?.email || '',
                    registeredAddress: claim.serviceDetails?.registeredAddress || '',
                    description: claim.description || '',
                    servicePeriodStart: claim.serviceDetails?.servicePeriodStart || todayISO(),
                    servicePeriodEnd: claim.serviceDetails?.servicePeriodEnd || todayISO(),
                    amount: claim.amount || '',
                    bankCode: claim.serviceDetails?.bankCode || '',
                    bankAccount: claim.serviceDetails?.bankAccount || '',
                });
                setFileUrls({
                    idFront: claim.serviceDetails?.idFrontUrl || '',
                    idBack: claim.serviceDetails?.idBackUrl || '',
                    bankBook: claim.serviceDetails?.bankBookUrl || ''
                });
            }
        }
    }, [editId, claims]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setFormData({ ...formData, bankAccount: value });
        }
    };

    const handleSubmit = (action: 'submit' | 'draft') => {
        if (action === 'submit' && !currentUser?.approverId) {
            showToast(APPROVER_REQUIRED_MESSAGE, 'error');
            return;
        }
        const status: Claim['status'] = action === 'submit' ? 'pending_approval' : 'draft';
        const amountNum = Number(formData.amount);

        if (action === 'submit') {
            if (!amountNum || !formData.payeeName || !formData.idNumber || !formData.email ||
                !formData.registeredAddress || !formData.description || !formData.bankCode || !formData.bankAccount) {
                alert('請填寫所有必填欄位');
                return;
            }
            if ((!idFrontFile && !fileUrls.idFront) || (!idBackFile && !fileUrls.idBack) || (!bankBookFile && !fileUrls.bankBook)) {
                alert('請上傳所有必要附件');
                return;
            }
        }

        const selectedBank = BANK_LIST.find(b => b.code === formData.bankCode);

        const claimData = {
            description: formData.description || '勞務報酬申請',
            date: todayISO(),
            type: 'service',
            payee: formData.payeeName,
            status: status,
            items: [{
                id: '1',
                amount: amountNum,
                date: formData.servicePeriodStart,
                description: formData.description,
                category: '勞務費',
            }],
            serviceDetails: {
                idNumber: formData.idNumber,
                email: formData.email,
                registeredAddress: formData.registeredAddress,
                servicePeriodStart: formData.servicePeriodStart,
                servicePeriodEnd: formData.servicePeriodEnd,
                bankName: selectedBank?.name || '',
                bankCode: formData.bankCode,
                bankAccount: formData.bankAccount,
                idFrontImage: idFrontFile?.name,
                idBackImage: idBackFile?.name,
                bankBookImage: bankBookFile?.name,
                idFrontUrl: fileUrls.idFront,
                idBackUrl: fileUrls.idBack,
                bankBookUrl: fileUrls.bankBook
            }
        };

        if (editId) {
            const currentClaim = claims.find(c => c.id === editId);
            const currentDetails = currentClaim?.serviceDetails;

            const mergedDetails = {
                ...claimData.serviceDetails,
                idFrontImage: idFrontFile?.name || currentDetails?.idFrontImage,
                idBackImage: idBackFile?.name || currentDetails?.idBackImage,
                bankBookImage: bankBookFile?.name || currentDetails?.bankBookImage,
                idFrontUrl: fileUrls.idFront || currentDetails?.idFrontUrl,
                idBackUrl: fileUrls.idBack || currentDetails?.idBackUrl,
                bankBookUrl: fileUrls.bankBook || currentDetails?.bankBookUrl,
            };

            updateClaim(editId, {
                ...claimData,
                serviceDetails: mergedDetails
            });
        } else {
            addClaim(claimData as any);
        }
        router.push(action === 'draft' ? '/?tab=drafts' : '/?tab=in_review');
    };

    const renderFileUpload = (label: string, file: File | null, setFile: (f: File | null) => void, id: string) => {
        const urlKey = id === 'id-front' ? 'idFront' : id === 'id-back' ? 'idBack' : 'bankBook';
        const hasFile = file || (fileUrls as any)[urlKey];

        return (
            <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    {label} <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <div
                    style={{
                        border: '2px dashed var(--color-border)',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: hasFile ? 'rgba(34, 197, 94, 0.1)' : 'var(--color-bg)',
                        minHeight: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onClick={() => document.getElementById(id)?.click()}
                >
                    <input
                        type="file"
                        id={id}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                setFile(file);
                                const url = URL.createObjectURL(file);
                                setFileUrls(prev => ({ ...prev, [urlKey]: url }));
                            }
                        }}
                    />
                    {hasFile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Image size={18} style={{ color: 'var(--color-success)' }} />
                            <span style={{ color: 'var(--color-success)', fontWeight: 500, fontSize: '0.85rem' }}>{file?.name || '已上傳檔案'}</span>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            <Upload size={20} style={{ marginBottom: '0.25rem' }} />
                            <div>點擊上傳</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const requiredStar = <span style={{ color: 'var(--color-danger)' }}>*</span>;

    return (
        <div className="container">
            <PageHeader
                title="個人勞務"
                subtitle="支付專業服務、稿費、講座或勞務報酬費用。"
            />

            <div className="card" style={{ padding: '2.5rem' }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit('submit'); }} className="space-y-10">
                    <FormSection title="收款人基本資料">
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>姓名 {requiredStar}</label>
                                    <input type="text" required className="form-input" value={formData.payeeName} onChange={e => setFormData({ ...formData, payeeName: e.target.value })} placeholder="請輸入全名" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>身分證字號 {requiredStar}</label>
                                    <input type="text" required className="form-input" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} placeholder="例如：A123456789" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>電子信箱 {requiredStar}</label>
                                    <input type="email" required className="form-input" placeholder="example@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>戶籍地址 {requiredStar}</label>
                                    <input type="text" required className="form-input" placeholder="請輸入完整地址" value={formData.registeredAddress} onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="勞務內容與金額">
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>勞務事由 {requiredStar}</label>
                                <input type="text" required className="form-input" placeholder="例如：1月份專業顧問工作、特定課程講師費用" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>勞務期間 (起) {requiredStar}</label>
                                    <input type="date" required className="form-input" value={formData.servicePeriodStart} onChange={e => setFormData({ ...formData, servicePeriodStart: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>勞務期間 (訖) {requiredStar}</label>
                                    <input type="date" required className="form-input" value={formData.servicePeriodEnd} onChange={e => setFormData({ ...formData, servicePeriodEnd: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>應付金額 {requiredStar}</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600, pointerEvents: 'none' }}>NT$</span>
                                        <input
                                            type="text"
                                            required
                                            inputMode="numeric"
                                            className="form-input"
                                            style={{ paddingLeft: '2.8rem', textAlign: 'right', fontWeight: 600, fontSize: '1.1rem' }}
                                            value={formatNumberWithCommas(formData.amount)}
                                            onChange={e => setFormData({ ...formData, amount: parseAmountToNumber(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="匯款帳戶">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>銀行 {requiredStar}</label>
                                <div style={{ position: 'relative' }}>
                                    <select required className="form-input" style={{ appearance: 'none', paddingRight: '2rem' }} value={formData.bankCode} onChange={e => setFormData({ ...formData, bankCode: e.target.value })}>
                                        <option value="">==請選擇銀行==</option>
                                        {BANK_LIST.map(bank => (<option key={bank.code} value={bank.code}>{bank.code} {bank.name}</option>))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }}><ChevronDown size={16} /></div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>銀行帳號 {requiredStar}</label>
                                <input type="text" required pattern="[0-9]*" inputMode="numeric" className="form-input" placeholder="例如：123456789012" value={formData.bankAccount} onChange={handleAccountChange} />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="身份證明與存摺影本">
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                            {renderFileUpload('身分證正面', idFrontFile, setIdFrontFile, 'id-front')}
                            {renderFileUpload('身分證反面', idBackFile, setIdBackFile, 'id-back')}
                            {renderFileUpload('銀行存摺正面', bankBookFile, setBankBookFile, 'bank-book')}
                        </div>
                    </FormSection>

                    <div className="form-actions" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => router.back()} className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--color-text-secondary)' }}>取消離開</button>
                        {!isResubmit && <button type="button" onClick={() => handleSubmit('draft')} className="btn btn-ghost" style={{ border: '1px solid var(--color-border)', minWidth: '120px' }}><Save size={18} /> 儲存草稿</button>}
                        <button type="submit" className="btn btn-primary" style={{ minWidth: '150px', fontSize: '1rem' }}><Send size={18} /> {isResubmit ? '重新提交申請' : '提交申請並送出'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
