// Returns the current status (and result, if completed) of an ai_jobs row
// owned by the caller. Used by the polling fallback when Realtime push isn't
// available (e.g. offline reconnect, anon-to-authed transition).

import { guard, z, guardJson } from "../_shared/guard.ts";

const schema = z.object({ jobId: z.string().uuid() });

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "get-ai-job-status", limit: 120, windowMs: 60_000, bucketBy: "user" },
    schema,
    maxBodyBytes: 1024,
  }, async ({ userId, body, db }) => {
    const { data, error } = await db
      .from("ai_jobs")
      .select("id, kind, status, result, error, created_at, completed_at")
      .eq("id", body.jobId)
      .eq("user_id", userId!)
      .maybeSingle();

    if (error) return guardJson({ error: "fetch_failed" }, 500);
    if (!data) return guardJson({ error: "not_found" }, 404);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Authenticated, user-specific — never cache at the edge.
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  })
);
