// Admin Secrets Management — AES-256-GCM encryption, admin-only access.
// All access checks delegated to the centralized guard (default-deny).
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

// ---- Encryption (AES-256-GCM) ----
async function getKey(): Promise<CryptoKey> {
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!seed) throw new Error("Encryption seed missing");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("secrets-v1::" + seed));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
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
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${b64u.enc(iv)}.${b64u.enc(ct)}`;
}
async function decrypt(payload: string): Promise<string> {
  const [ivStr, ctStr] = payload.split(".");
  if (!ivStr || !ctStr) throw new Error("Bad ciphertext");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u.dec(ivStr) }, key, b64u.dec(ctStr));
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
