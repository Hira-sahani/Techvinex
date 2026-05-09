// Shared abuse-prevention primitives.
// Designed so the rate-limiter store can later be swapped for Redis without
// touching call sites. All exports are framework-agnostic.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------- Logger (structured) ----------
export const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) => {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
};

// ---------- Admin client helper ----------
export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ---------- HMAC signature verification ----------
const enc = new TextEncoder();

export async function hmacHex(secret: string, payload: string, algo: "sha256" | "sha512" = "sha256"): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo === "sha256" ? "SHA-256" : "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export interface VerifyOpts {
  secret: string;
  payload: string;
  signatureHeader: string;          // raw header value, may be "sha256=..." or hex
  algorithm?: "sha256" | "sha512";
  timestamp?: string | null;        // optional unix seconds string
  toleranceSeconds?: number;
}

export async function verifyHmac(o: VerifyOpts): Promise<{ ok: boolean; reason?: string }> {
  if (o.timestamp && o.toleranceSeconds) {
    const ts = Number(o.timestamp);
    if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
    const skew = Math.abs(Date.now() / 1000 - ts);
    if (skew > o.toleranceSeconds) return { ok: false, reason: "timestamp_outside_tolerance" };
  }
  const expected = await hmacHex(o.secret, o.payload, o.algorithm ?? "sha256");
  const provided = (o.signatureHeader || "").trim().replace(/^sha(256|512)=/i, "");
  return safeEqual(expected, provided) ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}

// ---------- Idempotency ----------
export interface IdemResult<T = unknown> {
  replayed: boolean;
  status: number;
  body: T;
}

/**
 * Wrap an operation with idempotency semantics.
 * - First call: runs `fn`, stores result.
 * - Repeat call within TTL: returns the original response.
 */
export async function withIdempotency<T>(
  scope: string,
  key: string | null | undefined,
  fn: () => Promise<{ status: number; body: T }>,
  opts: { userId?: string | null; ttlHours?: number } = {},
): Promise<IdemResult<T>> {
  if (!key) {
    const r = await fn();
    return { replayed: false, ...r };
  }
  const db = admin();
  // Try to claim the key
  const { data: claim, error: claimErr } = await db
    .from("idempotency_keys")
    .insert({ scope, key, status: "in_progress", user_id: opts.userId ?? null })
    .select("id")
    .maybeSingle();

  if (claimErr && !String(claimErr.message).includes("duplicate")) {
    log("warn", "idem_claim_error", { error: claimErr.message });
  }

  if (!claim) {
    // Existing key — return stored result (poll briefly if still in_progress)
    for (let i = 0; i < 5; i++) {
      const { data } = await db
        .from("idempotency_keys")
        .select("status, response_status, response_body")
        .eq("scope", scope).eq("key", key).maybeSingle();
      if (data?.status === "completed") {
        return { replayed: true, status: data.response_status ?? 200, body: data.response_body as T };
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return { replayed: true, status: 409, body: { error: "idempotent_request_in_progress" } as unknown as T };
  }

  try {
    const r = await fn();
    await db.from("idempotency_keys").update({
      status: "completed",
      response_status: r.status,
      response_body: r.body as never,
      completed_at: new Date().toISOString(),
    }).eq("scope", scope).eq("key", key);
    return { replayed: false, ...r };
  } catch (e) {
    await db.from("idempotency_keys").update({ status: "failed" }).eq("scope", scope).eq("key", key);
    throw e;
  }
}

// ---------- Rate limiter (pluggable store) ----------
export interface RateStore {
  // Increments count for `key` within `windowMs`. Returns current count + ttlMs.
  hit(key: string, windowMs: number): Promise<{ count: number; resetMs: number }>;
}

class MemoryStore implements RateStore {
  private map = new Map<string, { count: number; reset: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const cur = this.map.get(key);
    if (!cur || cur.reset <= now) {
      const entry = { count: 1, reset: now + windowMs };
      this.map.set(key, entry);
      return { count: 1, resetMs: windowMs };
    }
    cur.count++;
    return { count: cur.count, resetMs: cur.reset - now };
  }
}

let _store: RateStore = new MemoryStore();
export const setRateStore = (s: RateStore) => { _store = s; };
export const getRateStore = () => _store;
// To swap to Redis later: implement RateStore against Upstash REST and call setRateStore(...).

export interface RateLimitConfig {
  route: string;
  limit: number;
  windowMs: number;
  failOpen?: boolean; // if store fails, allow request (true) or block (false)
}

export async function rateLimit(
  cfg: RateLimitConfig,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const key = `rl:${cfg.route}:${identifier}`;
  try {
    const { count, resetMs } = await _store.hit(key, cfg.windowMs);
    return { allowed: count <= cfg.limit, remaining: Math.max(0, cfg.limit - count), resetMs };
  } catch (e) {
    log("error", "rate_store_error", { route: cfg.route, error: String(e), failOpen: !!cfg.failOpen });
    return { allowed: !!cfg.failOpen, remaining: 0, resetMs: cfg.windowMs };
  }
}

// ---------- Fail-open / fail-closed wrapper for upstream calls ----------
export async function guarded<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { fallback?: T; mode?: "open" | "closed"; timeoutMs?: number } = {},
): Promise<T> {
  const mode = opts.mode ?? "closed";
  const timeoutMs = opts.timeoutMs ?? 10_000;
  try {
    const result = await Promise.race<T>([
      fn(),
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    return result;
  } catch (e) {
    log("error", "guarded_failure", { label, mode, error: String(e) });
    if (mode === "open" && "fallback" in opts) return opts.fallback as T;
    throw e;
  }
}
