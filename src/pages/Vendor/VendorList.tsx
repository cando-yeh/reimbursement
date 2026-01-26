import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building, Trash2, Edit2 } from 'lucide-react';


export default function VendorList() {
    const { vendors, requestDeleteVendor, vendorRequests, currentUser } = useApp();

    const canManageVendors = currentUser.permissions.includes('general') || currentUser.permissions.includes('finance_audit');

    const getPendingAction = (vendorId: string) => {
        return vendorRequests.find(r => r.status === 'pending' && (r.vendorId === vendorId));
    };

    // Filter for pending 'add' requests to display them in the list
    const pendingAddRequests = vendorRequests.filter(r => r.status === 'pending' && r.type === 'add' && r.data);

    // Combine real vendors and pending-add vendors
    // using a type assertion or intersection to handle the temporary isPendingAdd flag efficiently
    const displayVendors = [
        ...vendors.map(v => ({ ...v, isPendingAdd: false })),
        ...pendingAddRequests.map(r => ({ ...r.data!, id: r.data!.id!, isPendingAdd: true }))
    ] as (typeof vendors[0] & { isPendingAdd: boolean })[];

    return (
        <div>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">廠商管理</h1>
                    <p className="vendor-subtitle">管理您的付款對象。</p>
                </div>
                {canManageVendors && (
                    <Link to="/vendors/add" className="btn btn-primary" title="新增廠商" style={{ padding: '0.5rem', minWidth: 'auto' }}>
                        <Plus size={20} />
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
                            <th style={{ width: '25%', minWidth: '300px', textAlign: 'center' }}>廠商名稱</th>
                            <th style={{ width: '25%', textAlign: 'center' }}>服務內容</th>
                            <th style={{ width: '30%', textAlign: 'center', whiteSpace: 'nowrap' }}>銀行資訊</th>
                            <th style={{ width: '20%', textAlign: 'center' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayVendors.map(vendor => {
                            const pendingRequest = getPendingAction(vendor.id);
                            // If it's a pending add, we show the badge directly. 
                            // If it's an existing vendor, we check pendingRequest (update/delete).

                            return (
                                <tr key={vendor.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" />
                                            {vendor.name}
                                            {vendor.isPendingAdd ? (
                                                <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                                                    待新增
                                                </span>
                                            ) : pendingRequest && (
                                                <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
                                                    {pendingRequest.type === 'delete' ? '待刪除' : '待更新'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                                        {vendor.serviceContent || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                                            {canManageVendors && !vendor.isPendingAdd ? (
                                                <>
                                                    <Link
                                                        to={`/vendors/edit/${vendor.id}`}
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        title="編輯"
                                                    >
                                                        <Edit2 size={16} />
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
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : vendor.isPendingAdd ? (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                    審核中
                                                </span>
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
                                <td colSpan={5} className="empty-state">
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
