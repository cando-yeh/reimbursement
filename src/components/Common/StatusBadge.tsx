// clsx removed

// Actually I didn't install clsx. I'll use standard conditional styles.


interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span className={`status-badge ${status}`}>
            {status}
        </span>
    );
}
