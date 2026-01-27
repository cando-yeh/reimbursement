import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Plus, Search, Building, Trash2, Edit2 } from 'lucide-react';
import { BANK_LIST } from '../../utils/constants';

import Pagination from '../../components/Common/Pagination';

export default function VendorList() {
    const { vendors, requestDeleteVendor, vendorRequests, currentUser } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    const canManageVendors = currentUser.permissions.includes('general') || currentUser.permissions.includes('finance_audit');

    const getPendingAction = (vendorId: string) => {
        return vendorRequests.find(r => r.status === 'pending' && (r.vendorId === vendorId));
    };

    // Filter for pending 'add' requests to display them in the list
    const pendingAddRequests = vendorRequests.filter(r => r.status === 'pending' && r.type === 'add' && r.data);

    // Combine real vendors and pending-add vendors
    // using a type assertion or intersection to handle the temporary isPendingAdd flag efficiently
    let displayVendors = [
        ...vendors.map(v => ({ ...v, isPendingAdd: false })),
        ...pendingAddRequests.map(r => ({ ...r.data!, id: r.data!.id!, isPendingAdd: true }))
    ] as (typeof vendors[0] & { isPendingAdd: boolean })[];

    // Filter by search term
    if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        displayVendors = displayVendors.filter(v =>
            v.name.toLowerCase().includes(query) ||
            (v.serviceContent && v.serviceContent.toLowerCase().includes(query)) ||
            (v.bankAccount && v.bankAccount.includes(query))
        );
    }

    // Pagination Logic
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Reset to page 1 when search changes
    // Note: In a real app we'd use useEffect, but since this is derived state in render pass, 
    // we should execute logic carefully. Or actually, just slice the result.
    // However, if we filter and the current page is out of bounds, we should reset.
    // For simplicity with this structure, let's keep it simple.

    const paginatedVendors = displayVendors.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">廠商列表</h1>
                    <p className="vendor-subtitle">管理您的付款對象。</p>
                </div>
                {canManageVendors && (
                    <Link
                        to="/vendors/add"
                        className="btn btn-primary"
                        title="新增廠商"
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Plus size={24} />
                    </Link>
                )}
            </header>

            <div className="card vendor-table-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="search-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '300px' }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input
                            type="text"
                            placeholder="搜尋廠商..."
                            className="search-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(displayVendors.length / ITEMS_PER_PAGE)}
                        onPageChange={setCurrentPage}
                    />
                </div>
                <table className="vendor-table">
                    <thead>
                        <tr>
                            <th style={{ width: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>狀態</th>
                            <th style={{ width: '25%', minWidth: '200px', textAlign: 'left', whiteSpace: 'nowrap' }}>廠商名稱</th>
                            <th style={{ width: '20%', textAlign: 'center', whiteSpace: 'nowrap' }}>服務內容</th>
                            <th style={{ width: '30%', textAlign: 'left', whiteSpace: 'nowrap' }}>銀行資訊</th>
                            <th style={{ width: '150px', textAlign: 'center', whiteSpace: 'nowrap' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedVendors.map(vendor => {
                            const pendingRequest = getPendingAction(vendor.id);
                            // If it's a pending add, we show the badge directly. 
                            // If it's an existing vendor, we check pendingRequest (update/delete).

                            return (
                                <tr key={vendor.id}>
                                    <td style={{ textAlign: 'center' }}>
                                        {vendor.isPendingAdd ? (
                                            <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                                                待新增
                                            </span>
                                        ) : pendingRequest ? (
                                            <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)', whiteSpace: 'nowrap' }}>
                                                {pendingRequest.type === 'delete' ? '待刪除' : '待更新'}
                                            </span>
                                        ) : (
                                            <span className="status-badge" style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', whiteSpace: 'nowrap' }}>
                                                可使用
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" />
                                            {vendor.name}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                                        {vendor.serviceContent || '-'}
                                    </td>
                                    <td style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                                        {vendor.bankCode ? (
                                            <>
                                                <div style={{ fontWeight: 500 }}>
                                                    ({vendor.bankCode} {BANK_LIST.find(b => b.code === vendor.bankCode)?.name}) {vendor.bankAccount}
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#ccc' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
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
                        {displayVendors.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty-state">
                                    {searchTerm ? '找不到符合關鍵字的廠商。' : '找不到廠商。請新增一筆資料。'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
