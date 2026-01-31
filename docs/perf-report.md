# Performance Report (Current State)

Date: 2026-01-30

## Measurement Notes
- Attempted `yarn build` to capture Next.js route/bundle sizes.
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
   - Run `yarn build` with network access (or set up a local font cache) and capture the route size table.
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
- Ran `yarn build` with a temporary font-import removal to avoid offline Google Fonts fetch (then reverted the change).
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
- Run: `ANALYZE=true yarn build` to generate the report.
