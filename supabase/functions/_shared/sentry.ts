// Lightweight Sentry envelope reporter for Deno edge functions.
// Uses Sentry's HTTP "store" envelope endpoint directly to avoid pulling in
// a heavy SDK in Edge runtime. PII is scrubbed before sending.
//
// Usage:
//   import { withSentry } from "../_shared/sentry.ts";
//   Deno.serve(withSentry("admin-view-payout", (req) => guard(req, ...)));

import { RELEASE, ENVIRONMENT } from "./release.ts";

const DSN = Deno.env.get("SENTRY_DSN") ?? "";
// Environment + release prefer build-time generated values so every event —
// browser or edge — carries the SAME release tag. Env vars still override
// for hosted overrides (staging/canary).
const ENV = Deno.env.get("SENTRY_ENVIRONMENT") ?? ENVIRONMENT;
const REL = Deno.env.get("SENTRY_RELEASE") ?? RELEASE;

interface ParsedDsn { storeUrl: string; publicKey: string; }

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!projectId) return null;
    const storeUrl = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
    return { storeUrl, publicKey: u.username };
  } catch {
    return null;
  }
}

const parsed = DSN ? parseDsn(DSN) : null;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

function scrub(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(JWT_RE, "[jwt]").replace(EMAIL_RE, "[email]").replace(UUID_RE, "[uuid]");
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/authorization|cookie|apikey|token|password|secret|iban|account_number|sort_code|tax_signature|email|phone/i.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrub(v);
      }
    }
    return out;
  }
  return value;
}

interface CaptureOptions {
  function_name: string;
  request?: Request;
  level?: "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export async function captureEdgeException(err: unknown, opts: CaptureOptions): Promise<void> {
  if (!parsed) return;
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const event = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Date.now() / 1000,
      platform: "javascript",
      level: opts.level ?? "error",
      environment: ENVIRONMENT,
      release: RELEASE,
      server_name: opts.function_name,
      tags: { runtime: "deno-edge", function: opts.function_name, ...(opts.tags ?? {}) },
      exception: {
        values: [{
          type: e.name,
          value: scrub(e.message) as string,
          stacktrace: e.stack ? { frames: [] } : undefined,
        }],
      },
      extra: scrub({
        stack: e.stack,
        url: opts.request?.url,
        method: opts.request?.method,
        ...(opts.extra ?? {}),
      }) as Record<string, unknown>,
    };
    const envelope = [
      JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn: DSN }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(event),
    ].join("\n");

    await fetch(parsed.storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth":
          `Sentry sentry_version=7, sentry_client=techvinex-edge/1.0, sentry_key=${parsed.publicKey}`,
      },
      body: envelope,
    });
  } catch {
    // Reporting failures must never break the request.
  }
}

/**
 * Wraps a Deno.serve handler. Catches uncaught throws and forwards a
 * scrubbed exception to Sentry, then re-throws the original error so the
 * runtime returns its standard 500 response.
 */
export function withSentry(
  functionName: string,
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req) => {
    try {
      const res = await handler(req);
      if (res.status >= 500) {
        await captureEdgeException(new Error(`http_${res.status}`), {
          function_name: functionName,
          request: req,
          level: "error",
          tags: { status: String(res.status) },
        });
      }
      return res;
    } catch (err) {
      await captureEdgeException(err, { function_name: functionName, request: req });
      throw err;
    }
  };
}
