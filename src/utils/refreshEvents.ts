import type { MutableRefObject } from 'react';

export function scheduleRefreshEvent(params: {
    eventName: string;
    timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
    delayMs?: number;
}) {
    if (typeof window === 'undefined') return;
    const { eventName, timerRef, delayMs = 800 } = params;
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(eventName));
    }, delayMs);
}
