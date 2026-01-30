import React from 'react';

interface FieldProps {
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}

/**
 * Reusable form field wrapper with label, error, and hint display.
 */
export default function Field({ label, required, hint, children, error }: FieldProps) {
    return (
        <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                    {label}
                    {required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
                </span>
            </label>
            {children}
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '4px' }}>{error}</p>}
            {!error && hint && <p className="form-hint" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{hint}</p>}
        </div>
    );
}
