'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building, Trash2, Edit2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BANK_LIST } from '@/utils/constants';
import Pagination from '@/components/Common/Pagination';
import PageHeader from '@/components/Common/PageHeader';
import { createVendorRequest } from '@/app/actions/vendors';
import { Vendor, VendorRequest, User } from '@/types';
import { todayISO } from '@/utils/date';

interface VendorListClientProps {
    currentUser: User;
    vendors: Vendor[];
    vendorRequests: VendorRequest[];
    pagination: any;
    isLoading: boolean;
}

function useDebouncedValue<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timeoutId = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timeoutId);
    }, [value, delay]);
    return debounced;
}

export default function VendorListClient({ currentUser, vendors, vendorRequests, pagination, isLoading }: VendorListClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [searchInput, setSearchInput] = useState(query);
    const debouncedSearch = useDebouncedValue(searchInput, 300);
    const [localRequests, setLocalRequests] = useState<VendorRequest[]>(vendorRequests);

    useEffect(() => {
        setSearchInput(query);
    }, [query]);

    useEffect(() => {
        setLocalRequests(vendorRequests);
    }, [vendorRequests]);

    useEffect(() => {
        if (debouncedSearch === query) return;
        const params = new URLSearchParams(searchParams.toString());
        if (debouncedSearch.trim()) {
            params.set('q', debouncedSearch.trim());
        } else {
            params.delete('q');
        }
        params.set('page', '1');
        router.push(`/vendors?${params.toString()}`);
    }, [debouncedSearch, query, router, searchParams]);

    const canManageVendors = currentUser && (currentUser.permissions.includes('general') || currentUser.permissions.includes('finance_audit'));

    const getPendingAction = (vendorId: string) => {
        return localRequests.find(r => r.status === 'pending' && (r.vendorId === vendorId));
    };

    const pendingAddRequests = localRequests.filter(r => r.status === 'pending' && r.type === 'add' && r.data);

    // Merge actual vendors and pending additions
    let displayVendors = [
        ...vendors.map(v => ({ ...v, isPendingAdd: false })),
        ...pendingAddRequests.map(r => ({ ...(r.data as any), id: (r.data as any)?.id || `temp-${Math.random()}`, isPendingAdd: true }))
    ];

    if (debouncedSearch.trim()) {
        const normalized = debouncedSearch.toLowerCase();
        displayVendors = displayVendors.filter(v =>
            (v.name || '').toLowerCase().includes(normalized) ||
            (v.serviceContent && v.serviceContent.toLowerCase().includes(normalized)) ||
            (v.bankAccount && v.bankAccount.includes(normalized))
        );
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(page));
        router.push(`/vendors?${params.toString()}`);
    };

    const handleDeleteRequest = async (vendorId: string) => {
        if (window.confirm('確定要申請刪除此廠商嗎？')) {
            const tempId = `temp-${Date.now()}`;
            const optimisticRequest: VendorRequest = {
                id: tempId,
                type: 'delete',
                status: 'pending',
                vendorId,
                timestamp: todayISO(),
                data: {},
                originalData: vendors.find(v => v.id === vendorId),
                applicantName: currentUser.name,
            } as VendorRequest;

            setLocalRequests(prev => [optimisticRequest, ...prev]);

            const result = await createVendorRequest({
                type: 'delete',
                vendorId,
                originalData: optimisticRequest.originalData,
                data: {}
            });

            if (result.success) {
                router.refresh();
            } else {
                setLocalRequests(prev => prev.filter(r => r.id !== tempId));
                alert('申請失敗: ' + result.error);
            }
        }
    };

    const headerAction = canManageVendors && (
        <Link
            href="/vendors/add"
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
        >
            <Plus size={20} style={{ marginRight: '4px' }} />
            新增廠商
        </Link>
    );

    return (
        <div className="container">
            <PageHeader
                title="廠商列表"
                subtitle="管理您的付款對象。"
                action={headerAction || undefined}
            />

            <div className="card card-flush vendor-table-container" style={{ overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="search-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '300px' }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input
                            type="text"
                            placeholder="搜尋廠商..."
                            className="search-input"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>
                    <Pagination
                        currentPage={pagination?.currentPage || 1}
                        totalPages={pagination?.totalPages || 1}
                        onPageChange={handlePageChange}
                    />
                </div>
                <table className="vendor-table" style={{ tableLayout: 'fixed', width: '1080px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '120px', textAlign: 'center' }}>狀態</th>
                            <th style={{ width: '250px' }}>廠商名稱</th>
                            <th style={{ width: '300px' }}>服務內容</th>
                            <th style={{ width: '250px' }}>銀行資訊</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>載入中...</div>
                                </td>
                            </tr>
                        ) : displayVendors.map((vendor: any) => {
                            const pendingRequest = getPendingAction(vendor.id);

                            return (
                                <tr key={vendor.id}>
                                    <td style={{ textAlign: 'center', width: '120px', whiteSpace: 'nowrap' }}>
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
                                    <td style={{ width: '250px', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem' }}>
                                            <Building size={16} className="text-secondary" style={{ flexShrink: 0 }} />
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendor.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ width: '300px', whiteSpace: 'nowrap' }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{vendor.serviceContent || '-'}</div>
                                    </td>
                                    <td style={{ width: '250px', whiteSpace: 'nowrap' }}>
                                        {vendor.bankCode ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                                <span style={{ fontWeight: 500, flexShrink: 0 }}>
                                                    ({vendor.bankCode} {BANK_LIST.find(b => b.code === vendor.bankCode)?.name})
                                                </span>
                                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{vendor.bankAccount}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#ccc' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ width: '120px', whiteSpace: 'nowrap' }}>
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
                        {!isLoading && displayVendors.length === 0 && (
                            <tr>
                                <td colSpan={5} className="empty-state" style={{ textAlign: 'center' }}>
                                    {query ? '找不到符合關鍵字的廠商。' : '找不到廠商。請新增一筆資料。'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
