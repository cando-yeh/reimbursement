import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Permission, User } from '../../types';
import { Edit2, Trash2, X, Check } from 'lucide-react';

const UserManagement = () => {
    const { availableUsers, currentUser, updateUser, deleteUser } = useApp();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ role: 'general' | 'finance' | 'admin'; approverId?: string }>({ role: 'general' });

    // Helper to map permissions to the 3 roles
    const getRoleFromPermissions = (permissions: Permission[]): 'general' | 'finance' | 'admin' => {
        if (permissions.includes('user_management')) return 'admin';
        if (permissions.includes('finance_audit')) return 'finance';
        return 'general';
    };

    const getRoleLabel = (role: 'general' | 'finance' | 'admin') => {
        switch (role) {
            case 'general': return '一般';
            case 'finance': return '財務';
            case 'admin': return '管理者';
        }
    };

    const startEdit = (user: User) => {
        setEditingId(user.id);
        setEditForm({
            role: getRoleFromPermissions(user.permissions),
            approverId: user.approverId
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ role: 'general' });
    };

    const saveEdit = (userId: string) => {
        let newPermissions: Permission[] = ['general'];
        if (editForm.role === 'finance') {
            newPermissions = ['general', 'finance_audit'];
        } else if (editForm.role === 'admin') {
            newPermissions = ['user_management'];
        }

        // Update display RoleName as well to match
        const roleNameMap = {
            'general': '員工 (一般權限)',
            'finance': '財務 (一般+財務)',
            'admin': '管理者 (管理)'
        };

        const updateData: Partial<User> = {
            permissions: newPermissions,
            roleName: roleNameMap[editForm.role]
        };

        // Only update approverId if role is general or finance
        if (editForm.role === 'general' || editForm.role === 'finance') {
            updateData.approverId = editForm.approverId || undefined; // If empty string, set to undefined to clear it
        } else {
            updateData.approverId = undefined; // Admins generally don't have this approver field in this context
        }

        updateUser(userId, updateData);
        setEditingId(null);
    };

    const handleDelete = (userId: string) => {
        if (confirm('確定要刪除此使用者嗎？')) {
            deleteUser(userId);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="vendor-header">
                <div>
                    <h1 className="heading-lg">使用者管理</h1>
                    <p className="vendor-subtitle">管理系統使用者與權限</p>
                </div>
            </div>

            <div className="card vendor-table-container">
                <table className="vendor-table">
                    <thead>
                        <tr>
                            <th>姓名</th>
                            <th>權限</th>
                            <th>核准人</th>
                            <th>Email</th>
                            <th style={{ textAlign: 'right' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availableUsers.map((user) => {
                            const isEditing = editingId === user.id;
                            const currentRole = getRoleFromPermissions(user.permissions);
                            const approver = availableUsers.find(u => u.id === user.approverId);

                            return (
                                <tr key={user.id} style={user.id === currentUser.id ? { backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' } : {}}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                                {user.name.charAt(0)}
                                            </div>
                                            <div style={{ fontWeight: 500 }}>{user.name}</div>
                                        </div>
                                    </td>
                                    <td>
                                        {isEditing ? (
                                            <select
                                                className="form-input"
                                                style={{ padding: '0.25rem', width: 'auto' }}
                                                value={editForm.role}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                                            >
                                                <option value="general">一般</option>
                                                <option value="finance">財務</option>
                                                <option value="admin">管理者</option>
                                            </select>
                                        ) : (
                                            <span className={`status-badge ${currentRole === 'admin' ? 'paid' : currentRole === 'finance' ? 'approved' : 'draft'}`}>
                                                {getRoleLabel(currentRole)}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {isEditing && (editForm.role === 'general' || editForm.role === 'finance') ? (
                                            <select
                                                className="form-input"
                                                style={{ padding: '0.25rem', width: 'auto' }}
                                                value={editForm.approverId || ''}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, approverId: e.target.value }))}
                                            >
                                                <option value="">選擇核准人...</option>
                                                {availableUsers
                                                    .filter(u => u.id !== user.id && (u.permissions.includes('general') || u.permissions.includes('finance_audit')))
                                                    .map(u => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name} ({getRoleLabel(getRoleFromPermissions(u.permissions))})
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            (currentRole === 'general' || currentRole === 'finance') ? (
                                                approver ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.9rem' }}>{approver.name}</span>
                                                    </div>
                                                ) : <span style={{ color: '#ccc', fontStyle: 'italic' }}>未設定</span>
                                            ) : <span style={{ color: '#ccc' }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {user.email}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '0.25rem', width: '32px', height: '32px' }}
                                                    onClick={() => startEdit(user)}
                                                    title="編輯權限"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                {user.id !== currentUser.id && (
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
};

export default UserManagement;
