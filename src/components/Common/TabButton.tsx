
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    badge?: number;
}

const TabButton = ({ active, onClick, label, count, badge }: TabButtonProps) => (
    <button
        onClick={onClick}
        style={{
            padding: '0.6rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: active ? 'white' : 'transparent',
            color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            boxShadow: active ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
            fontWeight: active ? 700 : 500,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            border: 'none',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
    >
        {label}
        {badge !== undefined && badge > 0 ? (
            <span style={{
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '12px',
                minWidth: '20px',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
            }}>
                {badge > 99 ? '99+' : badge}
            </span>
        ) : (
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>({count})</span>
        )}
    </button>
);

export default TabButton;
