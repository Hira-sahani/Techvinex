// Admin Secrets Management — AES-256-GCM encryption, admin-only access.
// All access checks delegated to the centralized guard (default-deny).
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

// ---- Encryption (AES-256-GCM) ----
//
// Ciphertext format is versioned so we can rotate keys without a data migration:
//   v2 (current):  "v2.<iv_b64u>.<ct_b64u>"   key = SHA-256("secrets-v2::" + SECRETS_ENCRYPTION_KEY)
//   v1 (legacy):   "<iv_b64u>.<ct_b64u>"      key = SHA-256("secrets-v1::" + SUPABASE_SERVICE_ROLE_KEY)
//
// Writes always use v2. Reads try v2 first, then transparently fall back to v1
// so pre-rotation ciphertexts stay readable. Every UPDATE (rotate/upsert) rewrites
// the row with v2, so v1 data is drained over time. Rotation runbook:
//   1. Generate a new SECRETS_ENCRYPTION_KEY (>=32 random chars) and set it as a secret.
//   2. Rewrite each stored secret via the admin UI (Rotate) — this re-encrypts under v2.
//   3. Once all ciphertexts start with "v2.", the old value may be discarded.
async function keyFromSeed(seed: string, label: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(label + seed));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function getKeyV2(): Promise<CryptoKey> {
  const seed = Deno.env.get("SECRETS_ENCRYPTION_KEY") ?? "";
  if (!seed || seed.length < 32) throw new Error("SECRETS_ENCRYPTION_KEY missing or too short");
  return keyFromSeed(seed, "secrets-v2::");
}
async function getKeyV1(): Promise<CryptoKey | null> {
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!seed) return null;
  return keyFromSeed(seed, "secrets-v1::");
}
const b64u = {
  enc: (b: ArrayBuffer | Uint8Array) => {
    const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
    let s = ""; for (const x of bytes) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec: (s: string) => {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  },
};
async function encrypt(plain: string): Promise<string> {
  const key = await getKeyV2();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `v2.${b64u.enc(iv)}.${b64u.enc(ct)}`;
}
async function decrypt(payload: string): Promise<string> {
  const parts = payload.split(".");
  let iv: Uint8Array, ct: Uint8Array, key: CryptoKey | null;
  if (parts.length === 3 && parts[0] === "v2") {
    iv = b64u.dec(parts[1]); ct = b64u.dec(parts[2]); key = await getKeyV2();
  } else if (parts.length === 2) {
    iv = b64u.dec(parts[0]); ct = b64u.dec(parts[1]); key = await getKeyV1();
  } else {
    throw new Error("Bad ciphertext");
  }
  if (!key) throw new Error("Decryption key unavailable");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
const mask = (v: string) => {
  if (!v) return "****";
  const tail = v.slice(-4);
  return `${"•".repeat(Math.min(12, Math.max(4, v.length - 4)))}${tail}`;
};

const KEY_RE = /^[A-Z][A-Z0-9_]{2,127}$/;

const upsertSchema = z.object({
  key: z.string().regex(KEY_RE, "Use UPPER_SNAKE_CASE"),
  value: z.string().min(1).max(8192),
  description: z.string().max(500).nullable().optional(),
  action: z.enum(["create", "rotate"]).optional(),
});

Deno.serve(withSentry("admin-secrets", (req) => {
  const method = req.method as "GET" | "POST" | "DELETE" | "OPTIONS";

  return guard(req, {
    allowedMethods: ["GET", "POST", "DELETE"],
    requireAuth: true,
    requireRoles: ["admin"],
    rateLimit: {
      key: `admin-secrets:${method}`,
      // Reads can be more frequent; writes are tightly limited (brute-force on rotation).
      limit: method === "GET" ? 120 : 20,
      windowMs: 60_000,
      bucketBy: "user+ip",
    },
    schema: method === "POST" ? upsertSchema : undefined,
    maxBodyBytes: 32 * 1024,
  }, async (ctx) => {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const reveal = url.searchParams.get("reveal") === "1";
      const id = url.searchParams.get("id");
      if (reveal && id) {
        // Ownership check is irrelevant (admin-only), but we still scope by id and
        // refuse to dump arbitrary rows. Audit every reveal.
        const { data, error } = await ctx.db.from("secrets").select("*").eq("id", id).maybeSingle();
        if (error || !data) return guardJson({ error: "not_found" }, 404);
        const value = await decrypt(data.value);
        await ctx.audit("secret_reveal", { key: data.key }, data.id);
        return guardJson({ id: data.id, key: data.key, value });
      }
      const { data, error } = await ctx.db
        .from("secrets")
        .select("id, key, hint, description, created_at, updated_at")
        .order("key");
      if (error) return guardJson({ error: "query_failed" }, 500);
      const masked = (data ?? []).map((r) => ({
        ...r, masked_value: r.hint ? `${"•".repeat(12)}${r.hint}` : "••••••••",
      }));
      return guardJson({ secrets: masked });
    }

    if (req.method === "POST") {
      const { key, value, description, action } = ctx.body as z.infer<typeof upsertSchema>;
      const ciphertext = await encrypt(value);
      const hint = value.slice(-4);
      const { data, error } = await ctx.db
        .from("secrets")
        .upsert({ key, value: ciphertext, hint, description: description ?? null, created_by: ctx.userId },
          { onConflict: "key" })
        .select("id, key, hint, description, created_at, updated_at")
        .single();
      if (error) return guardJson({ error: "save_failed" }, 500);
      await ctx.audit(action === "rotate" ? "secret_rotate" : "secret_upsert",
        { key, hint: data.hint }, data.id);
      return guardJson({ secret: { ...data, masked_value: mask(value) } });
    }

    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return guardJson({ error: "id_required" }, 400);
      const { error } = await ctx.db.from("secrets").delete().eq("id", id);
      if (error) return guardJson({ error: "delete_failed" }, 500);
      await ctx.audit("secret_delete", {}, id);
      return guardJson({ ok: true });
    }

    return guardJson({ error: "method_not_allowed" }, 405);
  });
}));
