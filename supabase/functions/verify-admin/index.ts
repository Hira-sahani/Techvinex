// CV-3 patch: server-side admin verification.
// The client signs in with email/password, then immediately calls this
// function. If the caller does not have the `admin` role, the function
// records an audit row, returns 403, and the client signs out.
// This complements (does not replace) Postgres RLS, which already enforces
// admin-only access to every admin-protected table.
import { guard, guardJson } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

Deno.serve(withSentry("verify-admin", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: { key: "verify-admin", limit: 30, windowMs: 60_000, bucketBy: "user+ip" },
  }, async (ctx) => {
    await ctx.audit("admin_verify_ok", { ip: ctx.ip });
    return guardJson({ ok: true, userId: ctx.userId });
  })
));
