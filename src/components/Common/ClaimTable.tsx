import { Claim, Payment, User } from '../../types';
import StatusBadge from './StatusBadge';

interface ClaimTableProps {
    claims: Claim[];
    emptyMessage: string;
    renderActions?: (claim: Claim) => React.ReactNode;
    onRowClick?: (claim: Claim) => void;
    showApprover?: boolean;
    availableUsers?: User[];
    selectable?: boolean;
    selectedIds?: string[];
    onSelectChange?: (id: string) => void;
    payments?: Payment[];
    loading?: boolean;
}

const ClaimTable = ({
    claims,
    emptyMessage,
    renderActions,
    onRowClick,
    showApprover,
    availableUsers,
    selectable,
    selectedIds,
    onSelectChange,
    payments,
    loading
}: ClaimTableProps) => {
    // Helper to get approver name for a claim
    const getApproverName = (claim: Claim) => {
        if (!availableUsers) return '-';
        const applicant = availableUsers.find((u: any) => u.id === claim.applicantId);
        if (applicant?.approverId) {
            const approver = availableUsers.find((u: any) => u.id === applicant.approverId);
            if (approver) return approver.name;
        }
        // If claim is pending_finance or beyond, it's with finance
        if (['pending_finance', 'pending_finance_review', 'approved'].includes(claim.status)) {
            return '財務部門';
        }
        return '-';
    };

    const getPaymentDate = (claim: Claim) => {
        if (claim.status !== 'completed' || !payments) return '-';
        // Find payment containing this claim
        const payment = payments.find((p: any) => p.claimIds.includes(claim.id));
        return payment ? payment.paymentDate : '-';
    }

    const getApplicantName = (claim: Claim) => {
        if (claim.applicant?.name) return claim.applicant.name;
        if (!availableUsers) return claim.applicantId || '-';
        const user = availableUsers.find((u: any) => u.id === claim.applicantId);
        return user ? user.name : (claim.applicantId || '-');
    };

    return (
        <table className="vendor-table" style={{ tableLayout: 'fixed', width: '980px', marginBottom: '1rem' }}>
            <thead>
                <tr>
                    {selectable && <th style={{ width: '36px' }}></th>}
                    <th style={{ width: '80px' }}>申請編號</th>
                    <th style={{ width: '90px' }}>申請日期</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>狀態</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>類型</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>申請人</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>付款對象</th>
                    {showApprover && <th style={{ width: '100px', textAlign: 'center' }}>審核者</th>}
                    <th style={{ width: '160px' }}>說明</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>金額</th>
                    {payments && <th style={{ width: '90px' }}>付款日期</th>}
                    {renderActions && <th style={{ width: '70px', textAlign: 'right' }}>操作</th>}
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <tr>
                        <td
                            colSpan={8 + (selectable ? 1 : 0) + (showApprover ? 1 : 0) + (payments ? 1 : 0) + (renderActions ? 1 : 0)}
                            style={{ textAlign: 'center', padding: '2rem' }}
                        >
                            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                            <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>載入中...</div>
                        </td>
                    </tr>
                ) : claims.length === 0 ? (
                    <tr>
                        <td
                            colSpan={8 + (selectable ? 1 : 0) + (showApprover ? 1 : 0) + (payments ? 1 : 0) + (renderActions ? 1 : 0)}
                            className="empty-state"
                            style={{ textAlign: 'center' }}
                        >
                            {emptyMessage}
                        </td>
                    </tr>
                ) : (
                    claims.map((claim: Claim) => {
                        const hasNoReceipt = !!claim.noReceiptReason;
                        const isPendingEvidence = claim.status === 'pending_evidence';
                        const rowStyle: React.CSSProperties = {
                            cursor: onRowClick ? 'pointer' : 'default',
                            transition: 'background-color 0.2s',
                            backgroundColor: hasNoReceipt ? 'rgba(245, 158, 11, 0.05)' : isPendingEvidence ? 'rgba(239, 68, 68, 0.03)' : undefined
                        };

                        return (
                            <tr
                                key={claim.id}
                                onClick={() => onRowClick && onRowClick(claim)}
                                style={rowStyle}
                                className={hasNoReceipt ? 'has-no-receipt' : ''}
                            >
                                {selectable && (
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds?.includes(claim.id)}
                                            onChange={() => onSelectChange && onSelectChange(claim.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                )}
                                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#{claim.id.slice(0, 8)}</td>
                                <td style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{claim.date}</td>
                                <td style={{ whiteSpace: 'nowrap' }}><StatusBadge status={claim.status} /></td>
                                <td>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                        {claim.type === 'employee' ? '員工報銷' : (claim.type === 'vendor' || claim.type === 'payment') ? '廠商請款' : '個人勞務'}
                                    </span>
                                </td>
                                <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                                    {getApplicantName(claim)}
                                </td>
                                <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{claim.payee}</div>
                                </td>
                                {showApprover && (
                                    <td style={{ fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {getApproverName(claim)}
                                    </td>
                                )}
                                <td style={{ padding: '1.25rem 1rem' }}>
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {claim.description}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, minWidth: '70px' }}>
                                        <span>$</span>
                                        <span>{claim.amount.toLocaleString()}</span>
                                    </div>
                                </td>
                                {payments && (
                                    <td style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                        {getPaymentDate(claim)}
                                    </td>
                                )}
                                {renderActions && (
                                    <td onClick={(e) => e.stopPropagation()}>
                                        {renderActions(claim)}
                                    </td>
                                )}
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );
};

export default ClaimTable;
