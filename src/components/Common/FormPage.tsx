import React from 'react';
import PageHeader from '@/components/Common/PageHeader';

export default function FormPage(props: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    containerClassName?: string;
    cardClassName?: string;
    cardStyle?: React.CSSProperties;
}) {
    const { title, subtitle, children, containerClassName, cardClassName, cardStyle } = props;
    return (
        <div className={containerClassName || 'container'}>
            <PageHeader title={title} subtitle={subtitle} />
            <div className={cardClassName || 'card'} style={{ padding: '2.5rem', ...(cardStyle || {}) }}>
                {children}
            </div>
        </div>
    );
}
