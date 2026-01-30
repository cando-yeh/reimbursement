/**
 * Format number with comma separators
 * @example formatNumberWithCommas("1000000") => "1,000,000"
 * @example formatNumberWithCommas(1000000) => "1,000,000"
 */
export function formatNumberWithCommas(value: string | number): string {
    const val = typeof value === 'number' ? String(value) : value;
    const digits = val.replace(/[^\d]/g, "");
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Parse a comma-formatted string to a number
 * @example parseAmountToNumber("1,000,000") => 1000000
 */
export function parseAmountToNumber(value: string): number {
    const digits = value.replace(/[^\d]/g, "");
    return digits ? Number(digits) : 0;
}

/**
 * Format date string to localized display
 * @example formatDate("2026-01-30") => "2026/01/30"
 */
export function formatDate(dateString: string): string {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format currency amount with NT$ prefix
 * @example formatCurrency(1000) => "NT$ 1,000"
 */
export function formatCurrency(amount: number): string {
    return `NT$ ${amount.toLocaleString('zh-TW')}`;
}
