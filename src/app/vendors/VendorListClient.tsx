'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building, Trash2, Edit2 } from 'lucide-react';
import { BANK_LIST } from '@/utils/constants';
import Pagination from '@/components/Common/Pagination';
import { useApp } from '@/context/AppContext';

interface VendorListClientProps {
    initialVendors: any[];
    initialRequests: any[];
    currentUser: any;
}

export default function VendorListClient({ initialVendors, initialRequests, currentUser }: VendorListClientProps) {
    const { requestDeleteVendor } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const canManageVendors = currentUser && (currentUser.permissions.includes('general') || currentUser.permissions.includes('finance_audit'));

    const getPendingAction = (vendorId: string) => {
        return initialRequests.find(r => r.status === 'pending' && (r.vendorId === vendorId));
    };

    const pendingAddRequests = initialRequests.filter(r => r.status === 'pending' && r.type === 'add' && r.data);

    // Merge actual vendors and pending additions
    let displayVendors = [
        ...initialVendors.map(v => ({ ...v, isPendingAdd: false })),
        ...pendingAddRequests.map(r => ({ ...r.data, id: r.data.id || `temp-${Math.random()}`, isPendingAdd: true }))
    ];

    if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        displayVendors = displayVendors.filter(v =>
            v.name.toLowerCase().includes(query) ||
            (v.serviceContent && v.serviceContent.toLowerCase().includes(query)) ||
            (v.bankAccount && v.bankAccount.includes(query))
        );
    }

    const ITEMS_PER_PAGE = 10;
    const paginatedVendors = displayVendors.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleDeleteRequest = async (vendorId: string) => {
        if (window.confirm('確定要申請刪除此廠商嗎？')) {
            const success = await requestDeleteVendor(vendorId);
            if (success) {
                // message handled in context
                window.location.reload(); // Still might want reload to update server list? 
                // But context has new requests.
                // VendorListClient uses `initialRequests` prop OR context?
                // It uses props. So reload is needed for THIS page listing until we refactor it to use context too.
                // But context update ensures Reviews page (Dashboard) is correct.
            }
        }
    };

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <header className="vendor-header">
                <div>
                    <h1 className="heading-lg">廠商列表</h1>
                    <p className="vendor-subtitle">管理您的付款對象。</p>
                </div>
                {canManageVendors && (
                    <Link
                        href="/vendors/add"
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
                            <th>狀態</th>
                            <th>廠商名稱</th>
                            <th>服務內容</th>
                            <th>銀行資訊</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedVendors.map((vendor: any) => {
                            const pendingRequest = getPendingAction(vendor.id);

                            return (
                                <tr key={vendor.id}>
                                    <td>
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
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" />
                                            {vendor.name}
                                        </div>
                                    </td>
                                    <td>
                                        {vendor.serviceContent || '-'}
                                    </td>
                                    <td>
                                        {vendor.bankCode ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontWeight: 500 }}>
                                                    ({vendor.bankCode} {BANK_LIST.find(b => b.code === vendor.bankCode)?.name})
                                                </span>
                                                <span>{vendor.bankAccount}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#ccc' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            {canManageVendors && !vendor.isPendingAdd && !pendingRequest ? (
                                                <>
                                                    <Link
                                                        href={`/vendors/edit/${vendor.id}`}
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                        title="編輯"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Link>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                                                        onClick={() => handleDeleteRequest(vendor.id)}
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                    {vendor.isPendingAdd ? '審核中' : '鎖定中'}
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
