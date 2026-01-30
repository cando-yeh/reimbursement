

interface VendorRequestTableProps {
    requests: any[];
    onRowClick?: (request: any) => void;
}

const VendorRequestTable = ({ requests, onRowClick }: VendorRequestTableProps) => (
    <table className="vendor-table" style={{ tableLayout: 'fixed', width: '1280px', marginBottom: '1rem' }}>
        <thead>
            <tr>
                <th style={{ width: '120px', textAlign: 'center' }}>申請類型</th>
                <th style={{ width: '400px' }}>廠商名稱</th>
                <th style={{ width: '120px', textAlign: 'center' }}>狀態</th>
                <th style={{ width: '250px', textAlign: 'center' }}>申請人</th>
                <th style={{ width: '150px', textAlign: 'center' }}>申請日期</th>
                <th style={{ width: 'auto' }}></th>
            </tr>
        </thead>
        <tbody>
            {requests.length === 0 ? (
                <tr><td colSpan={5} className="empty-state" style={{ textAlign: 'center' }}>無廠商異動申請</td></tr>
            ) : (
                requests.map((req: any) => (
                    <tr
                        key={req.id}
                        onClick={() => onRowClick && onRowClick(req)}
                        style={{ cursor: onRowClick ? 'pointer' : 'default', transition: 'background-color 0.2s' }}
                    >
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <span className={`status-badge ${req.type === 'add' ? 'approved' : req.type === 'delete' ? 'pending' : 'paid'}`}>
                                {req.type === 'add' ? '新增' : req.type === 'update' ? '修改' : '刪除'}
                            </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{req.data?.name || req.originalData?.name}</td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <span className={`status-badge ${req.status === 'approved' ? 'approved' : req.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                {req.status === 'approved' ? '已核准' : req.status === 'rejected' ? '已拒絕' : '待核准'}
                            </span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {req.applicantName || '-'}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{req.timestamp}</td>
                    </tr>
                ))
            )}
        </tbody>
    </table>
);

export default VendorRequestTable;
