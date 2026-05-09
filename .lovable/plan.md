## Goal
Zero-trust default-deny security layer across the Lovable stack (React + Supabase Edge Functions + Postgres RLS). Build only what this stack actually supports; skip primitives that need a persistent Node server, Cloudflare, or Redis (those are not in scope here).

## Already shipped (reuse, do not rebuild)
- HMAC webhook signature verification + replay protection (`webhook-receiver`)
- Postgres idempotency keys + `withIdempotency` wrapper
- Distributed rate limiting via `rate_limit_buckets` + `rate_limit_hit` RPC + `PgRateStore`
- Secrets rotation UI + `secret_rotate` audit action
- `audit_logs` table (admin-only RLS)
- Client-side 401 handling, refresh dedup, session-expired bus (`apiClient.ts`)
- `has_role()` security-definer + `user_roles` table

## What this plan adds

### 1. Centralized Edge Function guard (`_shared/guard.ts`)
One wrapper every function MUST use. Default-deny — if you don't call `guard()`, the function refuses to run.
- JWT validation via `supabase.auth.getClaims(token)` (signature + exp + iss + aud)
- Required-role / required-scope check (RBAC) — caller declares `requireRoles: ['admin']`
- Origin/Referer allowlist check for browser-origin calls (CSRF defense)
- Method allowlist (`allowedMethods: ['POST']`)
- Zod payload schema validation (rejects unknown fields → mass-assignment defense)
- Per-route rate limit (uses existing `PgRateStore`)
- Optional idempotency key requirement
- Structured 401/403 responses (no internal detail leak) + audit log row on deny
- Returns typed `{ userId, claims, body }` to handler

### 2. Apply guard to every existing edge function
Refactor `admin-secrets`, `webhook-receiver`, `ai-interview`, `elevenlabs-tts`, `openai-benchmark` to use `guard()`. Each declares its own roles/methods/schema. Removes ad-hoc auth checks.

### 3. RLS hardening pass
- Audit every table for missing INSERT/UPDATE/DELETE policies (default-deny means: no policy = no access)
- Add explicit deny-by-default where service-role-only tables exist (`secrets`, `webhook_endpoints`, `idempotency_keys` already correct — verify)
- Add ownership policies missing on a few tables (will be listed after audit)

### 4. Storage policies
- Audit `blog-images` bucket — currently public. Confirm intent; add path-scoped write policies (only admins can upload).

### 5. Auth hardening
- Enable HIBP leaked-password check (`configure_auth`)
- Confirm signup not disabled where it shouldn't be
- Idle timeout: client-side inactivity logout (configurable, default 30 min) wired into `AuthContext`

### 6. Step-up auth for admin destructive actions
- Lightweight reauth modal: before secret delete / webhook delete, prompt for password re-entry, call `signInWithPassword` to verify, then proceed. No new tables needed.

### 7. Audit + anomaly surface
- `audit_logs` already exists. Add helper `logAudit()` in guard so every deny + every privileged action writes a row.
- Admin page `/admin/audit-logs` already exists — add filter for `denied` events and a simple "spike" badge (>N denies/5min).

### 8. Security headers (what we can do)
Add a `<meta http-equiv>` set in `index.html` for CSP-report-only, Referrer-Policy, X-Content-Type-Options. Real header enforcement needs hosting config — document this limitation.

## Explicitly out of scope (stack limits)
- True device binding / MFA TOTP enrollment (Supabase MFA available but big surface — separate request)
- httpOnly cookie session (Supabase JS uses localStorage; can't change without rewriting auth layer)
- CSRF tokens (we're a token-bearer SPA; Origin check is the equivalent defense)
- Refresh token rotation/revocation internals (managed by Supabase)
- Cloudflare WAF / IP block / network-layer protections

## Technical details

### `_shared/guard.ts` shape
```ts
guard(req, {
  allowedMethods: ['POST'],
  requireAuth: true,
  requireRoles: ['admin'],          // optional
  allowedOrigins: [...],            // optional, default = Lovable preview + custom domain
  rateLimit: { key: 'admin-secrets', limit: 30, windowMs: 60_000, failOpen: false },
  schema: ZodSchema,                // body validation
  idempotency: { scope: 'admin-secrets', required: false },
}, async ({ userId, body, claims }) => { ... })
```
Returns `Response` directly. On any failure: structured JSON `{ error, code }` + 401/403/429, audit row, no stack leak.

### RLS audit deliverable
Migration adds explicit `REVOKE` and policy gaps after enumerating tables. List finalized during step 3.

## Order of work
1. Build `guard.ts` (no behavior change yet)
2. Migrate `admin-secrets` + `webhook-receiver` first (high-risk surfaces)
3. Migrate AI/TTS/benchmark functions
4. RLS audit migration
5. Auth hardening + idle timeout + step-up modal
6. Audit-logs page filter + meta security headers
