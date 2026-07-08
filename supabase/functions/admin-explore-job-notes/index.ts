// Admin-only read of `explore_jobs.internal_notes`.
// Replaces the previously exposed SECURITY DEFINER RPC
// `admin_get_explore_job_internal_notes`, whose EXECUTE grant on `authenticated`
// was revoked in the F-2/G-1 remediation.
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

const schema = z.object({ job_id: z.string().uuid() });

Deno.serve(withSentry("admin-explore-job-notes", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: { key: "admin-explore-job-notes", limit: 60, windowMs: 60_000, bucketBy: "user+ip" },
    schema,
  }, async (ctx) => {
    const { job_id } = ctx.body as z.infer<typeof schema>;
    const { data, error } = await ctx.db
      .from("explore_jobs")
      .select("internal_notes")
      .eq("id", job_id)
      .maybeSingle();
    if (error) return guardJson({ error: "lookup_failed" }, 500);
    return guardJson({ internal_notes: (data?.internal_notes as string | null) ?? null });
  })
));
