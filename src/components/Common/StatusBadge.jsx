// clsx removed

// Actually I didn't install clsx. I'll use standard conditional styles.

export default function StatusBadge({ status }) {
    const getStyles = (status) => {
        switch (status) {
            case 'approved':
                return { bg: 'var(--color-success-bg)', color: 'var(--color-success)' };
            case 'paid':
                return { bg: 'var(--color-primary)', color: 'white' }; // Paid might be distinct
            case 'pending':
                return { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' };
            case 'draft':
            default:
                return { bg: 'var(--color-border)', color: 'var(--color-text-secondary)' };
        }
    };

    const style = getStyles(status);

    return (
        <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: style.bg,
            color: style.color,
            textTransform: 'capitalize'
        }}>
            {status}
        </span>
    );
}
