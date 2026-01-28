
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
            padding: '0.75rem 0',
            borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: active ? 600 : 500,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer'
        }}
    >
        {label}
        {badge !== undefined && badge > 0 ? (
            <span style={{
                backgroundColor: 'var(--color-danger)',
                color: 'white',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center'
            }}>
                {badge > 99 ? '99+' : badge}
            </span>
        ) : (
            <span>({count})</span>
        )}
    </button>
);

export default TabButton;
