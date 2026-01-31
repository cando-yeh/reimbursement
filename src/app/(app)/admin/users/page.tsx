'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Permission, User } from '@/types';
import { Edit2, Trash2, X, Check } from 'lucide-react';

export default function UserManagementPage() {
    const { availableUsers, currentUser, updateUser, deleteUser } = useApp();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<'general' | 'finance'>('general');
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [editApproverId, setEditApproverId] = useState<string | undefined>(undefined);

    const startEdit = (user: User) => {
        setEditingId(user.id);
        const isFinance = user.permissions.includes('finance_audit');
        const isAdminUser = user.permissions.includes('user_management');
        setEditRole(isFinance ? 'finance' : 'general');
        setIsAdmin(isAdminUser);
        setEditApproverId(user.approverId);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditRole('general');
        setIsAdmin(false);
        setEditApproverId(undefined);
    };

    const saveEdit = async (userId: string) => {
        if (currentUser && userId === currentUser.id && currentUser.permissions.includes('user_management') && !isAdmin) {
            const otherAdmins = availableUsers.filter(u => u.id !== userId && u.permissions.includes('user_management'));
            if (otherAdmins.length === 0) {
                alert('系統必須保留至少一名管理者。');
                return;
            }
        }

        if (!editApproverId) {
            alert('核准人為必選項目。');
            return;
        }

        const newPermissions: Permission[] = ['general'];
        if (editRole === 'finance') newPermissions.push('finance_audit');
        if (isAdmin) newPermissions.push('user_management');

        let roleNameStr = editRole === 'finance' ? '財務' : '一般員工';
        if (isAdmin) roleNameStr += ' (管理員)';

        const updateData: Partial<User> = {
            permissions: newPermissions,
            roleName: roleNameStr,
            approverId: editApproverId
        };

        // Optimistic UI: Close edit mode immediately
        setEditingId(null);

        updateUser(userId, updateData).then(result => {
            if (!result.success) {
                alert('儲存失敗: ' + result.error);
                // If failed, we might want to re-open or the user will see the value revert
            }
        });
    };

    const handleDelete = (userId: string) => {
        if (confirm('確定要刪除此使用者嗎？')) {
            deleteUser(userId);
        }
    };

    if (!currentUser) return null;

    return (
        <div className="container">
            <div className="vendor-header">
                <div>
                    <h1 className="heading-lg">使用者管理</h1>
                    <p className="vendor-subtitle">管理系統使用者與權限</p>
                </div>
            </div>

            <div className="card card-flush vendor-table-container table-scroll table-top-md">
                <table className="vendor-table table-fixed table-full">
                    <thead>
                        <tr>
                            <th style={{ width: '180px' }}>姓名</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>角色</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>管理者</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>核准人</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availableUsers.map((user) => {
                            const isEditing = editingId === user.id;
                            const approver = availableUsers.find(u => u.id === user.approverId);
                            const isFinance = user.permissions.includes('finance_audit');
                            const isUserAdmin = user.permissions.includes('user_management');

                            return (
                                <tr key={user.id} style={currentUser && user.id === currentUser.id ? { backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' } : {}}>
                                    <td style={{ "whiteSpace": "nowrap", "width": "180px" }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem', paddingLeft: '0.5rem' }}>
                                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', flexShrink: 0 }}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>
                                        {isEditing ? (
                                            <select
                                                className="form-input"
                                                style={{ padding: '0.25rem', width: '100%' }}
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value as 'general' | 'finance')}
                                            >
                                                <option value="general">一般</option>
                                                <option value="finance">財務</option>
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${isFinance ? 'approved' : 'draft'}`}>
                                                {isFinance ? '財務' : '一般'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ width: '80px', whiteSpace: 'nowrap' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isAdmin}
                                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {isUserAdmin ? <Check size={16} color="var(--color-primary)" /> : <span style={{ color: '#ccc' }}>-</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', width: '150px', textAlign: 'center' }}>
                                        {isEditing ? (
                                            <select
                                                className="form-input"
                                                style={{ padding: '0.25rem', width: '100%' }}
                                                value={editApproverId || ''}
                                                onChange={(e) => setEditApproverId(e.target.value || undefined)}
                                            >
                                                <option value="" disabled>請選擇核准人</option>
                                                {availableUsers
                                                    .filter(u => u.id !== user.id)
                                                    .map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            approver ? (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{approver.name}</span>
                                                </div>
                                            ) : <span style={{ color: '#ccc', fontStyle: 'italic' }}>-</span>
                                        )}
                                    </td>

                                    <td style={{ width: '100px', whiteSpace: 'nowrap' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.25rem', width: '32px', height: '32px' }}
                                                    onClick={() => saveEdit(user.id)}
                                                    title="儲存"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '0.25rem', width: '32px', height: '32px' }}
                                                    onClick={cancelEdit}
                                                    title="取消"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '0.25rem', width: '32px', height: '32px' }}
                                                    onClick={() => startEdit(user)}
                                                    title="編輯權限"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {currentUser && user.id !== currentUser.id && (
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.25rem', width: '32px', height: '32px', color: 'var(--color-danger)' }}
                                                        onClick={() => handleDelete(user.id)}
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
