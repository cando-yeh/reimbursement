interface StatusBadgeProps {
    status: string;
}

const STATUS_MAP: Record<string, string> = {
    'draft': '草稿',
    'pending_approval': '待核准',
    'pending_finance': '待財務審核',
    'pending_finance_review': '待憑證審核',
    'pending_evidence': '待補憑證',
    'approved': '待付款',
    'paid': '已付款',
    'completed': '已完成',
    'rejected': '已退件'
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const label = STATUS_MAP[status] || status;
    return (
        <span className={`status-badge ${status}`}>
            {label}
        </span>
    );
}
