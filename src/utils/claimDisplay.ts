import type { Claim } from '@/types';

export function getClaimTypeLabel(type: Claim['type']) {
    if (type === 'employee') return '員工報銷';
    if (type === 'service') return '個人勞務';
    if (type === 'vendor' || type === 'payment') return '廠商請款';
    return '其他';
}
