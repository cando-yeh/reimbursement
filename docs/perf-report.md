# Performance Report (Current State)

Date: 2026-01-30

## Measurement Notes
- Attempted `npm run build` to capture Next.js route/bundle sizes.
- Build failed because `next/font/google` could not download fonts (no network access in this environment).
- Result: no route size table or JS chunk sizes available yet.

## Snapshot Metrics (from repository inspection)
- Client components (`'use client'`): **32** files.
- Public static assets: **~20 KB** (`public/`).
- Initial data calls on key routes (estimated from code paths):
  - `/` (dashboard): **4 calls** on first load
    - `supabase.auth.getUser()`
    - `getDBUsers()`
    - `getMyClaimCounts()`
    - `getClaims()`
  - `/vendors`: **1–2 calls** on first load
    - `getVendors()`
    - `getVendorRequests()` (finance only)
  - `/reviews`: **1–2 calls** on first load
    - `getClaims()`
    - `getVendorRequests()` (finance only)

## Bottlenecks / Risks
1. **App is effectively client-rendered**
   - Root layout wraps everything in `ClientProviders` and `Layout` is a client component, so the whole app pays client bundle + hydration cost.
2. **Multiple sequential API calls on initial load**
   - Auth flow + dashboard data fetches are done in separate effects, causing extra round trips before UI becomes fully interactive.
3. **No caching layer for server actions**
   - `getClaims`, `getMyClaimCounts`, `getVendors`, `getVendorRequests`, `getDBUsers` are called fresh per navigation, which can be slow under load.
4. **Heavy client-only pages**
   - Core screens rely on `dynamic(..., { ssr: false })`, deferring render to the client and blocking content until JS loads.
5. **Build-time font download dependency**
   - `next/font/google` requires network access during builds; in CI/offline environments this blocks producing performance artifacts.

## Recommendations (No Code Changes Yet)
1. **Enable proper bundle metrics**
   - Run `npm run build` with network access (or set up a local font cache) and capture the route size table.
   - Consider using `@next/bundle-analyzer` to identify oversized chunks.
2. **Reduce global client boundary**
   - Move `ClientProviders` lower in the tree; keep `RootLayout` and `Layout` as server components where possible.
3. **Coalesce initial data fetching**
   - Combine `getMyClaimCounts` + `getClaims` into a single server action or fetch in parallel.
   - Avoid calling `getDBUsers` twice during auth bootstrap.
4. **Add caching / revalidation for list endpoints**
   - Use `unstable_cache` or per-user caching to avoid repeated DB hits for unchanged lists.
5. **Revisit client-only dynamic imports**
   - Where feasible, enable SSR for primary page content to improve FCP/TTI.

## Next Measurement Steps
- Re-run build with network access to capture route/chunk sizes and update this report with actual KB numbers and per-route stats.
- Optionally run Lighthouse/WebPageTest against `/`, `/vendors`, `/reviews` after build to quantify LCP/TBT/CLS.

## Update: Client Boundary Refactor (2026-01-30)
- Moved App Router pages into a `(app)` route group and added `src/app/(app)/layout.tsx` to host `ClientProviders` and the existing `Layout`.
- Root layout (`src/app/layout.tsx`) now stays server-only and no longer wraps the entire app with client providers.
- Login page adds a direct Supabase session check to preserve the previous “redirect if already signed in” behavior that used to live in the global client layout.

Why this helps
- The global client boundary no longer wraps routes that don’t need AppContext (notably `/login` and `/auth/*`), reducing hydration and JS work for those screens.
- Keeps the existing authenticated layout behavior without a broad refactor.

## Update: Dashboard Fetch Coalescing (2026-01-30)

Before (route `/` initial load)
- Client bootstrap:
  - `supabase.auth.getUser()`
  - `getDBUsers()` (often called twice due to auth change + auth effect)
- Dashboard data (sequential):
  - `getMyClaimCounts()`
  - `getClaims()`

After (route `/` initial load)
- Client bootstrap:
  - `supabase.auth.getUser()`
  - `getDBUsers()` (single call during auth change; duplicate avoided)
- Dashboard data (parallel via single server action):
  - `getDashboardData()` → internally runs `getMyClaimCounts()` and `getClaims()` in parallel

Impact
- Eliminates one duplicate user list fetch on first load.
- Reduces dashboard data latency by parallelizing counts + list retrieval behind a single action call.
- Keeps existing `getClaims` / `getMyClaimCounts` APIs unchanged for other callers.

## Update: Lightweight Dashboard Skeleton (2026-01-30)
- Replaced the heavy generic skeleton on `/` with a lighter dashboard-specific skeleton to show structure sooner and reduce DOM work while data loads.

## Bundle Audit (2026-01-30)
Measurement notes
- Ran `npm run build` with a temporary font-import removal to avoid offline Google Fonts fetch (then reverted the change).
- Build required elevated permissions due to Turbopack/PostCSS process spawn.

Build output (Turbopack)
- Static chunks total: **~1.3 MB** (`.next/static/chunks`).
- Largest JS chunks (approx):
  - `aee6c7720838f8a2.js` ~219 KB
  - `db6076fc850fbfcf.js` ~195 KB
  - `a6dad97d9634a72d.js` ~110 KB
  - `d5f6e11894bf006b.js` ~82 KB
  - `186edfe494705341.js` ~49 KB

Recommendations
- Add bundle analyzer (optional) to map chunk IDs to source modules for `/`.
- Target the largest chunks above when trimming dependencies or splitting client-only code.

## Bundle Analyzer Setup (2026-01-30)
- Installed `@next/bundle-analyzer` and wired it in `next.config.mjs`.
- Run: `ANALYZE=true npm run build` to generate the report.

## Update: Bundle Analyzer After Supabase Lazy-Load (2026-01-30)
- Re-ran Webpack analyzer after moving Supabase client creation to a lazy import in AuthContext.
- Result: Supabase chunk is no longer initial for `/`.

Initial `/` entrypoint (parsed/gzip)
- `static/chunks/7751-0f3509f28ec0b145.js` ~12.5 KB / 4.1 KB (AppContext/Auth/Vendors/Claims)
- `static/chunks/app/(app)/page-5ef3e89f880fd42b.js` ~6.4 KB / 2.3 KB (dashboard page + skeleton)

Supabase chunk status
- `static/chunks/6622-fbaa4a765464c1e0.js` (Supabase SSR bundle) is **not** initial for `/` after the change.

## Update: Server-Rendered Dashboard (2026-01-30)
- `/` is now a Server Component that fetches user + dashboard data on the server and passes it into the client dashboard.
- Client dashboard no longer depends on AppContext for delete; it calls the server action directly and refreshes.
- This reduces client-side data-fetch waterfalls on initial load and keeps initial `/` client chunk small.

## Update: Dashboard Payload Trim + CSS Import Order (2026-01-30)
- `getDashboardData()` now calls `getClaims(..., compact: true)` so the dashboard list only selects fields required for the table.
- Claims are normalized with empty `lineItems`/`history` arrays to keep the client contract stable while reducing serialized payload.
- Moved the global CSS file comment below the `@import` statements so all imports are first, removing the render-blocking warning.

## Update: Dashboard Data Caching (2026-01-30)
- Wrapped `getDashboardData()` with `unstable_cache` using a short `revalidate: 30` window to avoid repeated DB hits on quick refreshes.
- Cache is keyed by applicant + tab + page + pageSize, and tagged per-user.
- Claim mutations now call `revalidateTag()` for that user to invalidate the dashboard cache alongside the existing `revalidatePath('/')`.

## Update: Server Page Memo + Parallel Fetch (2026-01-30)
- `/` now memoizes `getDBUserByEmail` and `getDBUsers` with `cache()` and fetches dashboard data + user list in parallel after auth resolution.
- This reduces duplicate work within a request and shortens server time-to-first-byte on the dashboard.

## Update: Enable SSR for Dynamic Review/Vendor Lists (2026-01-30)
- Removed `ssr: false` from dynamic imports in `/reviews` and `/vendors` so those client components can be server-rendered and hydrate normally.
- This allows HTML to be sent earlier instead of waiting for client-only rendering.

## Update: Reduced Explicit Client Components (2026-01-30)
- Removed unnecessary `'use client'` directives from simple presentational components (`PageHeader`, `TabContainer`, `FormSection`, `ConfirmModal`).
- This avoids widening the client boundary when those components are used from server components.

## Update: Reviews/Vendors Caching (2026-01-30)
- Added short-lived caching (30s) to `getVendors` and `getVendorRequests`, with tag invalidation on vendor request mutations.
- Added optional caching to `getClaims`; `/reviews` now uses `cache: true` for the initial claims list.
- Claim mutations invalidate both dashboard and claims list tags to keep data fresh.

## Update: Server-Side Filtering for Reviews/Vendors (2026-01-30)
- `/reviews` now fetches the “所有申請單” list from the server with applicant/status/type/payee filters and server pagination, avoiding large client-side filtering.
- `/vendors` now passes the search query to `getVendors`, so filtering happens in the database; the client only merges pending add requests.

## Bundle Analyzer Baseline (2026-01-30)
Initial client chunks (parsed/gzip)
- `/`:
  - total: **36,759 / 12,939**
  - `static/chunks/app/(app)/page-dc99eeb7701d6673.js`: **17,777 / 5,742**
  - `static/chunks/3197-d8718dfac3768940.js`: **10,271 / 3,697**
  - `static/chunks/8500-41fa79ac743d83f1.js`: **8,711 / 3,500**
- `/reviews`:
  - total: **28,454 / 9,613**
  - `static/chunks/app/(app)/reviews/page-bd0481dab7844919.js`: **15,848 / 5,460**
  - `static/chunks/251-c51fd462a4cf3664.js`: **12,606 / 4,153**
- `/vendors`:
  - total: **19,138 / 6,425**
  - `static/chunks/251-c51fd462a4cf3664.js`: **12,606 / 4,153**
  - `static/chunks/app/(app)/vendors/page-2f5834357ee7ac0e.js`: **6,532 / 2,272**

## Bundle Analyzer Re-Run (2026-01-30)
- After removing the redundant Google Fonts import, initial client chunk sizes are unchanged from the baseline:
  - `/`: **36,759 / 12,939** total parsed/gzip
  - `/reviews`: **28,454 / 9,613** total parsed/gzip
  - `/vendors`: **19,138 / 6,425** total parsed/gzip

## Bundle Analyzer Re-Run After Reviews/Vendors Refactor (2026-01-30)
Initial client chunks (parsed/gzip)
- `/`:
  - total: **36,743 / 13,649** (4 assets)
  - `static/chunks/3197-d8718dfac3768940.js`: **10,271 / 3,697**
  - `static/chunks/app/(app)/page-613b56235ed19737.js`: **10,180 / 3,795**
  - `static/chunks/8500-41fa79ac743d83f1.js`: **8,711 / 3,500**
  - `static/chunks/3236-54f07713018bffee.js`: **7,581 / 2,657**
- `/reviews`:
  - total: **41,729 / 13,301** (3 assets)
  - `static/chunks/app/(app)/reviews/page-ecff35211ebebb8a.js`: **21,152 / 6,379**
  - `static/chunks/3428-1ed1ee07049fd449.js`: **12,996 / 4,265**
  - `static/chunks/3236-54f07713018bffee.js`: **7,581 / 2,657**
- `/vendors`:
  - total: **22,552 / 8,735** (2 assets)
  - `static/chunks/app/(app)/vendors/page-d5d3d9757a203fb4.js`: **13,841 / 5,235**
  - `static/chunks/8500-41fa79ac743d83f1.js`: **8,711 / 3,500**

## Update: Reviews Client Chunk Trim (2026-01-30)
- Reviews now uses `useAuth` + `useClaims` instead of `useApp`, avoiding the combined AppContext bundle in the reviews entrypoint.
- Vendor request table and payment record table are dynamically imported to split less-used UI from the initial reviews chunk.

## Bundle Analyzer Re-Run After Reviews Chunk Trim (2026-01-30)
Initial client chunks (parsed/gzip)
- `/reviews`:
  - total: **30,690 / 11,131** (3 assets)
  - `static/chunks/app/(app)/reviews/page-f09ec69cf3717324.js`: **13,149 / 4,665**
  - `static/chunks/2005-f23c4b509f77fd91.js`: **9,141 / 3,177**
  - `static/chunks/8261-ab4ac318c9a7c55b.js`: **8,400 / 3,289**

## Update: CSS Import Order (2026-01-30)
- Moved the Google Fonts `@import` in `src/styles/base.css` to the top of the file to satisfy CSS import ordering and remove the build warning.

## Update: Remove Redundant Google Fonts Import (2026-01-30)
- Removed the `@import` for Inter from `src/styles/base.css` since fonts are already provided via `next/font` in `src/app/layout.tsx`.
- This should eliminate the remaining CSS `@import` order warning.

## Update: Reviews/Vendors Server Fetch + Loading States (2026-01-30)
- `/vendors` is now server-rendered with initial vendors + vendor requests fetched on the server and passed to the client list component.
- `/reviews` now fetches review claims and vendor requests directly via server actions into local state (no AppContext claim mutations), avoiding global claim shape conflicts.
- Added `loading.tsx` for `/reviews` and `/vendors` to show skeletons during route transitions.

## Update: Review Badge Caching + Auth Gate (2026-01-30)
- Added cached review badge counts (`getReviewBadgeCounts`) and pending vendor request count with tag-based invalidation.
- `(app)` layout now performs a server-side session check and redirects unauthenticated users to `/login`, reducing client-side redirect churn.

## Update: Review Data Shape + Form Lazy Load (2026-01-30)
- Reviews use compact claim shapes (no line items/history) while preserving `paymentDetails` needed for payment flow logic.
- Payment request form lazy-loads `SearchableVendorSelect` to reduce initial client bundle weight.
