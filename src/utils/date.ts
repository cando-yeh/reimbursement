export function formatDateOnly(value: Date | string): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString().split('T')[0];
}

export function formatOptionalDate(value?: Date | string | null): string | undefined {
    if (!value) return undefined;
    return formatDateOnly(value);
}

export function todayISO(): string {
    return formatDateOnly(new Date());
}
