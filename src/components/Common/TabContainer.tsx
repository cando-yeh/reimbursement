'use client';

import React from 'react';

interface TabContainerProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export default function TabContainer({ children, style }: TabContainerProps) {
    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-border)',
            padding: '0.4rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2.5rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            ...style
        }}>
            {children}
        </div>
    );
}
