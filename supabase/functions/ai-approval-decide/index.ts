// Admin approval decision endpoint for AI high-risk actions.
// Only users with the "admin" role may approve or reject.

import { guard, z, guardJson } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";
import { auditSecurity } from "../_shared/ai-security.ts";

const bodySchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional(),
});

Deno.serve(withSentry("ai-approval-decide", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: { key: "ai-approval-decide", limit: 60, windowMs: 60_000, bucketBy: "user" },
    schema: bodySchema,
    maxBodyBytes: 4 * 1024,
  }, async (ctx) => {
    const { approvalId, decision, note } = ctx.body as z.infer<typeof bodySchema>;
    const { data: row, error } = await ctx.db
      .from("ai_approval_requests")
      .select("id,status,expires_at,user_id,action,risk,plan_hash")
      .eq("id", approvalId)
      .maybeSingle();
    if (error || !row) return guardJson({ error: "not_found" }, 404);
    if (row.status !== "pending") return guardJson({ error: "already_decided", status: row.status }, 409);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await ctx.db.from("ai_approval_requests").update({ status: "expired" }).eq("id", approvalId);
      return guardJson({ error: "expired" }, 410);
    }
    const { error: updErr } = await ctx.db
      .from("ai_approval_requests")
      .update({
        status: decision,
        decided_at: new Date().toISOString(),
        decided_by: ctx.userId,
      })
      .eq("id", approvalId)
      .eq("status", "pending");
    if (updErr) return guardJson({ error: "update_failed" }, 500);

    await auditSecurity({
      userId: ctx.userId, kind: "approval", event: `decision:${decision}`,
      severity: row.risk === "critical" ? "critical" : "high",
      planHash: row.plan_hash,
      details: { approvalId, action: row.action, target_user: row.user_id, note: note ?? null },
    });
    return guardJson({ ok: true, status: decision });
  })
));
