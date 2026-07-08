// Step-up re-authentication: verify the current session's password WITHOUT
// rotating the caller's refresh token (which the previous client-side
// `signInWithPassword` flow did — that revoked every concurrent tab/device
// as a side effect of proving password knowledge).
//
// Flow: the client sends its access token (via the standard Authorization
// header handled by guard) plus the current password in the body. We:
//   1. Resolve the caller's email from their verified user id.
//   2. Call GoTrue's /token?grant_type=password with a *fresh* client
//      (no persistSession, no storage) purely as a proof-of-knowledge check.
//   3. Discard whatever session GoTrue returns; the caller keeps their existing
//      tokens.
// Response is a short-lived signed re-auth token (HMAC over user_id + issued_at)
// that the client passes back to any downstream endpoint that requires step-up.
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const schema = z.object({ password: z.string().min(1).max(256) });

const b64u = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ""; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function signReauthToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  const seed = Deno.env.get("AI_PLAN_SIGNING_SECRET") ?? Deno.env.get("SECRETS_ENCRYPTION_KEY");
  if (!seed) throw new Error("signing_secret_unavailable");
  const issued = Math.floor(Date.now() / 1000);
  const expiresAt = issued + 300; // 5 minutes
  const payload = `stepup:v1:${userId}:${issued}:${expiresAt}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(seed),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return { token: `${b64u(new TextEncoder().encode(payload))}.${b64u(sig)}`, expiresAt };
}

Deno.serve(withSentry("verify-password", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "verify-password", limit: 5, windowMs: 60_000, bucketBy: "user+ip" },
    schema,
  }, async (ctx) => {
    const { password } = ctx.body as z.infer<typeof schema>;

    // Resolve caller's verified email via service-role client.
    const { data: userRes, error: userErr } = await ctx.db.auth.admin.getUserById(ctx.userId!);
    if (userErr || !userRes?.user?.email) {
      await ctx.audit("stepup_failed", { reason: "no_email" });
      return guardJson({ error: "no_email_on_account" }, 400);
    }
    const email = userRes.user.email;

    // Isolated client so verification does not touch the caller's session.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const probe = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: signInErr } = await probe.auth.signInWithPassword({ email, password });
    if (signInErr) {
      await ctx.audit("stepup_failed", { reason: "bad_password" });
      return guardJson({ error: "invalid_credentials" }, 401);
    }
    // Immediately revoke the token we just minted so nothing lingers.
    try { await probe.auth.signOut(); } catch { /* best-effort */ }

    const { token, expiresAt } = await signReauthToken(ctx.userId!);
    await ctx.audit("stepup_ok", { exp: expiresAt });
    return guardJson({ ok: true, reauth_token: token, expires_at: expiresAt });
  })
));
