'use client';

import { Claim, ClaimHistory } from '@/types';
import { ClaimStatus, ClaimType } from '@/types/prisma';
import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/Common/ConfirmModal';
import { ArrowLeft, CheckCircle, Send, Trash2, Edit2, Undo2, Check, X, UploadCloud, XCircle } from 'lucide-react';
import { APPROVER_REQUIRED_MESSAGE } from '@/utils/messages';
import { getClaimTypeLabel } from '@/utils/claimDisplay';

const formatAction = (action: string) => {
    switch (action) {
        case 'submitted': return '送出申請';
        case 'status_change_to_pending_approval': return '重新提交 (待審核)';
        case 'status_change_to_pending_finance': return '主管核准 (待財務審核)';
        case 'status_change_to_approved': return '財務核准 (待付款)';
        case 'status_change_to_completed': return '已完成';
        case 'status_change_to_rejected': return '已退回';
        case 'status_change_to_pending_evidence': return '要求補件';
        case 'status_change_to_draft': return '撤回至草稿';
        case 'draft': return '建立草稿';
        case 'status_change_to_pending_finance_review': return '已補件 (待財務確認)';
        case 'paid': return '已付款';
        case 'status_change_to_cancelled': return '撤銷申請';
        default: return action;
    }
};

export default function ApplicationDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { claims, updateClaimStatus, deleteClaim, updateClaim, currentUser, availableUsers } = useApp();
    const claim = claims.find(c => c.id === id);

    const [evidenceInvoiceNumber, setEvidenceInvoiceNumber] = useState('');
    const [evidenceInvoiceDate, setEvidenceInvoiceDate] = useState('');
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);

    const [showNoReceiptModal, setShowNoReceiptModal] = useState(false);
    const [noReceiptDate, setNoReceiptDate] = useState('');
    const [noReceiptReason, setNoReceiptReason] = useState('');

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: () => { }
    });

    const { showToast } = useToast();

    const openConfirm = (title: string, message: string, type: 'danger' | 'warning' | 'info', onConfirm: () => void) => {
        setModalConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const handleSubmitEvidence = () => {
        if (!claim || !id) return;
        if (!evidenceInvoiceNumber.trim() || !evidenceInvoiceDate || !evidenceFile) {
            showToast('請填寫發票號碼、發票日期並上傳憑證檔案', 'error');
            return;
        }

        const updateData: any = {
            status: 'pending_finance_review'
        };

        if (claim.type === 'payment' && claim.paymentDetails) {
            updateData.paymentDetails = {
                ...claim.paymentDetails,
                invoiceStatus: 'obtained',
                invoiceNumber: evidenceInvoiceNumber.trim(),
                invoiceDate: evidenceInvoiceDate,
                invoiceFile: evidenceFile.name,
                invoiceUrl: URL.createObjectURL(evidenceFile)
            };
        } else if (claim.lineItems && claim.lineItems.length > 0) {
            updateData.lineItems = claim.lineItems.map(item => {
                if (!item.notes || item.notes === '無憑證' || item.notes === '') {
                    return {
                        ...item,
                        invoiceNumber: evidenceInvoiceNumber.trim(),
                        notes: evidenceFile.name,
                        fileUrl: URL.createObjectURL(evidenceFile)
                    };
                }
                return item;
            });
        }

        updateClaim(id, updateData);
        setShowEvidenceModal(false);
        setEvidenceInvoiceNumber('');
        setEvidenceInvoiceDate('');
        setEvidenceFile(null);
        showToast('補件憑證已提交', 'success');
        router.push('/?tab=in_review');
    };

    const canApprove = (() => {
        if (!claim) return false;
        if (claim.status === 'pending_approval') {
            const applicant = availableUsers.find(u => u.id === claim.applicantId);
            if (applicant?.approverId === currentUser?.id) return true;
        }
        if (claim.status === 'pending_finance' || claim.status === 'pending_finance_review') {
            if (currentUser?.permissions.includes('finance_audit')) return true;
        }
        return false;
    })();

    const handleApprove = () => {
        if (!claim || !id) return;

        openConfirm(
            '確認核准申請',
            '您確定要核准此申請單嗎？核准後將進入下一個審核階段。',
            'info',
            () => {
                if (claim.status === 'pending_approval') {
                    updateClaimStatus(id, 'pending_finance');
                } else if (claim.status === 'pending_finance') {
                    updateClaimStatus(id, 'approved');
                } else if (claim.status === 'pending_finance_review') {
                    updateClaimStatus(id, 'completed');
                }
                showToast('核准成功', 'success');
                router.push(`/reviews?tab=${claim.status === 'pending_approval' ? 'manager_approvals' : 'finance_review'}`);
            }
        );
    };

    const handleReject = () => {
        if (!claim || !id) return;
        setShowRejectModal(true);
    };

    const handleSubmitReject = () => {
        if (!claim || !id) return;
        if (!rejectReason.trim()) {
            showToast('請填寫退回理由', 'error');
            return;
        }

        if (claim.status === 'pending_finance_review') {
            updateClaimStatus(id, 'pending_evidence', rejectReason.trim());
        } else {
            updateClaimStatus(id, 'rejected', rejectReason.trim());
        }
        setShowRejectModal(false);
        setRejectReason('');
        showToast('申請已退回', 'warning');
        router.push(`/reviews?tab=${claim.status === 'pending_approval' ? 'manager_approvals' : 'finance_review'}`);
    };

    if (!claim) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 className="heading-md">找不到此申請單</h2>
                <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>返回首頁</Link>
            </div>
        );
    }

    const handleStatusChange = (newStatus: any) => {
        if (!id) return;
        if (newStatus === 'pending_approval' && !currentUser?.approverId) {
            showToast(APPROVER_REQUIRED_MESSAGE, 'error');
            return;
        }
        updateClaimStatus(id, newStatus);
    };

    const handleCancel = () => {
        if (!claim || !id) return;
        openConfirm(
            '確認撤銷申請',
            '確定要撤銷此申請單嗎？撤銷後將無法再進行任何操作。',
            'danger',
            () => {
                updateClaimStatus(id, 'cancelled');
                showToast('申請已撤銷', 'info');
                router.push('/');
            }
        );
    };

    const handleDelete = () => {
        if (id) {
            openConfirm(
                '確認刪除申請',
                '您確定要刪除此申請單嗎？此動作無法復原。',
                'danger',
                () => {
                    deleteClaim(id);
                    showToast('申請已刪除', 'info');
                    router.push('/');
                }
            );
        }
    };

    return (
        <div className="container">
            <header className="reimburse-header">
                <button onClick={() => router.back()} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 回前頁
                </button>
                <div className="detail-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                        <div className="detail-title-group">
                            <h1 className="heading-lg" style={{ whiteSpace: 'nowrap' }}>申請單 #{claim.id.substring(0, 10)}</h1>
                        </div>
                        <p className="reimburse-subtitle" style={{ marginTop: '0.25rem' }}>建立日期 {claim.date}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {/* Status/Actions will be here */}
                        {claim.status === 'draft' && (
                            <>
                                <button onClick={handleDelete} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger-bg)', backgroundColor: 'var(--color-danger-bg)' }}>
                                    <Trash2 size={18} /> 刪除
                                </button>
                                <button onClick={() => {
                                    if (claim.type === 'service') router.push(`/applications/service/${claim.id}`);
                                    else if (claim.type === 'payment') router.push(`/payment-request/${claim.id}`);
                                    else router.push(`/reimburse/${claim.id}`);
                                }} className="btn btn-secondary">
                                    <Edit2 size={18} /> 編輯
                                </button>
                                <button onClick={() => handleStatusChange('pending_approval')} className="btn btn-primary">
                                    <Send size={18} /> 提交申請
                                </button>
                            </>
                        )}

                        {claim.status === 'rejected' && currentUser?.id === claim.applicantId && (
                            <>
                                <button onClick={() => {
                                    if (claim.type === 'service') router.push(`/applications/service/${claim.id}`);
                                    else if (claim.type === 'payment') router.push(`/payment-request/${claim.id}`);
                                    else router.push(`/reimburse/${claim.id}`);
                                }} className="btn btn-primary">
                                    <Edit2 size={18} /> 重新編輯
                                </button>
                                <button onClick={handleCancel} className="btn" style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', backgroundColor: 'transparent' }}>
                                    <XCircle size={18} /> 撤銷申請
                                </button>
                            </>
                        )}

                        {currentUser?.id === claim.applicantId && (claim.status === 'pending_approval' || claim.status === 'pending_finance') && (
                            <button onClick={() => {
                                handleStatusChange('draft');
                                router.push('/?tab=drafts');
                            }} className="btn btn-ghost" style={{ color: 'var(--color-warning)', border: '1px solid var(--color-warning)', backgroundColor: 'transparent' }}>
                                <Undo2 size={18} /> 撤回至草稿
                            </button>
                        )}

                        {canApprove && (
                            <>
                                <button onClick={handleApprove} className="btn btn-primary">
                                    <Check size={18} /> 核准
                                </button>
                                <button onClick={handleReject} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', backgroundColor: 'transparent' }}>
                                    <X size={18} /> 退回
                                </button>
                            </>
                        )}

                        {!canApprove && ['pending_approval', 'pending_finance', 'pending_finance_review'].includes(claim.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                                <CheckCircle size={20} /> 審核中
                            </div>
                        )}

                        {claim.status === 'approved' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {currentUser?.permissions.includes('finance_audit') && (
                                    <button onClick={handleReject} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', backgroundColor: 'transparent' }}>
                                        <X size={18} /> 退回
                                    </button>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                    <CheckCircle size={20} /> 待付款
                                </div>
                            </div>
                        )}

                        {(claim.status === 'paid' || claim.status === 'completed') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                <CheckCircle size={20} /> 已完成
                            </div>
                        )}

                        {claim.status === 'rejected' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                <XCircle size={20} /> 已退回
                            </div>
                        )}

                        {claim.status === 'cancelled' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                <XCircle size={20} /> 已撤銷
                            </div>
                        )}

                        {claim.status === 'pending_evidence' && currentUser?.id === claim.applicantId && (
                            <div style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                <button onClick={() => setShowEvidenceModal(true)} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                                    <UploadCloud size={18} /> 上傳憑證
                                </button>
                                <button onClick={() => setShowNoReceiptModal(true)} className="btn" style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', whiteSpace: 'nowrap' }}>
                                    無憑證
                                </button>
                            </div>
                        )}

                        {!canApprove && claim.status === 'pending_evidence' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                <CheckCircle size={20} /> 待補件
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Evidence Modal */}
            {showEvidenceModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>上傳補件憑證</h3>
                        <div className="form-group">
                            <label className="form-group label">發票號碼 *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={evidenceInvoiceNumber}
                                onChange={e => setEvidenceInvoiceNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                placeholder="請輸入發票號碼"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-group label">發票日期 *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={evidenceInvoiceDate}
                                onChange={e => setEvidenceInvoiceDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-group label">憑證檔案 *</label>
                            <label
                                htmlFor="evidence-file-input"
                                style={{
                                    padding: '2rem',
                                    border: `2px dashed ${evidenceFile ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    display: 'block',
                                    backgroundColor: evidenceFile ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                                }}
                            >
                                <UploadCloud size={24} style={{ color: evidenceFile ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginBottom: '0.5rem' }} />
                                {evidenceFile ? (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 500 }}>✓ {evidenceFile.name}</p>
                                ) : (
                                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>點擊上傳檔案</p>
                                )}
                            </label>
                            <input
                                id="evidence-file-input"
                                type="file"
                                accept="image/*,.pdf"
                                style={{ display: 'none' }}
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        setEvidenceFile(e.target.files[0]);
                                    }
                                }}
                            />
                        </div>
                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowEvidenceModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSubmitEvidence}>提交</button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Receipt Modal */}
            {showNoReceiptModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>無憑證申報</h3>
                        <div className="form-group">
                            <label className="form-group label">交易日期 *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={noReceiptDate}
                                onChange={e => setNoReceiptDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-group label">無憑證原因 *</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={noReceiptReason}
                                onChange={e => setNoReceiptReason(e.target.value)}
                                placeholder="請說明無法取得憑證的原因"
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowNoReceiptModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={() => {
                                if (!claim || !id) return;
                                if (!noReceiptDate || !noReceiptReason.trim()) {
                                    showToast('請填寫交易日期和無憑證原因', 'error');
                                    return;
                                }
                                const updateData: any = { status: 'pending_finance_review' };
                                if (claim.type === 'payment' && claim.paymentDetails) {
                                    updateData.paymentDetails = {
                                        ...claim.paymentDetails,
                                        invoiceStatus: 'unable',
                                        invoiceNumber: noReceiptReason.trim(),
                                        invoiceDate: noReceiptDate
                                    };
                                } else if (claim.lineItems && claim.lineItems.length > 0) {
                                    updateData.lineItems = claim.lineItems.map(item => {
                                        if (!item.notes || item.notes === '') return { ...item, notes: '無憑證' };
                                        return item;
                                    });
                                }
                                updateClaim(id, updateData);
                                setShowNoReceiptModal(false);
                                setNoReceiptDate('');
                                setNoReceiptReason('');
                                showToast('無憑證申報已完成', 'info');
                                router.push('/?tab=in_review');
                            }}>提交</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '1.5rem' }}>
                        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>退回理由</h3>
                        <div className="form-group">
                            <label className="form-group label">請輸入退回理由 *</label>
                            <textarea
                                className="form-input"
                                rows={4}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="請說明退回此申請單的原因"
                                style={{ resize: 'vertical' }}
                            />
                        </div>
                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn btn-ghost" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>取消</button>
                            <button className="btn btn-primary" onClick={handleSubmitReject}>送出</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="detail-meta-grid">
                    <div>
                        <label className="form-group label">申請類型</label>
                        <div className="meta-value-caps">{getClaimTypeLabel(claim.type)}</div>
                    </div>
                    <div>
                        <label className="form-group label">付款對象</label>
                        <div className="meta-value">{claim.payee}</div>
                    </div>
                    <div>
                        <label className="form-group label">總金額</label>
                        <div className="meta-value-lg">${claim.amount.toLocaleString()}</div>
                    </div>
                    <div>
                        <label className="form-group label">申請日期</label>
                        <div className="meta-value">{claim.date}</div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 500 }}>
                        申請說明：{claim.description}
                    </div>

                    {claim.type === 'service' && claim.serviceDetails && (
                        <div className="card" style={{ backgroundColor: 'var(--color-bg)', border: 'none', marginBottom: '1.5rem' }}>
                            <h4 className="heading-md" style={{ fontSize: '1rem', marginBottom: '1rem' }}>勞務報酬單明細</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--color-text-secondary)' }}>身分證字號:</span> {claim.serviceDetails.idNumber}</div>
                                <div><span style={{ color: 'var(--color-text-secondary)' }}>電子信箱:</span> {claim.serviceDetails.email}</div>
                                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-text-secondary)' }}>戶籍地址:</span> {claim.serviceDetails.registeredAddress}</div>
                                <div><span style={{ color: 'var(--color-text-secondary)' }}>勞務期間:</span> {claim.serviceDetails.servicePeriodStart} ~ {claim.serviceDetails.servicePeriodEnd}</div>
                                <div><span style={{ color: 'var(--color-text-secondary)' }}>應付金額:</span> <strong>${Number(claim.amount).toLocaleString()}</strong></div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                    匯款資訊: ({claim.serviceDetails.bankCode}) {claim.serviceDetails.bankName} - {claim.serviceDetails.bankAccount}
                                </div>
                                {(claim.serviceDetails.idFrontImage || claim.serviceDetails.idBackImage || claim.serviceDetails.bankBookImage) && (
                                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>附件: </span>
                                        {claim.serviceDetails.idFrontImage && (
                                            <span style={{ marginRight: '1rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => claim.serviceDetails?.idFrontUrl && window.open(claim.serviceDetails.idFrontUrl, '_blank')}>📄 {claim.serviceDetails.idFrontImage}</span>
                                        )}
                                        {claim.serviceDetails.idBackImage && (
                                            <span style={{ marginRight: '1rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => claim.serviceDetails?.idBackUrl && window.open(claim.serviceDetails.idBackUrl, '_blank')}>📄 {claim.serviceDetails.idBackImage}</span>
                                        )}
                                        {claim.serviceDetails.bankBookImage && (
                                            <span style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => claim.serviceDetails?.bankBookUrl && window.open(claim.serviceDetails.bankBookUrl, '_blank')}>📄 {claim.serviceDetails.bankBookImage}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {claim.type !== 'service' && (
                        <>
                            <h4 className="heading-md" style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>費用明細</h4>
                            <table className="vendor-table table-top-sm">
                                <thead>
                                    <tr>
                                        <th>日期</th>
                                        <th>類別</th>
                                        <th>交易說明</th>
                                        <th>金額</th>
                                        <th>憑證</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claim.type === 'payment' && claim.paymentDetails ? (
                                        <tr>
                                            <td>{(claim.paymentDetails as any).invoiceDate || (claim.paymentDetails.invoiceStatus === 'not_yet' ? '尚未取得' : '-')}</td>
                                            <td>{claim.paymentDetails?.expenseCategory && <span className="status-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '0.75rem' }}>{claim.paymentDetails.expenseCategory}</span>}</td>
                                            <td style={{ fontWeight: 500, textAlign: 'center' }}>{claim.paymentDetails.transactionContent}</td>
                                            <td style={{ fontWeight: 'bold' }}><div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}><span>$</span><span>{claim.amount.toLocaleString()}</span></div></td>
                                            <td>
                                                {(claim.paymentDetails as any).invoiceFile ? (
                                                    <button onClick={() => window.open((claim.paymentDetails as any).invoiceUrl || '#', '_blank')} className="btn-small">📄 查看</button>
                                                ) : claim.paymentDetails.invoiceStatus === 'not_yet' ? <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>待補</span> : <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>無</span>}
                                            </td>
                                        </tr>
                                    ) : claim.lineItems && claim.lineItems.length > 0 ? (
                                        claim.lineItems.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td>{item.date}</td>
                                                <td>{item.category && <span className="status-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '0.75rem' }}>{item.category}</span>}</td>
                                                <td style={{ fontWeight: 500 }}>{item.description}</td>
                                                <td style={{ fontWeight: 'bold' }}><div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}><span>$</span><span>{item.amount.toLocaleString()}</span></div></td>
                                                <td>
                                                    {item.fileUrl ? (
                                                        <button onClick={() => window.open(item.fileUrl || '#', '_blank')} className="btn-small">📄 查看</button>
                                                    ) : item.notes === '無憑證' ? <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>無</span> : <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>待補</span>}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>無明細資料</td></tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                                        <td colSpan={4} style={{ textAlign: 'center', fontWeight: 'bold' }}>總計</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-primary)' }}>${claim.amount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </>
                    )}

                    {claim.type === 'payment' && claim.paymentDetails?.payerNotes && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💬 付款人備註</span>
                            <p style={{ marginTop: '0.5rem', color: 'var(--color-text)' }}>{claim.paymentDetails.payerNotes}</p>
                        </div>
                    )}

                    {claim.noReceiptReason && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                            <span style={{ fontWeight: 600, color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ 無憑證原因</span>
                            <p style={{ marginTop: '0.5rem', color: 'var(--color-text)' }}>{claim.noReceiptReason}</p>
                        </div>
                    )}
                </div>
            </div>

            {claim.history && claim.history.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 500 }}>歷史紀錄</div>
                    <div className="history-timeline" style={{ position: 'relative', paddingLeft: '1rem' }}>
                        {(claim.history as ClaimHistory[]).sort((a: ClaimHistory, b: ClaimHistory) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((item: ClaimHistory, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '1rem', paddingBottom: idx === claim.history!.length - 1 ? 0 : '1.5rem', position: 'relative' }}>
                                {idx !== claim.history!.length - 1 && <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: 0, width: '2px', backgroundColor: '#e5e7eb' }} />}
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: '4px', flexShrink: 0, zIndex: 1 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.actorName}</span>
                                            <span style={{ margin: '0 0.5rem', color: '#9ca3af' }}>•</span>
                                            <span style={{ fontWeight: 400 }}>{formatAction(item.action)}</span>
                                        </div>
                                        <time style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                            {new Date(item.timestamp).toLocaleString('zh-TW', { hour12: false })}
                                        </time>
                                    </div>
                                    {item.note && (item.action === 'status_change_to_rejected' || item.action === 'status_change_to_pending_evidence') && !item.note.includes('Status changed') && (
                                        <div style={{ marginTop: '0.6rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', padding: '0.5rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '4px', borderLeft: '3px solid #d1d5db' }}>
                                            <span>理由：{item.note}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onConfirm={() => {
                    modalConfig.onConfirm();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
