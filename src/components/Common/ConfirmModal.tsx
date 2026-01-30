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
}

const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmText = '確定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'warning'
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
                    maxWidth: '440px',
                    padding: '2rem',
                    position: 'relative',
                    animation: 'modalFadeUp 0.3s ease-out'
                }}
            >
                <button
                    onClick={onCancel}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: colors.bg,
                        color: colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <AlertTriangle size={32} />
                    </div>

                    <h3 className="heading-md" style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{title}</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>{message}</p>

                    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                        <button
                            className="btn btn-ghost"
                            style={{ flex: 1, border: '1px solid var(--color-border)' }}
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{
                                flex: 1,
                                backgroundColor: type === 'danger' ? 'var(--color-danger)' : undefined,
                                backgroundImage: type === 'danger' ? 'none' : undefined,
                                boxShadow: type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : undefined
                            }}
                            onClick={onConfirm}
                        >
                            {confirmText}
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
