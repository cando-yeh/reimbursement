import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmDisabled?: boolean;
    cancelDisabled?: boolean;
    confirmLoading?: boolean;
}

const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'warning',
    confirmDisabled = false,
    cancelDisabled = false,
    confirmLoading = false
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const getThemeColors = () => {
        switch (type) {
            case 'danger': return { primary: 'var(--color-danger)', bg: 'var(--color-danger-bg)' };
            case 'warning': return { primary: 'var(--color-warning)', bg: 'var(--color-warning-bg)' };
            default: return { primary: 'var(--color-primary)', bg: 'rgba(99, 102, 241, 0.05)' };
        }
    };

    const colors = getThemeColors();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
        }}>
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '1.5rem',
                    position: 'relative',
                    animation: 'modalFadeUp 0.3s ease-out'
                }}
            >
                <button
                    onClick={onCancel}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                    <X size={18} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        backgroundColor: colors.bg,
                        color: colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                    }}>
                        <AlertTriangle size={24} />
                    </div>

                    <h3 className="heading-md" style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{title}</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.9rem' }}>{message}</p>

                    <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                        <button
                            className="btn btn-ghost"
                            style={{ flex: 1, border: '1px solid var(--color-border)', padding: '0.625rem 1rem' }}
                            onClick={onCancel}
                            disabled={cancelDisabled}
                        >
                            {cancelText}
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{
                                flex: 1,
                                padding: '0.625rem 1rem',
                                backgroundColor: type === 'danger' ? 'var(--color-danger)' : undefined,
                                backgroundImage: type === 'danger' ? 'none' : undefined,
                                boxShadow: type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : undefined
                            }}
                            onClick={onConfirm}
                            disabled={confirmDisabled}
                        >
                            {confirmLoading ? '處理中...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes modalFadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
};

export default ConfirmModal;
