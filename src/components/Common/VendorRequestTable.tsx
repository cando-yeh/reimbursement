import { Check, X } from 'lucide-react';

interface VendorRequestTableProps {
    requests: any[];
    showActions?: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

const VendorRequestTable = ({ requests, showActions, onApprove, onReject }: VendorRequestTableProps) => (
    <table className="vendor-table">
        <thead>
            <tr>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '100px' }}>申請類型</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '200px' }}>廠商名稱</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '120px' }}>狀態</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '150px' }}>申請日期</th>
                {showActions && <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '150px' }}>操作</th>}
            </tr>
        </thead>
        <tbody>
            {requests.length === 0 ? (
                <tr><td colSpan={showActions ? 5 : 4} className="empty-state">無廠商異動申請</td></tr>
            ) : (
                requests.map((req: any) => (
                    <tr key={req.id}>
                        <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${req.type === 'add' ? 'approved' : req.type === 'delete' ? 'pending' : 'paid'}`}>
                                {req.type === 'add' ? '新增' : req.type === 'update' ? '修改' : '刪除'}
                            </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{req.data?.name || req.originalData?.name}</td>
                        <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                {req.status === 'approved' ? '已核准' : req.status === 'rejected' ? '已拒絕' : '待核准'}
                            </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{req.timestamp}</td>
                        {showActions && (
                            <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem' }} onClick={() => onApprove(req.id)}>
                                        <Check size={16} /> <span style={{ marginLeft: '0.25rem' }}>核准</span>
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', color: 'var(--color-danger)' }} onClick={() => onReject(req.id)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </td>
                        )}
                    </tr>
                ))
            )}
        </tbody>
    </table>
);

export default VendorRequestTable;
