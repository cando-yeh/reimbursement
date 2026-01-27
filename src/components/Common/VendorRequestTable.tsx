

interface VendorRequestTableProps {
    requests: any[];
    onRowClick?: (request: any) => void;
}

const VendorRequestTable = ({ requests, onRowClick }: VendorRequestTableProps) => (
    <table className="vendor-table">
        <thead>
            <tr>
                <th>申請類型</th>
                <th>廠商名稱</th>
                <th>狀態</th>
                <th>申請人</th>
                <th>申請日期</th>
            </tr>
        </thead>
        <tbody>
            {requests.length === 0 ? (
                <tr><td colSpan={5} className="empty-state">無廠商異動申請</td></tr>
            ) : (
                requests.map((req: any) => (
                    <tr
                        key={req.id}
                        onClick={() => onRowClick && onRowClick(req)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                        className="hover:bg-gray-50"
                    >
                        <td>
                            <span className={`status-badge ${req.type === 'add' ? 'approved' : req.type === 'delete' ? 'pending' : 'paid'}`}>
                                {req.type === 'add' ? '新增' : req.type === 'update' ? '修改' : '刪除'}
                            </span>
                        </td>
                        <td>{req.data?.name || req.originalData?.name}</td>
                        <td>
                            <span className={`status-badge ${req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                {req.status === 'approved' ? '已核准' : req.status === 'rejected' ? '已拒絕' : '待核准'}
                            </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>
                            {req.applicantName || '-'}
                        </td>
                        <td>{req.timestamp}</td>
                    </tr>
                ))
            )}
        </tbody>
    </table>
);

export default VendorRequestTable;
