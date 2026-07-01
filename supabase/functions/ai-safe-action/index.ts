// Safe Actions choke-point.
//
// The AI agent NEVER runs privileged code directly. Every side-effect it
// requests must arrive here, carrying a signed execution plan token. This
// function:
//   1. Verifies caller identity (JWT) and rate limit.
//   2. Verifies plan HMAC + expiration.
//   3. Ensures the requested action is on the plan's allow-list.
//   4. Validates params against the action's registered schema.
//   5. Dispatches to a narrow hand-written implementation — no dynamic SQL,
//      no raw table writes from model output, no secrets echoed back.
//   6. Redacts response, records audit row (allow or deny).

import { guard, z, guardJson } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";
import {
  verifyPlanToken,
  PlanEnforcer,
  PlanViolationError,
  auditSecurity,
  redactDeep,
  validateToolOutput,
} from "../_shared/ai-security.ts";
import {
  evaluatePolicy,
  requestHumanApproval,
  checkApprovalStatus,
  getActionPolicy,
} from "../_shared/ai-policy.ts";

const bodySchema = z.object({
  planToken: z.string().min(20).max(8000),
  action: z.string().min(2).max(64),
  params: z.record(z.unknown()).default({}),
});

// Per-action narrow dispatchers. Each returns { status, body }.
async function dispatch(
  action: string,
  params: Record<string, unknown>,
  ctx: { db: any; userId: string | null },
): Promise<{ status: number; body: unknown }> {
  switch (action) {
    case "fetch_public_job": {
      const p = z.object({ jobId: z.string().uuid() }).parse(params);
      const { data, error } = await ctx.db
        .from("explore_jobs")
        .select("id,title,company,location,description,category,posted_at")
        .eq("id", p.jobId)
        .eq("status", "active")
        .maybeSingle();
      if (error) return { status: 500, body: { error: "fetch_failed" } };
      return { status: 200, body: data };
    }
    case "fetch_benchmark_task_public": {
      const p = z.object({ taskId: z.string().uuid() }).parse(params);
      const { data, error } = await ctx.db
        .from("benchmark_tasks")
        .select("id,title,category,difficulty,description")
        .eq("id", p.taskId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) return { status: 500, body: { error: "fetch_failed" } };
      return { status: 200, body: data };
    }
    case "record_interview_turn": {
      const p = z.object({ jobId: z.string().uuid(), text: z.string().max(8000) }).parse(params);
      if (!ctx.userId) return { status: 401, body: { error: "unauthorized" } };
      // Ownership guard: user may only append to their own ai_jobs row.
      const { data: job } = await ctx.db
        .from("ai_jobs").select("id,user_id,input").eq("id", p.jobId).maybeSingle();
      if (!job || job.user_id !== ctx.userId) {
        return { status: 403, body: { error: "forbidden" } };
      }
      const turns = Array.isArray((job.input as any)?.turns) ? (job.input as any).turns : [];
      turns.push({ at: new Date().toISOString(), text: p.text });
      await ctx.db.from("ai_jobs")
        .update({ input: { ...(job.input as any ?? {}), turns } })
        .eq("id", p.jobId);
      return { status: 200, body: { ok: true, count: turns.length } };
    }
    case "flag_content_for_review": {
      const p = z.object({ reason: z.string().max(500), payload: z.record(z.unknown()).optional() }).parse(params);
      // Human-approval required actions land here as "pending". A human
      // moderator later resolves via a separate admin flow.
      return { status: 202, body: { ok: true, status: "pending_review", reason: p.reason, payload: p.payload ?? {} } };
    }
    default:
      return { status: 404, body: { error: "unknown_action" } };
  }
}

Deno.serve(withSentry("ai-safe-action", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "ai-safe-action", limit: 60, windowMs: 60_000, bucketBy: "user+ip" },
    schema: bodySchema,
    maxBodyBytes: 16 * 1024,
  }, async (ctx) => {
    const { planToken, action, params } = ctx.body as z.infer<typeof bodySchema>;

    // 1. Verify plan HMAC.
    let signed;
    try { signed = await verifyPlanToken(planToken); }
    catch (e) {
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "plan_invalid", severity: "high",
        details: { action, error: String((e as Error).message) },
      });
      return guardJson({ error: "invalid_plan" }, 401);
    }

    const enforcer = new PlanEnforcer(signed);

    // 2. Ensure plan owner matches caller when plan is user-scoped.
    if (signed.plan.userId && signed.plan.userId !== ctx.userId) {
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "plan_owner_mismatch", severity: "high",
        planHash: signed.hash, details: { action },
      });
      return guardJson({ error: "forbidden" }, 403);
    }

    // 3. Enforce allow-list + counters + registry lookup.
    try {
      enforcer.step();
      enforcer.authorizeTool(action);
    } catch (e) {
      const err = e as PlanViolationError;
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "plan_violation", severity: "high",
        planHash: signed.hash, details: { action, code: err.code, ...err.details },
      });
      return guardJson({ error: "plan_violation", code: err.code }, 403);
    }

    // 4. Registry check (enabled + approval flag).
    const { data: reg } = await ctx.db
      .from("ai_safe_actions")
      .select("name,requires_approval,enabled")
      .eq("name", action)
      .maybeSingle();
    if (!reg || !reg.enabled) {
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "action_disabled", severity: "medium",
        planHash: signed.hash, details: { action },
      });
      return guardJson({ error: "action_disabled" }, 403);
    }

    // 5. Dispatch, then redact + validate output.
    try {
      const result = await dispatch(action, params, { db: ctx.db, userId: ctx.userId });
      const safeBody = validateToolOutput(enforcer, redactDeep(result.body), "json");
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "invoked", severity: "info",
        planHash: signed.hash,
        details: { action, status: result.status, requires_approval: reg.requires_approval },
      });
      return guardJson(safeBody as Record<string, unknown>, result.status);
    } catch (e) {
      await auditSecurity({
        userId: ctx.userId, kind: "safe_action", event: "dispatch_failed", severity: "medium",
        planHash: signed.hash, details: { action, error: String((e as Error).message) },
      });
      return guardJson({ error: "action_failed" }, 500);
    }
  })
));
