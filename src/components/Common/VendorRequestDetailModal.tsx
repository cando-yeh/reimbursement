import React from 'react';
import { X, Check, AlertCircle, Building, ArrowRight } from 'lucide-react';
import { VendorRequest } from '../../types';

interface VendorRequestDetailModalProps {
    request: VendorRequest | null;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

export default function VendorRequestDetailModal({ request, onClose, onApprove, onReject }: VendorRequestDetailModalProps) {
    if (!request) return null;

    const renderDiff = () => {
        if (!request.data || !request.originalData) return null;

        // Fields to compare
        const fields: (keyof typeof request.data)[] = ['name', 'serviceContent', 'bankCode', 'bankAccount', 'isFloatingAccount'];
        const labels: Record<string, string> = {
            name: '廠商名稱',
            serviceContent: '服務內容',
            bankCode: '銀行代號',
            bankAccount: '銀行帳號',
            isFloatingAccount: '是否為浮動帳號'
        };

        return (
            <div className="diff-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {fields.map(field => {
                    const oldValue = request.originalData?.[field];
                    const newValue = request.data?.[field];
                    const isChanged = oldValue !== newValue;

                    return (
                        <div key={field} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 20px 1fr', gap: '1rem', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.5rem' }}>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{labels[field as string] || field}:</span>
                            <span style={{ color: isChanged ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>{String(oldValue || '-')}</span>
                            <ArrowRight size={16} className="text-muted" style={{ opacity: isChanged ? 1 : 0.3 }} />
                            <span style={{ color: isChanged ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: isChanged ? '600' : 'normal' }}>
                                {isChanged ? String(newValue || '-') : '無變更'}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="modal-content card" onClick={e => e.stopPropagation()} style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 className="heading-md">廠商異動審核</h2>
                        <span className={`status-badge ${request.type === 'add' ? 'approved' : request.type === 'delete' ? 'pending' : 'paid'}`}>
                            {request.type === 'add' ? '新增廠商' : request.type === 'update' ? '修改廠商' : '刪除廠商'}
                        </span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                </header>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div>
                            <label className="label">申請人</label>
                            <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.5rem' }}>
                                {request.applicantName || '未知'}
                            </div>
                        </div>
                        <div>
                            <label className="label">申請日期</label>
                            <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.5rem' }}>
                                {request.timestamp}
                            </div>
                        </div>
                    </div>

                    {/* Content based on Type */}
                    <div>
                        <h3 className="heading-sm" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={18} />
                            廠商資料明細
                        </h3>

                        {request.type === 'add' && request.data && (
                            <div style={{ display: 'grid', gap: '1rem', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}>
                                <div className="grid-2">
                                    <div>
                                        <label className="label">廠商名稱</label>
                                        <div>{request.data.name}</div>
                                    </div>
                                    <div>
                                        <label className="label">服務內容</label>
                                        <div>{request.data.serviceContent || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="label">銀行代號</label>
                                        <div>{request.data.bankCode || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="label">銀行帳號</label>
                                        <div>{request.data.bankAccount || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {request.type === 'update' && (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                                    以下顯示變更前後的差異：
                                </p>
                                {renderDiff()}
                            </div>
                        )}

                        {request.type === 'delete' && request.originalData && (
                            <div style={{ padding: '1rem', backgroundColor: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: '0.5rem', color: 'var(--color-warning-text)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    <AlertCircle size={18} />
                                    確定要刪除此廠商嗎？
                                </div>
                                <p>廠商名稱: {request.originalData.name}</p>
                                <p>此操作核准後將無法復原。</p>
                            </div>
                        )}
                    </div>

                </div>

                <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        className="btn btn-ghost"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => {
                            if (window.confirm('確定要拒絕此申請嗎？')) {
                                onReject(request.id);
                                onClose();
                            }
                        }}
                    >
                        <X size={18} style={{ marginRight: '0.5rem' }} />
                        拒絕
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            if (window.confirm('確定要核准此申請嗎？')) {
                                onApprove(request.id);
                                onClose();
                            }
                        }}
                    >
                        <Check size={18} style={{ marginRight: '0.5rem' }} />
                        核准
                    </button>
                </footer>
            </div>
        </div>
    );
}
