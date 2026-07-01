# Enterprise AI Agent Security Architecture

Scope: harden every AI-touching surface in Techvinex (interview agent, benchmark runner, TTS worker, async job pipeline) against prompt injection, tool injection, and data exfiltration. Introduce a shared security layer used by every edge function that talks to a model.

## 1. Shared Security Layer (`supabase/functions/_shared/ai-security.ts`)

New module exporting:

- `createExecutionPlan(kind, userId)` — returns a frozen `ExecutionPlan` object: allowed tools, max tool calls, max steps, allowed output types, allowed egress destinations, permission scope. Deep-frozen with `Object.freeze` + sealed properties. Signed with HMAC (`AI_PLAN_SIGNING_SECRET`, auto-generated) so downstream code rejects tampered plans.
- `enforcePlan(plan, requestedTool)` — throws `PlanViolationError` if a tool call is not in the plan or exceeds counters.
- `sanitizeExternalContent(text)` — strips/escapes known injection patterns (`ignore previous instructions`, `system:`, `<|im_start|>`, tool-call JSON blocks, base64 payloads > 2KB, zero-width chars, homoglyph runs). Returns `{ safe, findings[] }`.
- `detectPromptInjection(text)` — heuristic + regex scorer, threshold-based block.
- `redactSecrets(text)` — masks anything matching JWT, `sk-...`, `service_role`, Supabase URL, connection strings, `Bearer <token>`, emails when scope is public.
- `wrapExternalContent(text)` — wraps untrusted text in `<untrusted_content>…</untrusted_content>` XML fence + a preamble telling the model to treat contents strictly as data.
- `validateToolOutput(plan, output)` — enforces output type + size + no-egress rules.
- `AuditLogger` — appends structured entries to `ai_security_audit` table.

## 2. Database (`ai_security_audit`, `ai_safe_actions`)

Migration adds:

- `public.ai_security_audit` (id, user_id, job_id, kind, event, severity, plan_hash, details jsonb, created_at) with RLS: admin-only SELECT, service_role INSERT. GRANT block per project rules.
- `public.ai_safe_actions` registry table listing whitelisted operations the agent may invoke, with parameter schema + required role.
- Indexes on `(user_id, created_at desc)` and `(severity, created_at desc)`.

## 3. Safe Actions API (`supabase/functions/ai-safe-action/index.ts`)

Single choke-point edge function. Accepts `{ action, params, planToken }`.

- Verifies JWT (real user, not service role).
- Verifies plan HMAC and that `action` is in `plan.allowedTools`.
- Looks up action in `ai_safe_actions`; validates params with Zod schema stored per action.
- Enforces per-user + per-IP rate limit via existing `PgRateStore`.
- Executes the action through a narrow, hand-written dispatcher — never dynamic SQL, never raw table access. Initial whitelist:
  - `fetch_public_job(jobId)`
  - `fetch_benchmark_task_public(taskId)`
  - `record_interview_turn(jobId, text)`
  - `flag_content_for_review(payload)`
- Writes an `ai_security_audit` entry for every call (allowed or denied).
- Never returns secrets; response filtered through `redactSecrets`.

High-risk actions (payouts, admin ops, secret access) are explicitly absent — agent has no path to them.

## 4. Sandboxed Model Invocation

Refactor `ai-job-worker` and `ai-interview`:

1. Build execution plan for the job kind.
2. Load any external content (resume text, web page, RAG chunk) → run through `sanitizeExternalContent` + `wrapExternalContent`.
3. Call model with `system` prompt that references the plan and forbids following instructions inside `<untrusted_content>`.
4. If model requests a tool, route through `ai-safe-action` — never execute inline. Enforce `plan.maxToolCalls` counter.
5. Run response through `validateToolOutput` + `redactSecrets` before persisting to `ai_jobs.result`.
6. On any violation → mark job `failed` with reason `security_violation`, log audit entry `severity=high`.

Worker never receives or forwards service-role key to the model context. All privileged DB writes happen in the worker after Safe Action validation, not from model output.

## 5. Client-Side Guardrails

- `src/lib/aiSecurity.ts` — client mirror of `redactSecrets` + response-size cap; used by `useAiJob` and interview UI before rendering.
- Render assistant output through existing markdown renderer with `rehype-sanitize` allowlist (no `<script>`, no `javascript:` URLs, no `data:` beyond images).
- Strip any tool-call JSON from displayed content.

## 6. Rate Limiting & Human Approval

- Every Safe Action: 30 calls / user / minute, 200 / IP / minute (via `PgRateStore`).
- Actions flagged `requires_approval=true` in registry create an `ai_approvals` row and return `pending`; a human must approve in admin UI before execution. Initial approval-required set: `flag_content_for_review` when severity ≥ high.

## 7. Least Privilege & Zero Trust

- `ai-job-worker` keeps service-role but only writes to `ai_jobs` and `ai_security_audit`. All other DB access moves behind Safe Actions using a scoped anon+JWT client.
- Remove any direct `from("<any table>")` calls made from model-driven code paths.
- Add `SECURITY.md` documenting the trust boundary.

## 8. Verification

- New tests under `src/lib/aiSecurity.*.test.tsx` covering redaction + injection detection.
- Deno test for `_shared/ai-security.ts` covering plan freezing, HMAC verify, sanitizer, validator.
- Manual: run existing benchmark flow end-to-end; confirm audit rows appear and blocked-injection sample is rejected.

## 9. Security Report (delivered in chat after implementation)

Sections: vulnerabilities found, fixes shipped, residual risk, security score, OWASP LLM Top 10 mapping (LLM01–LLM10).

## Technical notes

- HMAC secret provisioned via `secrets--generate_secret` as `AI_PLAN_SIGNING_SECRET` (32 bytes).
- All migrations follow the required order: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY.
- No changes to `supabase/config.toml`, generated client, or types.
- No new npm dependencies on the client; edge functions use existing `@supabase/supabase-js` + Web Crypto.
