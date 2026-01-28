'use client';

import React from 'react';

interface TabContainerProps {
    children: React.ReactNode;
}

export default function TabContainer({ children }: TabContainerProps) {
    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'rgba(0,0,0,0.03)',
            padding: '0.5rem',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2.5rem',
            overflowX: 'auto',
            scrollbarWidth: 'none'
        }}>
            {children}
        </div>
    );
}
