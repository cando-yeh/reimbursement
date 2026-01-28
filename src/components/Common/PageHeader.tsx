'use client';

import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    return (
        <div className="vendor-header" style={{ marginBottom: '2.5rem' }}>
            <div>
                <h1 className="heading-lg" style={{ marginBottom: '0.25rem' }}>{title}</h1>
                {subtitle && <p className="vendor-subtitle">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
