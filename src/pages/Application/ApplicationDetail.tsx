import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import StatusBadge from '../../components/Common/StatusBadge';
import { ArrowLeft, CheckCircle, Send, Trash2, AlertCircle, Edit2, Undo2, Check, X } from 'lucide-react';


export default function ApplicationDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { claims, updateClaimStatus, deleteClaim, currentUser, availableUsers } = useApp();

    const claim = claims.find(c => c.id === id);

    // Check if current user can approve this claim
    const canApprove = (() => {
        if (!claim) return false;

        // Manager approval for pending_approval status
        if (claim.status === 'pending_approval') {
            const applicant = availableUsers.find(u => u.id === claim.applicantId);
            // Current user is the approver for this applicant
            if (applicant?.approverId === currentUser.id) return true;
        }

        // Finance approval for pending_finance or pending_finance_review status
        if (claim.status === 'pending_finance' || claim.status === 'pending_finance_review') {
            if (currentUser.permissions.includes('finance_audit')) return true;
        }

        return false;
    })();

    // Handle approval
    const handleApprove = () => {
        if (!claim || !id) return;

        const confirmMsg = claim.status === 'pending_finance_review'
            ? '確定要確認此憑證嗎？'
            : '確定要核准此申請單嗎？';

        if (confirm(confirmMsg)) {
            if (claim.status === 'pending_approval') {
                updateClaimStatus(id, 'pending_finance');
            } else if (claim.status === 'pending_finance') {
                updateClaimStatus(id, 'approved');
            } else if (claim.status === 'pending_finance_review') {
                updateClaimStatus(id, 'completed');
            }
            navigate('/?tab=claim_approvals');
        }
    };

    // Handle rejection
    const handleReject = () => {
        if (!claim || !id) return;

        const confirmMsg = claim.status === 'pending_finance_review'
            ? '確定要駁回此憑證嗎？(將退回至待補件狀態)'
            : '確定要退回此申請單嗎？';

        if (confirm(confirmMsg)) {
            if (claim.status === 'pending_finance_review') {
                updateClaimStatus(id, 'pending_evidence');
            } else {
                updateClaimStatus(id, 'rejected');
            }
            navigate('/?tab=claim_approvals');
        }
    };


    if (!claim) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 className="heading-md">找不到此申請單</h2>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>返回首頁</Link>
            </div>
        );
    }

    const handleStatusChange = (newStatus: any) => {
        if (id) updateClaimStatus(id, newStatus);
    };

    const handleDelete = () => {
        if (id && confirm('您確定要刪除此申請單嗎？')) {
            deleteClaim(id);
            navigate('/');
        }
    };

    return (
        <div className="reimburse-container">
            <header className="reimburse-header">
                <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: '0.5rem' }}>
                    <ArrowLeft size={16} /> 回上一頁
                </button>
                <div className="detail-actions">
                    <div>
                        <div className="detail-title-group">
                            <h1 className="heading-lg">申請單 #{claim.id}</h1>
                            <StatusBadge status={claim.status} />
                        </div>
                        <p className="reimburse-subtitle">建立日期 {claim.date}</p>
                    </div>

                    {/* Action Buttons based on Status */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {claim.status === 'draft' && (
                            <>
                                <button onClick={handleDelete} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger-bg)', backgroundColor: 'var(--color-danger-bg)' }}>
                                    <Trash2 size={18} /> 刪除
                                </button>
                                <button onClick={() => {
                                    if (claim.type === 'service') navigate(`/applications/service/${claim.id}`);
                                    else if (claim.type === 'payment') navigate(`/payment-request/${claim.id}`);
                                    else navigate(`/reimburse/${claim.id}`);
                                }} className="btn btn-secondary">
                                    <Edit2 size={18} /> 編輯
                                </button>
                                <button onClick={() => handleStatusChange('pending_approval')} className="btn btn-primary">
                                    <Send size={18} /> 提交申請
                                </button>
                            </>
                        )}

                        {/* Withdraw to Draft */}
                        {(claim.status === 'pending_approval' || claim.status === 'pending_finance') && (
                            <button onClick={() => {
                                handleStatusChange('draft');
                                // Navigate to edit page after withdrawing
                                if (claim.type === 'service') navigate(`/applications/service/${claim.id}`);
                                else if (claim.type === 'payment') navigate(`/payment-request/${claim.id}`);
                                else navigate(`/reimburse/${claim.id}`);
                            }} className="btn btn-ghost" style={{ color: 'var(--color-warning)', border: '1px solid var(--color-warning)', backgroundColor: 'transparent' }}>
                                <Undo2 size={18} /> 撤回至草稿
                            </button>
                        )}

                        {/* Approval/Rejection buttons for approvers */}
                        {canApprove && (
                            <>
                                <button onClick={handleApprove} className="btn btn-primary">
                                    <Check size={18} /> {claim.status === 'pending_finance_review' ? '確認憑證' : '核准'}
                                </button>
                                <button onClick={handleReject} className="btn" style={{ color: 'var(--color-danger)', border: '1px solid var(--color-danger)', backgroundColor: 'transparent' }}>
                                    <X size={18} /> {claim.status === 'pending_finance_review' ? '退回補件' : '退回'}
                                </button>
                            </>
                        )}

                        {/* Read Only logic for Applicant mainly */}
                        {!canApprove && ['pending_approval', 'pending_finance', 'pending_evidence', 'pending_finance_review'].includes(claim.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                                <CheckCircle size={20} /> 審核中
                            </div>
                        )}

                        {(claim.status === 'approved' || claim.status === 'paid' || claim.status === 'completed') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: '600' }}>
                                <CheckCircle size={20} /> 已完成 / 待付款
                            </div>
                        )}

                        {claim.status === 'pending_evidence' && (
                            <button onClick={() => alert('此功能尚未實作 (上傳憑證)')} className="btn" style={{ backgroundColor: 'var(--color-warning)', color: 'white' }}>
                                <AlertCircle size={18} /> 上傳憑證
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="card">
                <div className="detail-meta-grid">
                    <div>
                        <label className="form-group label">
                            申請類型
                        </label>
                        <div className="meta-value-caps">
                            {claim.type === 'employee' ? '個人報銷' : claim.type === 'service' ? '勞務付款' : '廠商付款'}
                        </div>
                    </div>


                    <div>
                        <label className="form-group label">
                            受款人
                        </label>
                        <div className="meta-value">
                            {claim.payee}
                        </div>
                    </div>

                    <div>
                        <label className="form-group label">
                            總金額
                        </label>
                        <div className="meta-value-lg">
                            ${claim.amount.toLocaleString()}
                        </div>
                    </div>

                    <div>
                        <label className="form-group label">
                            申請日期
                        </label>
                        <div className="meta-value">
                            {claim.date}
                        </div>
                    </div>

                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h3 className="heading-md" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                        申請說明：{claim.description}
                    </h3>

                    {/* Service Payment Specific Details */}
                    {claim.type === 'service' && claim.serviceDetails && (
                        <div className="card" style={{ backgroundColor: 'var(--color-bg)', border: 'none', marginBottom: '1.5rem' }}>
                            <h4 className="heading-md" style={{ fontSize: '1rem', marginBottom: '1rem' }}>勞務報酬單明細</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>身分證字號:</span> {claim.serviceDetails.idNumber}
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>電子信箱:</span> {claim.serviceDetails.email}
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>戶籍地址:</span> {claim.serviceDetails.registeredAddress}
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>勞務期間:</span> {claim.serviceDetails.servicePeriodStart} ~ {claim.serviceDetails.servicePeriodEnd}
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>應付金額:</span> <strong>${Number(claim.amount).toLocaleString()}</strong>
                                </div>
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                    匯款資訊: ({claim.serviceDetails.bankCode}) {claim.serviceDetails.bankName} - {claim.serviceDetails.bankAccount}
                                </div>
                                {(claim.serviceDetails.idFrontImage || claim.serviceDetails.idBackImage || claim.serviceDetails.bankBookImage) && (
                                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>附件: </span>
                                        {claim.serviceDetails.idFrontImage && <span style={{ marginRight: '1rem', fontSize: '0.85rem' }}>📄 {claim.serviceDetails.idFrontImage}</span>}
                                        {claim.serviceDetails.idBackImage && <span style={{ marginRight: '1rem', fontSize: '0.85rem' }}>📄 {claim.serviceDetails.idBackImage}</span>}
                                        {claim.serviceDetails.bankBookImage && <span style={{ fontSize: '0.85rem' }}>📄 {claim.serviceDetails.bankBookImage}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Vendor Payment Specific Details */}
                    {claim.type === 'payment' && claim.paymentDetails && (
                        <div className="card" style={{ backgroundColor: 'var(--color-bg)', border: 'none', marginBottom: '1.5rem' }}>
                            <h4 className="heading-md" style={{ fontSize: '1rem', marginBottom: '1rem' }}>付款申請明細</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>交易內容:</span> {claim.paymentDetails.transactionContent}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>發票狀態:</span>
                                    <span className={`status-badge status-${claim.paymentDetails.invoiceStatus === 'obtained' ? 'approved' : 'pending'}`}>
                                        {claim.paymentDetails.invoiceStatus === 'obtained' ? '已取得' :
                                            claim.paymentDetails.invoiceStatus === 'not_yet' ? '尚未取得' : '無法取得'}
                                    </span>
                                </div>

                                {claim.paymentDetails.invoiceNumber && (
                                    <div>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>發票號碼:</span> {claim.paymentDetails.invoiceNumber}
                                    </div>
                                )}

                                {claim.paymentDetails.payerNotes && (
                                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>備註:</span> {claim.paymentDetails.payerNotes}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <h4 className="heading-md" style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>費用明細</h4>
                    <table className="vendor-table" style={{ marginTop: '0.5rem' }}>
                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>類別</th>
                                <th>項目/說明</th>
                                <th>備註</th>
                                <th style={{ textAlign: 'right' }}>金額</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claim.items && claim.items.length > 0 ? (
                                claim.items.map((item, idx) => (
                                    <tr key={item.id || idx}>
                                        <td>{item.date}</td>
                                        <td>
                                            {item.category && <span className="status-badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', fontSize: '0.75rem' }}>{item.category}</span>}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{item.description}</td>
                                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{item.notes || '-'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${item.amount.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>無明細資料 (舊資料或格式問題)</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>總計</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                                    ${claim.amount.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
