import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="container" style={{ paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div className="skeleton" style={{ width: '140px', height: '28px', borderRadius: '6px', marginBottom: '0.4rem' }} />
          <div className="skeleton" style={{ width: '220px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton" style={{ width: '70px', height: '28px', borderRadius: '999px' }} />
        ))}
      </div>

      <div className="card card-flush vendor-table-container">
        <div style={{ padding: '1.25rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ width: '100%', height: '44px', borderRadius: '8px', marginBottom: '0.75rem' }} />
          ))}
        </div>
      </div>

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
