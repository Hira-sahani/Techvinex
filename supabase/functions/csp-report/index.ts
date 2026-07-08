// Public CSP violation report receiver.
//
// Contract:
//  - Public endpoint (no auth) — browsers cannot attach a JWT to CSP reports.
//  - Accepts Content-Type: application/csp-report and application/reports+json.
//  - Body is size-capped and rate-limited per IP.
//  - We NEVER persist the raw report and never echo any of it back to the
//    caller. A minimal, sanitized digest is forwarded to Sentry as a warning
//    with tag { kind: "csp" }. Failures are swallowed — reporting is fire-and-
//    forget observability, never a request blocker.
//  - Response is always `204 No Content`; no leakage regardless of parse state.
//
// If Sentry is not configured this endpoint still returns 204 (fail-safe).

import { captureEdgeException } from "../_shared/sentry.ts";

const MAX_BYTES = 16 * 1024;
const RATE_LIMIT = 60;      // reports / window / IP
const RATE_WINDOW_MS = 60_000;

// In-process token bucket keyed by IP. Edge cold-starts reset it, which is
// fine — we only need to shed obviously abusive floods.
const buckets = new Map<string, { count: number; resetAt: number }>();

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

function pickIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") ?? "";
  const first = xf.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || "unknown";
}

function overLimit(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT;
}

interface Digest {
  directive?: string;
  blocked?: string;
  effective?: string;
  document?: string;
  status?: number;
  disposition?: string;
  ua?: string;
}

/** Return a compact, sanitized digest. Strips query strings & fragments. */
function digest(raw: unknown, ua: string): Digest | null {
  if (!raw || typeof raw !== "object") return null;
  // The "application/csp-report" body is { "csp-report": { ... } }.
  // The Reporting-API "application/reports+json" body is an array of reports.
  // We take the first entry's `body` if it's an array.
  let r: Record<string, unknown>;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (!first || typeof first !== "object") return null;
    r = (first as any).body ?? (first as any);
  } else {
    r = (raw as any)["csp-report"] ?? (raw as any);
  }
  const trim = (v: unknown, max = 512): string | undefined => {
    if (typeof v !== "string") return undefined;
    // Drop query + fragment before length cap to avoid leaking session data.
    const stripped = v.split("?")[0].split("#")[0];
    return stripped.slice(0, max);
  };
  const out: Digest = {
    directive: trim((r as any)["violated-directive"] ?? (r as any)["effectiveDirective"], 120),
    effective: trim((r as any)["effective-directive"] ?? (r as any)["effectiveDirective"], 120),
    blocked: trim((r as any)["blocked-uri"] ?? (r as any)["blockedURL"], 512),
    document: trim((r as any)["document-uri"] ?? (r as any)["documentURL"], 512),
    disposition: trim((r as any)["disposition"], 32),
    status: typeof (r as any)["status-code"] === "number" ? (r as any)["status-code"] : undefined,
    ua: trim(ua, 200),
  };
  // Drop empties.
  const hasAny = out.directive || out.blocked || out.document;
  return hasAny ? out : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const ip = pickIp(req);
  if (overLimit(ip)) {
    // Silently drop; still 204 so the browser doesn't retry-storm.
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const cl = Number(req.headers.get("content-length") ?? "0");
    if (cl > MAX_BYTES) {
      return new Response(null, { status: 204, headers: CORS });
    }
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return new Response(null, { status: 204, headers: CORS });
    }
    const text = new TextDecoder().decode(buf);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    const d = digest(parsed, req.headers.get("user-agent") ?? "");
    if (d) {
      // Fire-and-forget; never awaited failures block the response.
      captureEdgeException(new Error(`csp:${d.directive ?? "unknown"}`), {
        function_name: "csp-report",
        level: "warning",
        tags: { kind: "csp", directive: (d.directive ?? "unknown").slice(0, 64) },
        extra: d as unknown as Record<string, unknown>,
      }).catch(() => {});
    }
  } catch {
    // Never surface parsing / IO errors to the browser.
  }

  return new Response(null, { status: 204, headers: CORS });
});
