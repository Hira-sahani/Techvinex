// Centralized zero-trust guard for Edge Functions.
// Default-deny: every check that isn't satisfied -> 401/403/405/415/422/429.
// Returns a typed handler context only when ALL declared checks pass.
//
// Usage:
//   Deno.serve((req) => guard(req, { allowedMethods:["POST"], requireAuth:true,
//     requireRoles:["admin"], rateLimit:{ key:"x", limit:30, windowMs:60_000 },
//     schema:z.object({...}) }, async ({ userId, body }) => { ... }));

import { z, ZodSchema } from "https://esm.sh/zod@3.23.8";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { admin, log, rateLimit, setRateStore, PgRateStore, withIdempotency } from "./abuse-prevention.ts";

// One-time: distributed limiter shared across instances.
setRateStore(new PgRateStore());

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key, x-signature, x-timestamp, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  // Defense-in-depth response headers.
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

export type AppRole = "admin" | "reviewer" | "viewer" | "employer" | "candidate";

export interface GuardConfig<TBody = unknown> {
  /** HTTP methods this handler accepts. Anything else → 405. */
  allowedMethods: Array<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">;
  /** Require a verified Supabase session (default: true). */
  requireAuth?: boolean;
  /** If set, user must have at least one of these roles in `user_roles`. */
  requireRoles?: AppRole[];
  /** If set, only requests whose Origin/Referer is in the list are allowed (browser-CSRF defense). Server-to-server callers without an Origin header are allowed. */
  allowedOrigins?: string[];
  /** Per-route rate limit. */
  rateLimit?: {
    key: string;
    limit: number;
    windowMs: number;
    /** If true, allow when the limiter store fails. Default false (fail-closed). */
    failOpen?: boolean;
    /** What to bucket on. Default: user id when authed, else IP. */
    bucketBy?: "user" | "ip" | "user+ip";
  };
  /** Zod schema for the JSON body. Strict by default → unknown fields rejected. */
  schema?: ZodSchema<TBody>;
  /** Maximum bytes accepted in the request body (default 256 KB). */
  maxBodyBytes?: number;
  /** If set, request must include `Idempotency-Key` header (or 400). */
  idempotency?: { scope: string; required?: boolean };
  /** Skip JSON parse for handlers that need raw bodies (e.g. webhook signatures). */
  rawBody?: boolean;
}

export interface GuardCtx<TBody = unknown> {
  req: Request;
  userId: string | null;
  claims: Record<string, unknown> | null;
  roles: AppRole[];
  body: TBody;
  rawBody: string;
  idempotencyKey: string | null;
  ip: string;
  /** Use to record domain audit rows (allows + denies are auto-logged on the deny path). */
  audit: (action: string, details?: Record<string, unknown>, targetId?: string) => Promise<void>;
  /** Admin Supabase client (service role). Use sparingly — prefer scoped queries. */
  db: SupabaseClient;
  /** Wrap the handler result in idempotency (only when idempotency.scope is configured). */
  withIdem: <T>(fn: () => Promise<{ status: number; body: T }>) => ReturnType<typeof withIdempotency<T>>;
}

const DEFAULT_ALLOWED_ORIGINS = [
  // Lovable preview + production hosts.
  /^https:\/\/[\w-]+\.lovable\.app$/,
  /^https:\/\/[\w-]+\.lovableproject\.com$/,
  /^https:\/\/techvinex\.com$/,
  /^https:\/\/www\.techvinex\.com$/,
  /^http:\/\/localhost:\d+$/,
];

function originAllowed(originHeader: string | null, extra: string[] = []) {
  if (!originHeader) return true; // server-to-server callers have no Origin
  if (extra.includes(originHeader)) return true;
  return DEFAULT_ALLOWED_ORIGINS.some((re) => re.test(originHeader));
}

async function getRoles(db: SupabaseClient, userId: string): Promise<AppRole[]> {
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as AppRole);
}

async function recordDeny(opts: {
  userId: string | null;
  action: string;
  reason: string;
  route: string;
  ip: string;
  details?: Record<string, unknown>;
}) {
  try {
    await admin().from("audit_logs").insert({
      user_id: opts.userId,
      action: `deny:${opts.action}`,
      target_type: "edge_function",
      target_id: opts.route,
      details: { reason: opts.reason, ip: opts.ip, ...opts.details },
    });
  } catch (e) {
    log("warn", "audit_insert_failed", { error: String(e) });
  }
}

export async function guard<TBody = unknown>(
  req: Request,
  cfg: GuardConfig<TBody>,
  handler: (ctx: GuardCtx<TBody>) => Promise<Response> | Response,
): Promise<Response> {
  // CORS preflight short-circuit.
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const route = url.pathname;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 1. Method allowlist.
  if (!cfg.allowedMethods.includes(req.method as never)) {
    await recordDeny({ userId: null, action: "method", reason: req.method, route, ip });
    return json({ error: "method_not_allowed", code: "METHOD" }, 405,
      { Allow: cfg.allowedMethods.join(", ") });
  }

  // 2. Origin/Referer (browser-CSRF defense; tolerant for server callers).
  const origin = req.headers.get("origin");
  if (!originAllowed(origin, cfg.allowedOrigins)) {
    await recordDeny({ userId: null, action: "origin", reason: origin ?? "(none)", route, ip });
    return json({ error: "forbidden", code: "ORIGIN" }, 403);
  }

  // 3. Auth (default true).
  const requireAuth = cfg.requireAuth ?? true;
  let userId: string | null = null;
  let claims: Record<string, unknown> | null = null;
  let roles: AppRole[] = [];

  const authHeader = req.headers.get("Authorization") ?? "";
  if (requireAuth || authHeader.startsWith("Bearer ")) {
    if (!authHeader.startsWith("Bearer ")) {
      await recordDeny({ userId: null, action: "auth", reason: "missing_bearer", route, ip });
      return json({ error: "unauthorized", code: "AUTH" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data, error } = await userClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      await recordDeny({ userId: null, action: "auth", reason: "invalid_token", route, ip });
      return json({ error: "unauthorized", code: "AUTH" }, 401);
    }
    claims = data.claims as Record<string, unknown>;
    userId = String(data.claims.sub);

    // 4. RBAC.
    if (cfg.requireRoles && cfg.requireRoles.length > 0) {
      roles = await getRoles(admin(), userId);
      const ok = cfg.requireRoles.some((r) => roles.includes(r));
      if (!ok) {
        await recordDeny({
          userId, action: "rbac", reason: `need:${cfg.requireRoles.join("|")}`,
          route, ip, details: { has: roles },
        });
        return json({ error: "forbidden", code: "ROLE" }, 403);
      }
    }
  }

  // 5. Per-route rate limit.
  if (cfg.rateLimit) {
    const bucketBy = cfg.rateLimit.bucketBy ?? "user+ip";
    const id = bucketBy === "ip" ? ip
      : bucketBy === "user" ? (userId ?? ip)
      : `${userId ?? "anon"}:${ip}`;
    const rl = await rateLimit(
      { route: cfg.rateLimit.key, limit: cfg.rateLimit.limit, windowMs: cfg.rateLimit.windowMs, failOpen: !!cfg.rateLimit.failOpen },
      id,
    );
    if (!rl.allowed) {
      await recordDeny({ userId, action: "rate_limit", reason: cfg.rateLimit.key, route, ip });
      return json({ error: "rate_limited", code: "RATE", retry_after_ms: rl.resetMs }, 429,
        { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) });
    }
  }

  // 6. Body size + parse + schema.
  const maxBytes = cfg.maxBodyBytes ?? 256 * 1024;
  let rawBody = "";
  let body: unknown = undefined;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const lenHeader = Number(req.headers.get("content-length") ?? 0);
    if (lenHeader > maxBytes) {
      await recordDeny({ userId, action: "payload_too_large", reason: String(lenHeader), route, ip });
      return json({ error: "payload_too_large", code: "SIZE" }, 413);
    }
    rawBody = await req.text();
    if (rawBody.length > maxBytes) {
      await recordDeny({ userId, action: "payload_too_large", reason: String(rawBody.length), route, ip });
      return json({ error: "payload_too_large", code: "SIZE" }, 413);
    }
    if (!cfg.rawBody && rawBody) {
      try { body = JSON.parse(rawBody); }
      catch {
        await recordDeny({ userId, action: "bad_json", reason: "parse", route, ip });
        return json({ error: "invalid_json", code: "PARSE" }, 400);
      }
    }
    if (cfg.schema && !cfg.rawBody) {
      // Strict-by-default: reject unknown fields → blocks mass-assignment.
      const schema = (cfg.schema as unknown as { strict?: () => ZodSchema }).strict
        ? (cfg.schema as unknown as { strict: () => ZodSchema }).strict()
        : cfg.schema;
      const parsed = (schema as ZodSchema).safeParse(body ?? {});
      if (!parsed.success) {
        await recordDeny({ userId, action: "validation", reason: "schema", route, ip,
          details: { issues: parsed.error.issues.slice(0, 8) } });
        return json({ error: "validation_failed", code: "SCHEMA",
          issues: parsed.error.flatten().fieldErrors }, 422);
      }
      body = parsed.data;
    }
  }

  // 7. Idempotency key required?
  const idemKey = req.headers.get("idempotency-key");
  if (cfg.idempotency?.required && !idemKey) {
    await recordDeny({ userId, action: "idempotency", reason: "missing_key", route, ip });
    return json({ error: "idempotency_key_required", code: "IDEM" }, 400);
  }

  const ctx: GuardCtx<TBody> = {
    req, userId, claims, roles,
    body: body as TBody, rawBody, idempotencyKey: idemKey, ip,
    db: admin(),
    audit: async (action, details = {}, targetId) => {
      try {
        await admin().from("audit_logs").insert({
          user_id: userId, action, target_type: "edge_function",
          target_id: targetId ?? route, details: { ip, ...details },
        });
      } catch (e) { log("warn", "audit_insert_failed", { error: String(e) }); }
    },
    withIdem: (fn) => withIdempotency(cfg.idempotency?.scope ?? "default", idemKey, fn, { userId }),
  };

  try {
    const res = await handler(ctx);
    // Inject defense-in-depth headers if handler returned a Response without them.
    const merged = new Headers(res.headers);
    for (const [k, v] of Object.entries({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    })) if (!merged.has(k)) merged.set(k, v);
    if (!merged.has("Access-Control-Allow-Origin")) merged.set("Access-Control-Allow-Origin", "*");
    return new Response(res.body, { status: res.status, headers: merged });
  } catch (e) {
    log("error", "handler_unhandled", { route, error: String(e) });
    // Never leak internals.
    return json({ error: "internal_error", code: "INTERNAL" }, 500);
  }
}

export { z };
export const guardJson = json;
