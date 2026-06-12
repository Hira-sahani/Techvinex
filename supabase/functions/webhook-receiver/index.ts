// Generic HMAC-verified webhook receiver. Default-deny via guard().
// Webhooks are unauthenticated by Supabase JWT — auth = HMAC signature.
import { guard, guardJson } from "../_shared/guard.ts";
import { admin, log, verifyHmac, withIdempotency, guarded } from "../_shared/abuse-prevention.ts";
import { withSentry } from "../_shared/sentry.ts";

// ---- Decrypt secrets stored in `secrets` table ----
async function getKey(): Promise<CryptoKey> {
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("secrets-v1::" + seed));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}
function b64uDec(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function decrypt(payload: string): Promise<string> {
  const [iv, ct] = payload.split(".");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64uDec(iv) }, key, b64uDec(ct));
  return new TextDecoder().decode(pt);
}
async function loadSecret(name: string): Promise<string | null> {
  const { data } = await admin().from("secrets").select("value").eq("key", name).maybeSingle();
  if (data?.value) {
    try { return await decrypt(data.value); } catch { /* fall through */ }
  }
  return Deno.env.get(name) ?? null;
}

Deno.serve(withSentry("webhook-receiver", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: false,                 // signed by HMAC, not JWT
    rateLimit: { key: "webhook", limit: 240, windowMs: 60_000, failOpen: true, bucketBy: "ip" },
    rawBody: true,
    maxBodyBytes: 1024 * 1024,          // 1 MB
  }, async (ctx) => {
    const url = new URL(req.url);
    const endpointName = url.searchParams.get("endpoint");
    if (!endpointName) return guardJson({ error: "endpoint_required" }, 400);

    const db = admin();
    const { data: ep } = await db.from("webhook_endpoints")
      .select("name, secret_key_name, signature_header, algorithm, tolerance_seconds, is_active")
      .eq("name", endpointName).maybeSingle();

    const recordDelivery = (verified: boolean, status: number, reason: string, bodyPreview: string) =>
      db.from("webhook_deliveries").insert({
        endpoint_name: endpointName, verified, status_code: status, reason,
        headers: Object.fromEntries(req.headers), body_preview: bodyPreview.slice(0, 1000),
      }).then(() => {}, () => {});

    if (!ep || !ep.is_active) {
      await recordDelivery(false, 404, "endpoint_not_found_or_inactive", "");
      return guardJson({ error: "unknown_endpoint" }, 404);
    }

    const sigHeader = req.headers.get(ep.signature_header) ?? "";
    const tsHeader = req.headers.get("x-timestamp");
    const secret = await loadSecret(ep.secret_key_name);
    if (!secret) {
      await recordDelivery(false, 500, "secret_missing", ctx.rawBody);
      return guardJson({ error: "endpoint_misconfigured" }, 500);
    }

    const verification = await verifyHmac({
      secret, payload: tsHeader ? `${tsHeader}.${ctx.rawBody}` : ctx.rawBody,
      signatureHeader: sigHeader,
      algorithm: (ep.algorithm as "sha256" | "sha512") ?? "sha256",
      timestamp: tsHeader, toleranceSeconds: ep.tolerance_seconds,
    });
    if (!verification.ok) {
      await recordDelivery(false, 401, verification.reason ?? "invalid_signature", ctx.rawBody);
      log("warn", "webhook_rejected", { endpoint: endpointName, reason: verification.reason });
      return guardJson({ error: "invalid_signature" }, 401);
    }

    const result = await withIdempotency(
      `webhook:${endpointName}`, ctx.idempotencyKey,
      async () => {
        await guarded("webhook_handler", async () => {
          log("info", "webhook_received", { endpoint: endpointName, bytes: ctx.rawBody.length });
        }, { mode: "closed", timeoutMs: 5000 });
        return { status: 200, body: { ok: true, endpoint: endpointName } };
      },
    );

    await recordDelivery(true, result.status, result.replayed ? "replayed" : "ok", ctx.rawBody);
    return guardJson(result.body, result.status);
  })
));
