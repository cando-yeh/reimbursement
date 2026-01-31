import React from 'react';

export default function FormLabel(props: {
    children: React.ReactNode;
    required?: boolean;
    style?: React.CSSProperties;
}) {
    const { children, required, style } = props;
    return (
        <label
            className="form-label"
            style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                marginBottom: '0.5rem',
                display: 'block',
                ...style
            }}
        >
            {children}
            {required ? <span style={{ color: 'var(--color-danger)' }}> *</span> : null}
        </label>
    );
}
