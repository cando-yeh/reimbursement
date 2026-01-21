// clsx removed

// Actually I didn't install clsx. I'll use standard conditional styles.


export default function StatusBadge({ status }) {
    return (
        <span className={`status-badge ${status}`}>
            {status}
        </span>
    );
}
