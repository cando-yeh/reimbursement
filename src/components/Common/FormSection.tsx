'use client';

import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

export default function FormSection({ title, children, icon }: FormSectionProps) {
    return (
        <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <div style={{ width: '4px', height: '16px', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }}></div>
                {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
                {title}
            </h3>
            {children}
        </section>
    );
}
