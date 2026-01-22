import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building } from 'lucide-react';


export default function VendorList() {
    const { vendors, requestDeleteVendor, vendorRequests, userRole } = useApp();

    const getPendingAction = (vendorId: string) => {
        return vendorRequests.find(r => r.status === 'pending' && (r.vendorId === vendorId || (r.type === 'add' && r.data?.id === vendorId)));
    };

    return (
        <div>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">廠商管理</h1>
                    <p className="vendor-subtitle">管理您的付款對象。</p>
                </div>
                {userRole === 'applicant' && (
                    <Link to="/vendors/add" className="btn btn-primary">
                        <Plus size={18} />
                        新增廠商
                    </Link>
                )}
            </header>

            <div className="card search-card">
                <div className="search-field">
                    <Search size={20} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="搜尋廠商..."
                        className="search-input"
                    />
                </div>
            </div>

            <div className="card vendor-table-container">
                <table className="vendor-table">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>廠商名稱</th>
                            <th style={{ width: '25%' }}>服務內容</th>
                            <th style={{ width: '30%' }}>銀行資訊</th>
                            <th style={{ width: '20%', textAlign: 'right' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.map(vendor => {
                            const pendingRequest = getPendingAction(vendor.id);

                            return (
                                <tr key={vendor.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" />
                                            {vendor.name}
                                            {pendingRequest && (
                                                <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', marginLeft: '0.5rem' }}>
                                                    {pendingRequest.type === 'delete' ? '待刪除' : '待更新'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {vendor.serviceContent || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                                        {vendor.bankCode ? (
                                            <>
                                                <div style={{ fontWeight: 500 }}>
                                                    ({vendor.bankCode}) {vendor.bankAccount}
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#ccc' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            {userRole === 'applicant' ? (
                                                <>
                                                    <Link
                                                        to={`/vendors/edit/${vendor.id}`}
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                    >
                                                        編輯
                                                    </Link>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                                                        onClick={() => {
                                                            if (window.confirm('確定要申請刪除此廠商嗎？')) {
                                                                requestDeleteVendor(vendor.id);
                                                                alert('刪除申請已提交審核。');
                                                            }
                                                        }}
                                                    >
                                                        刪除
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                    僅供檢視
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {vendors.length === 0 && (
                            <tr>
                                <td colSpan="5" className="empty-state">
                                    找不到廠商。請新增一筆資料。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
