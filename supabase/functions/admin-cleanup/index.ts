// Admin-only maintenance endpoint that invokes the existing SQL function
// public.cleanup_expired_rate_buckets(), which purges expired
// rate_limit_buckets and idempotency_keys.
//
// Scheduling: this project does not register pg_cron. Recommended operator
// setup is one of:
//   - Supabase Dashboard → Database → Cron → schedule
//       `select public.cleanup_expired_rate_buckets();` every 15 minutes.
//   - External scheduler (GitHub Actions, cron-job.org, etc.) POSTing to this
//     endpoint on an admin session.
//
// Auth: admin role required. Rate-limited to protect the DB from accidental
// hammering. Returns only a generic count; no raw DB details.
import { guard, guardJson } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

Deno.serve(withSentry("admin-cleanup", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: { key: "admin-cleanup", limit: 5, windowMs: 60_000, bucketBy: "user+ip" },
  }, async (ctx) => {
    const { data, error } = await ctx.db.rpc("cleanup_expired_rate_buckets");
    if (error) {
      await ctx.audit("admin_cleanup_failed", { ip: ctx.ip });
      return guardJson({ error: "cleanup_failed" }, 500);
    }
    const removed = typeof data === "number" ? data : 0;
    await ctx.audit("admin_cleanup_run", { removed });
    return guardJson({ ok: true, removed });
  })
));
