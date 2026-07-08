
# Phase C — Audit & Implementation Plan

## Audit findings

**C1. `verify-admin` edge function** — already hardened. Uses `guard()` with `requireAuth`, `requireRoles: ["admin"]`, `POST`-only, `rateLimit` 30/min bucketed by user+ip, `guardJson` responses, `withSentry` wrapper, and an `admin_verify_ok` audit event. Guard emits standard 401/403 for missing auth/role. **No change required.**

**C2. `AdminProtectedRoute` / `EmployerProtectedRoute`** — both share the same pattern I refined in Phase B for benchmark/blog. Two gaps:
- `.then(({ data }) => …)` swallows `error`. On a network/RLS error, `data` is `null` → `hasAccess = false`, which is *fail-closed* by luck, but the state transitions to `false` silently with no logging.
- No `cancelled` flag → if `user` changes fast (logout during load), a stale resolver can set `hasAccess=true`. Small race, but fixable.
- Loading/error states already render the loader and never leak children before the role query settles — verified fail-closed on `null`/`false`.

Fix: mirror the Phase B pattern — capture `error`, log to console on failure, `cancelled` guard on unmount/user-change, explicit fail-closed on error. No API/signature change.

**C3. `openai-benchmark`** — leaks upstream detail in two places:
- Line 64: `{ error: "upstream_error", status: aiResponse.status }` returns OpenAI's raw HTTP status to the client. Recommend dropping `status` from the response body (still log to Sentry via `withAiGuard`'s error path) and returning a generic `502` body.
- Lines 62–63: `rate_limited_upstream` / `credits_exhausted` are safe (no provider name, no key material). Keep as-is; they're actionable for the UI without exposing internals.
- Everything else (auth, rate limit, schema, plan enforcement, prompt-injection wrapping via `ctx.wrap`, secret redaction via `ctx.redact`) is already correct.
- Note: `insertError` correctly returns `save_failed` without DB detail.

Fix: strip `status` field. No functional change to happy path.

**C4. Reliability — idempotency + rate-bucket cleanup** — `public.cleanup_expired_rate_buckets()` exists and cleans both `rate_limit_buckets` and `idempotency_keys`. Execute grant is `service_role` only. **No scheduler (pg_cron) is registered**, so the function is never invoked on a schedule. Rows accumulate until manually run.

Options:
- (a) Schedule via pg_cron in a migration. `pg_cron` availability on this project is unverified; blindly enabling extensions is out of scope for Phase C (touches production config).
- (b) Document required action for the operator: run `select public.cleanup_expired_rate_buckets();` on a schedule (Supabase Dashboard → Database → Cron, or an external cron hitting an edge function). Add a lightweight edge function `admin-cleanup` gated to admin + `guard()` so ops can trigger it on demand without shell access. Non-destructive to prod config.

I will implement (b): a small admin-only edge function that invokes the existing SQL function via service role. This is additive and safe.

## Implementation plan

1. **C2** — Update `AdminProtectedRoute.tsx` and `EmployerProtectedRoute.tsx`:
   - Destructure `{ data, error }`, log `error` via `console.warn`, fail closed on error.
   - Add `cancelled` guard.
   - Keep loading behavior identical (TechvinexLoader).
2. **C3** — Update `supabase/functions/openai-benchmark/index.ts`:
   - Replace the leaky line 64 with `return guardJson({ error: "upstream_error" }, 502);`.
3. **C4** — Add `supabase/functions/admin-cleanup/index.ts`:
   - `guard`: POST only, `requireAuth`, `requireRoles: ["admin"]`, tight rate limit (5/min).
   - Calls `ctx.db.rpc("cleanup_expired_rate_buckets")` and returns `{ ok: true, removed: <count> }`.
   - Audit event `admin_cleanup_run`.
   - Document scheduling recommendation in a top-of-file comment.
   - No `config.toml` edit needed (default `verify_jwt=false` per project convention; we validate in guard).
4. **C1** — No change; note in report.

## Tests & verification
- Run `bunx vitest run` — expect 172 pass (no test relies on internals we're changing; error-path branch is additive). If the response-shape change in `openai-benchmark` is covered anywhere, adjust.
- Grep for consumers of `upstream_error` `status` field before removing (nothing should switch on it).

## Files to change
- `src/components/admin/AdminProtectedRoute.tsx`
- `src/components/employer/EmployerProtectedRoute.tsx`
- `supabase/functions/openai-benchmark/index.ts`
- `supabase/functions/admin-cleanup/index.ts` (new)

## Out of scope
- pg_cron scheduling (touches prod extensions).
- Any `verify-admin` change.
- Any Phase D item.
