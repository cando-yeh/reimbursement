import { useApp } from '../../context/AppContext';
import { Check, X, Building } from 'lucide-react';

export default function VendorRequests() {
    const { vendorRequests, approveVendorRequest, rejectVendorRequest } = useApp();

    const getRequestTypeLabel = (type: string) => {
        switch (type) {
            case 'add': return <span className="status-badge pending">新增廠商</span>;
            case 'update': return <span className="status-badge warning">資料更新</span>;
            case 'delete': return <span className="status-badge" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>刪除</span>;
            default: return type;
        }
    };

    const pendingRequests = vendorRequests.filter(r => r.status === 'pending');

    return (
        <div>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">廠商核准</h1>
                    <p className="vendor-subtitle">審核廠商資料變更請求。</p>
                </div>
            </header>

            <div className="card">
                {pendingRequests.length === 0 ? (
                    <div className="empty-state">
                        無待審核的廠商請求。
                    </div>
                ) : (
                    <table className="vendor-table">
                        <thead>
                            <tr>
                                <th>類型</th>
                                <th>廠商</th>
                                <th>詳情</th>
                                <th>日期</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequests.map(request => (
                                <tr key={request.id}>
                                    <td>{getRequestTypeLabel(request.type)}</td>
                                    <td style={{ fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" />
                                            {request.data?.name || request.originalData?.name}
                                        </div>
                                    </td>
                                    <td className="text-secondary">
                                        {request.type === 'add' && request.data && (
                                            <div>
                                                <div>服務: {request.data.serviceContent}</div>
                                                <div>銀行: ({request.data.bankCode}) {request.data.bankAccount}</div>
                                            </div>
                                        )}
                                        {request.type === 'update' && (
                                            <div>
                                                變更請求
                                            </div>
                                        )}
                                        {request.type === 'delete' && (
                                            <div>刪除請求</div>
                                        )}
                                    </td>
                                    <td className="text-secondary">{request.timestamp}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '0.5rem', backgroundColor: 'var(--color-success)', color: 'white' }}
                                                onClick={() => approveVendorRequest(request.id)}
                                                title="Approve"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ padding: '0.5rem', color: 'var(--color-danger)' }}
                                                onClick={() => rejectVendorRequest(request.id)}
                                                title="Reject"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
