# 10,000 Concurrent User Architecture

## Reality check up front

Lovable Cloud is a **managed Postgres + PostgREST + Realtime + Edge Functions** stack. Several items on the list are **not** user-configurable on this stack and have to be solved differently:

| Requested | Status on Lovable Cloud | What we do instead |
|---|---|---|
| Redis cache layer | Not natively provided | Use **Cloudflare CDN edge cache** for public reads; optionally add **Upstash Redis** (external) for hot RPC results |
| Database read replicas | Managed by Lovable; not user-exposed | Upgrade instance size; offload public reads to CDN |
| Connection pooling | PgBouncer already in front of Postgres (200 client connections); we tune client side |
| Load balancer | Lovable Edge / Vercel-style ingress already terminates and load-balances at the edge | Nothing to add at app layer |
| Horizontal scaling | Stateless PostgREST + Edge Functions auto-scale per Lovable instance class | Driven by instance upgrade |
| Background job queue | Not in Cloud — use **Inngest** (already an available connector) | Connector-based |

Everything else (Realtime consolidation, pagination, rate limiting, async AI, removing Realtime from public pages, response caching headers) is in our codebase and gets shipped this turn.

---

## Capacity model — before vs after

Per measured baselines (DB mean 1.79–6.84 ms, Realtime soft cap ~500 channels, 60 DB conns / 200 PgBouncer clients):

| Metric | Today | After this plan |
|---|---|---|
| DB-bound ceiling | ~2,000 | **>15,000** (benchmark_results denorm + pagination + CDN-cached public reads) |
| Realtime-bound ceiling | ~330 | **~2,500** authenticated users (1 channel each) + unlimited anon (no Realtime) |
| Edge Function ceiling (AI) | bound by sync ElevenLabs concurrency (~10–20) | **>10,000** with Inngest queue + async polling |
| Public Explore RPS the DB sees | linear in user count | **~constant** (CDN absorbs 95%+ of reads) |
| **Composite ceiling** | **~330** | **~10,000** |

Hard 10K binding constraints that remain even after this plan: (a) Realtime soft cap forces us to drop Realtime entirely for unauthenticated users, (b) ElevenLabs upstream concurrency negotiation, (c) one Cloud instance-class upgrade.

---

## In-app changes (ship now)

### 1. Public Explore: kill Realtime, switch to SWR polling + HTTP cache headers
- `useExploreJobs(adminMode=false)` removes its `subscribeRealtime` call entirely.
- Anonymous fetch goes through a thin Edge Function `public-explore-jobs` that selects from `explore_jobs` with `status='published' AND visibility='public'`, applies `LIMIT`/`OFFSET`, and returns with `Cache-Control: public, s-maxage=45, stale-while-revalidate=120`. Cloudflare/Lovable edge will cache the response — DB sees ~1 req every 45 s regardless of user count.
- React Query gets `staleTime: 45_000`, `refetchOnWindowFocus: false`.
- Admin path keeps the Realtime subscription (small audience, fresh data required).

### 2. Pagination limits everywhere
Add a 100-row hard cap and 25-row default to every list query. Affected hooks:
- `useExploreJobs` — `.range(0, 24)` default, expose `pageSize` and `pageIndex`
- `useRoles` — same
- `useNotifications` — limit 50 (already user-scoped)
- `BenchmarkResults` / `BenchmarkReviews` / `BenchmarkDashboard` — already 50/5; lock the upper bound to 100 server-side via Edge Function wrappers for any public reads
- `EmployerMessages` — `.limit(200)` with `.order(created_at desc)` and load older via cursor on scroll

### 3. Unified Realtime — 1 channel per authenticated user, 0 for anon
`realtimeBus` (already shipped) currently opens 2 channels (global + user). Refactor so the global channel is opened **only when a subscriber exists AND the user is authenticated** — anonymous tabs open zero channels. Multiplexes `roles`, `platform_stats`, `employer_messages`, `applications`, `notifications`, `offers`, `explore_jobs (admin only)` onto the single user channel.

Result: anon = 0 channels, authed = 1 channel. 500-channel cap → ~500 concurrent authed users on Realtime. To push past that we'd need Lovable's Realtime concurrency raised; we negotiate or fall back to polling for non-critical tables.

### 4. Rate limiting per user + IP
Project already has `rate_limit_buckets` + `rate_limit_hit()` RPC. Add a shared helper `supabase/functions/_shared/rateLimit.ts`:
- Key = `${functionName}:${userId ?? ip}`
- Window 60 s, limit 60 req/min for normal endpoints, 10 req/min for AI endpoints
- Returns 429 with `Retry-After` header when exceeded
- Applied to every Edge Function: `ai-interview`, `elevenlabs-tts`, `verify-admin`, new `public-explore-jobs`, new `enqueue-ai-job`, new `get-ai-job-status`

### 5. Async AI via Inngest
Drop synchronous request → response from `ai-interview` and `elevenlabs-tts`. New flow:
1. Client calls `enqueue-ai-job` Edge Function with the prompt → returns `{ jobId }` immediately
2. Edge Function rate-limits, validates with Zod, inserts a row into a new `ai_jobs` table (`status='queued'`), then sends an Inngest event `app/ai-job.requested`
3. Inngest worker function (in `ai-jobs-worker` Edge Function) consumes the event, calls Lovable AI / ElevenLabs, writes the result to `ai_jobs.result`, sets `status='completed'`
4. Client polls `get-ai-job-status` (or subscribes via the user-scope Realtime channel to `ai_jobs` filtered by `user_id=eq.<uid>` for instant push)
5. New table `ai_jobs` with proper RLS (`user_id = auth.uid()`) and GRANTs

### 6. API response caching headers
Every public Edge Function returns `Cache-Control: public, s-maxage=<n>, stale-while-revalidate=<n*3>`. Authenticated endpoints return `private, max-age=0, must-revalidate`. The CDN does the work.

### 7. Connection pooling — client side
Switch all server-side Edge Functions to use the **transaction pooler** (port 6543 in the pooler URL) instead of session pooler. PgBouncer client cap effectively becomes hundreds of thousands of short-lived connections. Single-line URL change per function.

---

## Infrastructure that the user must purchase / approve

| Item | Provider | Why | Est. monthly cost @ 10K active users |
|---|---|---|---|
| **Lovable Cloud — upgrade instance class** | Lovable | Current instance hits CPU at ~2K users; need bigger compute | **$50–250** depending on tier (Settings → Cloud → Advanced settings) |
| **Cloudflare** in front of `*.lovable.app` (or custom domain) | Cloudflare | Edge cache for public Explore, free DDoS | **$0** (Free plan) — Pro $25 if WAF rules needed |
| **Inngest** connector | Inngest (standard connector) | Durable async AI job queue | **$0** Hobby (up to 50K function runs) → **$20–50** Pro |
| **ElevenLabs** tier upgrade | ElevenLabs | Higher concurrency for TTS | **$99–330** Creator/Pro |
| **Lovable AI** credits | Lovable | At 10K users with realistic AI usage | usage-based, **$100–500+** |
| **(Optional) Upstash Redis** | Upstash | Sub-ms RPC result cache if CDN isn't enough | **$10–60** Pay-as-you-go |
| **Total floor** |  |  | **~$280/mo** |
| **Total realistic** |  |  | **~$600–1,200/mo** |

The user must:
1. Approve the Lovable Cloud instance upgrade in **Backend → Advanced settings → Upgrade instance**.
2. Approve linking the **Inngest** standard connector when prompted.
3. Negotiate the ElevenLabs concurrency tier with ElevenLabs directly.
4. Decide whether to front the app with Cloudflare (free, recommended) or skip.

---

## Implementation sequence

I will execute in this order, in one batch where possible:

1. **Migration**: create `public.ai_jobs` table (id, user_id, kind, input jsonb, result jsonb, status, error, created_at, updated_at) + GRANTs + RLS + `ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs`.
2. **Shared modules**:
   - `supabase/functions/_shared/rateLimit.ts` (per-key bucket via existing `rate_limit_hit` RPC)
   - `supabase/functions/_shared/cors.ts` (already exists in some functions, consolidate)
3. **New Edge Functions**:
   - `public-explore-jobs` — read-only, CDN-cached, rate-limited by IP
   - `enqueue-ai-job` — validates, rate-limits, inserts `ai_jobs` row, sends Inngest event
   - `get-ai-job-status` — reads `ai_jobs` for `auth.uid()`
   - `ai-jobs-worker` — Inngest `serve` endpoint that defines two functions: `process-interview-job`, `process-tts-job`
4. **Edit existing Edge Functions** `ai-interview` and `elevenlabs-tts`: keep them as-is for backwards compat but add the rate-limit middleware; mark deprecated in comments.
5. **Frontend**:
   - `useExploreJobs(false)` → call `public-explore-jobs` Edge Function, no Realtime, `staleTime: 45_000`
   - `useExploreJobs(true)` (admin) keeps current Realtime + direct table read
   - Pagination params added to every list hook
   - `useAiJob(jobId)` polling hook used by interview / TTS callers; subscribes to `ai_jobs` via `realtimeBus` user scope for push updates
6. **Realtime bus tweak**: skip opening the global channel when there are no global subscribers AND when user is anon.
7. **Inngest connector**: prompt user to link via `standard_connectors--connect` (will pause for their click).
8. **Verify**: run `EXPLAIN ANALYZE` on the new public read path, run the linter, confirm no new security warnings, recalc scores.

---

## What I need from you before I start coding

1. **Confirm Inngest** — should I trigger the connector link prompt now? (required for async AI)
2. **Confirm Cloud instance upgrade willingness** — if you'd rather stay on the current instance for now, the ceiling stays at ~5K not 10K; everything else still ships.
3. **Confirm scope** — ship all 7 in-app items in one batch, or break into smaller turns (each turn is reviewable)?

Once you answer, I implement straight through and report before/after timings + the recalculated Performance and Production Readiness scores.

## Remaining bottlenecks that no in-app code can fix

- **Realtime channel cap** (~500): only liftable by Lovable infra. Mitigated by zero-channel anon path.
- **ElevenLabs concurrency cap**: external negotiation. Mitigated by Inngest queue absorbing bursts.
- **Auth signup throughput** (`POST /user_roles` 364 ms cold): one-time per user, not a sustained-traffic bottleneck.
- **Single-region latency**: Lovable Cloud is single-region. True global 10K requires multi-region, which is a Lovable roadmap item.
