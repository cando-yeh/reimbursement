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
    payments
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
        <table className="vendor-table">
            <thead>
                <tr>
                    {selectable && <th style={{ width: '40px' }}></th>}
                    <th>申請編號</th>
                    <th>申請日期</th>
                    <th>狀態</th>
                    <th>類型</th>
                    <th>申請人</th>
                    <th>付款對象</th>
                    {showApprover && <th>審核者</th>}
                    <th>說明</th>
                    <th>金額</th>
                    {payments && <th>付款日期</th>}
                    {renderActions && <th>操作</th>}
                </tr>
            </thead>
            <tbody>
                {claims.length === 0 ? (
                    <tr>
                        <td
                            colSpan={8 + (selectable ? 1 : 0) + (showApprover ? 1 : 0) + (payments ? 1 : 0) + (renderActions ? 1 : 0)}
                            className="empty-state"
                        >
                            {emptyMessage}
                        </td>
                    </tr>
                ) : (
                    claims.map((claim: Claim) => (
                        <tr
                            key={claim.id}
                            onClick={() => onRowClick && onRowClick(claim)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
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
                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>#{claim.id.slice(0, 8)}</td>
                            <td style={{ fontSize: '0.9rem' }}>{claim.date}</td>
                            <td><StatusBadge status={claim.status} /></td>
                            <td>
                                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {claim.type === 'employee' ? '員工報銷' : (claim.type === 'vendor' || claim.type === 'payment') ? '廠商付款' : '勞務報酬'}
                                </span>
                            </td>
                            <td>
                                {getApplicantName(claim)}
                            </td>
                            <td>
                                <div>{claim.payee}</div>
                            </td>
                            {showApprover && (
                                <td style={{ fontWeight: 500 }}>
                                    {getApproverName(claim)}
                                </td>
                            )}
                            <td>
                                {claim.description}
                            </td>
                            <td>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 600, gap: '0.25rem' }}>
                                    <span>$</span>
                                    <span>{claim.amount.toLocaleString()}</span>
                                </div>
                            </td>
                            {payments && (
                                <td style={{ fontSize: '0.9rem' }}>
                                    {getPaymentDate(claim)}
                                </td>
                            )}
                            {renderActions && (
                                <td onClick={(e) => e.stopPropagation()}>
                                    {renderActions(claim)}
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
};

export default ClaimTable;
