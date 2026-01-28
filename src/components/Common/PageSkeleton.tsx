import React from 'react';

export default function PageSkeleton() {
    return (
        <div className="container" style={{ padding: '2rem' }}>
            {/* Header Skeleton */}
            <div className="vendor-header" style={{ marginBottom: '2rem' }}>
                <div style={{ width: '100%' }}>
                    <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>
                    <div className="skeleton" style={{ width: '300px', height: '20px', borderRadius: '4px' }}></div>
                </div>
            </div>

            {/* Content/Table Skeleton */}
            <div className="card vendor-table-container">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="skeleton" style={{ width: '100%', height: '40px', borderRadius: '8px', marginBottom: '1rem' }}></div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }}></div>
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ width: '30%', height: '20px', marginBottom: '0.5rem', borderRadius: '4px' }}></div>
                                <div className="skeleton" style={{ width: '50%', height: '16px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="skeleton" style={{ width: '20%', height: '32px', borderRadius: '6px' }}></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Inline Styles for Animation (Simulating Tailwind animate-pulse if not available) */}
            <style>
                {`
                    .skeleton {
                        background-color: #e5e7eb;
                        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
        </div>
    );
}
