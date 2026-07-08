// Admin/reviewer-only read of privileged benchmark task fields
// (system_prompt, expected_output, rubric).
// Replaces the previously exposed SECURITY DEFINER RPC
// `get_benchmark_task_secret`, whose EXECUTE grant on `authenticated` was
// revoked in the F-2/G-1 remediation.
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

const schema = z.object({ task_id: z.string().uuid() });

Deno.serve(withSentry("benchmark-task-secret", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin", "reviewer"],
    rateLimit: { key: "benchmark-task-secret", limit: 120, windowMs: 60_000, bucketBy: "user+ip" },
    schema,
  }, async (ctx) => {
    const { task_id } = ctx.body as z.infer<typeof schema>;
    const { data, error } = await ctx.db
      .from("benchmark_tasks")
      .select("id, system_prompt, expected_output, rubric")
      .eq("id", task_id)
      .maybeSingle();
    if (error) return guardJson({ error: "lookup_failed" }, 500);
    if (!data) return guardJson({ error: "not_found" }, 404);
    return guardJson({ task: data });
  })
));
