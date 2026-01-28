import { Payment } from '../../types';

interface PaymentRecordTableProps {
    payments: Payment[];
    emptyMessage?: string;
    onRowClick?: (payment: Payment) => void;
}

const PaymentRecordTable = ({ payments, emptyMessage, onRowClick }: PaymentRecordTableProps) => (
    <table className="vendor-table">
        <thead>
            <tr>
                <th style={{ whiteSpace: 'nowrap' }}>付款編號</th>
                <th style={{ whiteSpace: 'nowrap' }}>付款日期</th>
                <th style={{ whiteSpace: 'nowrap' }}>付款對象</th>
                <th style={{ whiteSpace: 'nowrap' }}>付款金額</th>
                <th style={{ whiteSpace: 'nowrap' }}>申請單數</th>
            </tr>
        </thead>
        <tbody>
            {payments.length === 0 ? (
                <tr><td colSpan={5} className="empty-state" style={{ textAlign: 'center' }}>{emptyMessage || "無付款紀錄"}</td></tr>
            ) : (
                payments.map((payment: any) => (
                    <tr
                        key={payment.id}
                        onClick={() => onRowClick && onRowClick(payment)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                    >
                        <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#{payment.id}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.paymentDate}</td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{payment.payee}</td>
                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                                <span>$</span>
                                <span>{payment.amount.toLocaleString()}</span>
                            </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{payment.claimIds.length} 筆</td>
                    </tr>
                ))
            )}
        </tbody>
    </table >
);

export default PaymentRecordTable;
