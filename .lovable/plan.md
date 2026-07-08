
# Phase B — Audit & Implementation Plan

## Audit findings

**B1. Benchmark auth (current state)**
- Route guard: `BenchmarkProtectedRoute` only checks `user` is logged in — any authenticated user (candidate, employer) with a stray session can hit `/benchmark/*`.
- Login page (`BenchmarkLogin.tsx`) does check role membership in {admin, reviewer, viewer} and signs out on fail — but that only covers the login *entry* path. A logged-in candidate visiting `/benchmark/dashboard` directly bypasses that.
- Reviewer/admin-only surfaces mixed with viewer-safe ones on the same shell: `BenchmarkTasks` (edit tasks), `BenchmarkReviews`, `BenchmarkSettings` should be admin/reviewer only; `Dashboard`, `Results`, `Leaderboard` are fine for viewer+.
- `benchmark_tasks` secret fields are already RLS-locked server-side via `get_benchmark_task_secret` (admin/reviewer). So the DB is safe; this is a UI-guard gap only.

**B2. Blog Dashboard auth (current state)**
- `BlogDashboardProtectedRoute` only checks `user` — any logged-in user can hit `/blog-dashboard/*`.
- `/blog-dashboard/login` already redirects to `/admin/login` (memory: blog-dashboard-redirect).
- `blogs` table RLS + `blog-images` storage policies require `has_role(auth.uid(),'admin')`, so writes are blocked server-side, but the UI still renders and lets users try, which is misleading and a soft info-leak.
- Required role: **admin** (matches DB + storage policies).

**B3. Blog image upload security**
- `BlogImageUpload.tsx` uploads directly to `blog-images` bucket, sets `onChange(publicUrl)` immediately. No scan is invoked.
- `scan-upload` edge function already exists, allow-lists `blog-images`, is guard-hardened, persists results, deletes malicious files. Verdicts: `clean|suspicious|malicious|unknown|error`.
- Gap: upload UI never calls it, so a malicious image URL can be attached to a blog and published.

**B4. Storage policies (current state, from migrations)**
- `blog-images`: public SELECT (anon+authenticated), admin-only INSERT/UPDATE/DELETE. Aligned with intent (public read for site visitors, admin-only writes). No unauthorized write path.
- Note: `scan-upload` deletes malicious objects with service role, which bypasses RLS — correct by design.

## Implementation plan

**B1 — Split benchmark routes by role**
1. Enhance `BenchmarkProtectedRoute` to accept `requiredRoles` prop (default: any of admin/reviewer/viewer). Fetch `user_roles`, gate on membership, redirect to `/benchmark/login` if missing role.
2. In `App.tsx`, wrap admin/reviewer-only routes (`tasks`, `reviews`, `settings`, `run` — since running a test writes results) with `requiredRoles={["admin","reviewer"]}`. Keep `dashboard`, `results`, `leaderboard` open to all three.
3. Keep existing `BenchmarkLogin` role check as defense in depth.

**B2 — Blog Dashboard: require admin**
1. Update `BlogDashboardProtectedRoute` to check `has_role(user,'admin')`, redirect non-admins to `/admin/login`. Same pattern as `AdminProtectedRoute`.

**B3 — Wire BlogImageUpload → scan-upload**
1. After successful storage upload, call `supabase.functions.invoke('scan-upload', { body: { bucket:'blog-images', object_path: path } })`.
2. Handle verdicts:
   - `clean` → set publicUrl, success toast.
   - `malicious` → object is already deleted by the edge function; clear value, error toast "Image blocked by security scan".
   - `suspicious` → block by default (treat like malicious for UI), error toast; keep object deletion consistent by not attaching it.
   - `unknown` / `error` → allow attach with a warning toast ("Security scan unavailable; image accepted") — preserves current UX when VirusTotal isn't configured; **do not block** so the tool remains usable in dev.
3. Show scanning state in the button (`Scanning…` after `Uploading…`).
4. No change to non-image flows.

**B4 — Storage review**
- Policies verified already correct; no migration needed. Document the current matrix in the report; only act if audit reveals a gap (none found).

## Test & verification
- Run `bunx vitest run` after B1 and B2 (ProtectedRoute tests exist; extend if signatures change).
- Playwright smoke: log in as candidate → hit `/benchmark/tasks` → expect redirect to `/benchmark/login`. Log in as admin → all routes render.
- Manual: upload a benign image via blog dashboard → verify scan verdict logged in `storage_scan_results` and image attaches. (Malicious path can't be exercised without VT key; verify `unknown` path allows attach + persists row.)

## Files to change
- `src/components/benchmark/BenchmarkProtectedRoute.tsx` — add role gating.
- `src/App.tsx` — pass `requiredRoles` to admin/reviewer benchmark routes.
- `src/components/blog-dashboard/BlogDashboardProtectedRoute.tsx` — require admin.
- `src/components/blog-dashboard/BlogImageUpload.tsx` — call `scan-upload` after upload; verdict-aware UX.
- (Optional) test updates for the two protected-route components.

## Out of scope
- Any DB/RLS/storage migration (policies already correct).
- Secrets/prod config changes.
- Any Phase C item.
