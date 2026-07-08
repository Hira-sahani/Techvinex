// Admin-only "mark scan reviewed" mutation.
// Replaces the previously exposed SECURITY DEFINER RPC
// `mark_scan_reviewed`, whose EXECUTE grant on `authenticated` was revoked in
// the F-2/G-1 remediation.
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

const schema = z.object({
  scan_id: z.string().uuid(),
  note: z.string().max(2000).nullable().optional(),
});

Deno.serve(withSentry("admin-mark-scan-reviewed", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: { key: "admin-mark-scan-reviewed", limit: 60, windowMs: 60_000, bucketBy: "user+ip" },
    schema,
  }, async (ctx) => {
    const { scan_id, note } = ctx.body as z.infer<typeof schema>;
    const { data, error } = await ctx.db
      .from("storage_scan_results")
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.userId,
        ...(note !== undefined && note !== null ? { review_note: note } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scan_id)
      .select()
      .maybeSingle();
    if (error) return guardJson({ error: "update_failed" }, 500);
    if (!data) return guardJson({ error: "not_found" }, 404);
    await ctx.audit("scan_marked_reviewed", { scan_id }, scan_id);
    return guardJson({ scan: data });
  })
));
