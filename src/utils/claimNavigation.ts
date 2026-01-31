import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type HomeTab = 'drafts' | 'in_review' | 'history' | 'pending_payment';

export function goHome(router: AppRouterInstance, options?: { tab?: HomeTab; refresh?: boolean }) {
    const tab = options?.tab;
    const refresh = options?.refresh ?? false;
    const search = new URLSearchParams();
    if (tab) search.set('tab', tab);
    if (refresh) search.set('refresh', '1');
    const query = search.toString();
    router.push(query ? `/?${query}` : '/');
}
