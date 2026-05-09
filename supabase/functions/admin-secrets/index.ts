// Admin Secrets Management — AES-256-GCM encryption, admin-only access
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---- Encryption (AES-256-GCM) ----
// Derive a deterministic 32-byte key from SUPABASE_SERVICE_ROLE_KEY via SHA-256.
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
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64u.dec(ivStr) },
    key,
    b64u.dec(ctStr),
  );
  return new TextDecoder().decode(pt);
}

const mask = (v: string) => {
  if (!v) return "****";
  const tail = v.slice(-4);
  return `${"•".repeat(Math.min(12, Math.max(4, v.length - 4)))}${tail}`;
};

const KEY_RE = /^[A-Z][A-Z0-9_]{2,127}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller + admin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

    const url = new URL(req.url);
    const reveal = url.searchParams.get("reveal") === "1";
    const id = url.searchParams.get("id");

    // ---- GET: list secrets (masked, or revealed when ?reveal=1&id=...) ----
    if (req.method === "GET") {
      if (reveal && id) {
        const { data, error } = await admin.from("secrets").select("*").eq("id", id).maybeSingle();
        if (error || !data) return json({ error: "Not found" }, 404);
        const value = await decrypt(data.value);
        return json({ id: data.id, key: data.key, value });
      }
      const { data, error } = await admin
        .from("secrets")
        .select("id, key, hint, description, created_at, updated_at")
        .order("key");
      if (error) return json({ error: error.message }, 500);
      const masked = (data ?? []).map((r) => ({
        ...r,
        masked_value: r.hint ? `${"•".repeat(12)}${r.hint}` : "••••••••",
      }));
      return json({ secrets: masked });
    }

    // ---- POST: create or update (upsert by key) ----
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const key = String(body.key ?? "").trim();
      const value = String(body.value ?? "");
      const description = body.description ? String(body.description) : null;

      if (!KEY_RE.test(key)) {
        return json({ error: "Invalid key. Use UPPER_SNAKE_CASE (e.g. STRIPE_API_KEY)" }, 400);
      }
      if (!value || value.length < 1 || value.length > 8192) {
        return json({ error: "Value required (1-8192 chars)" }, 400);
      }

      const ciphertext = await encrypt(value);
      const hint = value.slice(-4);

      const { data, error } = await admin
        .from("secrets")
        .upsert(
          { key, value: ciphertext, hint, description, created_by: userData.user.id },
          { onConflict: "key" },
        )
        .select("id, key, hint, description, created_at, updated_at")
        .single();
      if (error) return json({ error: error.message }, 500);

      const action = body.action === "rotate" ? "secret_rotate" : "secret_upsert";
      await admin.from("audit_logs").insert({
        user_id: userData.user.id,
        action,
        target_type: "secret",
        target_id: data.id,
        details: { key, hint: data.hint },
      });

      return json({ secret: { ...data, masked_value: mask(value) } }, 200);
    }

    // ---- DELETE: by id ----
    if (req.method === "DELETE") {
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await admin.from("secrets").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      await admin.from("audit_logs").insert({
        user_id: userData.user.id,
        action: "secret_delete",
        target_type: "secret",
        target_id: id,
        details: {},
      });
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("admin-secrets error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
