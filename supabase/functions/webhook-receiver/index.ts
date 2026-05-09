// Generic HMAC-verified webhook receiver.
// Path:  /webhook-receiver?endpoint=<name>
// Looks up the endpoint in `webhook_endpoints`, fetches its secret from
// `public.secrets` (decrypted via admin-secrets convention), verifies HMAC,
// records delivery in `webhook_deliveries`, and supports idempotency via
// the `Idempotency-Key` header.

import {
  admin, log, verifyHmac, withIdempotency, rateLimit, guarded,
} from "../_shared/abuse-prevention.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key, x-signature, x-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

// ---- Reuse decrypt logic ----
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const endpointName = url.searchParams.get("endpoint");
  if (!endpointName) return json({ error: "endpoint query param required" }, 400);

  // Per-route rate limit (in-memory; pluggable)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(
    { route: `webhook:${endpointName}`, limit: 120, windowMs: 60_000, failOpen: true },
    ip,
  );
  if (!rl.allowed) return json({ error: "rate_limited" }, 429);

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
    return json({ error: "unknown endpoint" }, 404);
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get(ep.signature_header) ?? "";
  const tsHeader = req.headers.get("x-timestamp");

  const secret = await loadSecret(ep.secret_key_name);
  if (!secret) {
    await recordDelivery(false, 500, "secret_missing", rawBody);
    return json({ error: "endpoint misconfigured" }, 500);
  }

  const verification = await verifyHmac({
    secret, payload: tsHeader ? `${tsHeader}.${rawBody}` : rawBody,
    signatureHeader: sigHeader,
    algorithm: (ep.algorithm as "sha256" | "sha512") ?? "sha256",
    timestamp: tsHeader, toleranceSeconds: ep.tolerance_seconds,
  });
  if (!verification.ok) {
    await recordDelivery(false, 401, verification.reason ?? "invalid_signature", rawBody);
    log("warn", "webhook_rejected", { endpoint: endpointName, reason: verification.reason });
    return json({ error: "invalid signature" }, 401);
  }

  // Idempotency
  const idemKey = req.headers.get("idempotency-key");
  const result = await withIdempotency(
    `webhook:${endpointName}`,
    idemKey,
    async () => {
      // Process — kept generic. Real handlers can branch on endpointName.
      // Wrapped in guarded() with fail-closed semantics for upstream calls.
      await guarded("webhook_handler", async () => {
        log("info", "webhook_received", { endpoint: endpointName, bytes: rawBody.length });
      }, { mode: "closed", timeoutMs: 5000 });
      return { status: 200, body: { ok: true, endpoint: endpointName } };
    },
  );

  await recordDelivery(true, result.status, result.replayed ? "replayed" : "ok", rawBody);
  return json(result.body, result.status);
});
