// Sentry browser SDK bootstrap.
// DSN is fetched from a public edge function so we don't depend on a
// VITE_-prefixed env var. The DSN is public by design (Sentry's threat
// model relies on inbound filters + rate limits, not DSN secrecy).
//
// PII scrubbing happens in beforeSend / beforeBreadcrumb — see scrubEvent().
import * as Sentry from "@sentry/react";
import { addTelemetrySink, type UnauthorizedEvent } from "@/lib/apiClient";
import { supabase } from "@/integrations/supabase/client";
import { RELEASE, ENVIRONMENT } from "@/generated/release";

let initialized = false;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

// --- PII scrubbing helpers --------------------------------------------------

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const SENSITIVE_PATH_RE = /\/(auth|payout|payout_accounts|secrets|admin-view-payout|admin-secrets)(\b|\/)/i;
const SENSITIVE_KEY_RE = /(authorization|cookie|apikey|api_key|token|password|secret|iban|account_number|sort_code|tax_signature|email|phone|ssn)/i;

function scrubString(value: string): string {
  return value
    .replace(JWT_RE, "[jwt]")
    .replace(EMAIL_RE, "[email]")
    .replace(UUID_RE, "[uuid]");
}

function scrubObject<T>(obj: T, depth = 0): T {
  if (depth > 4 || obj == null) return obj;
  if (typeof obj === "string") return scrubString(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1)) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[redacted]";
      } else if (typeof v === "string") {
        out[k] = scrubString(v);
      } else if (typeof v === "object" && v !== null) {
        out[k] = scrubObject(v, depth + 1);
      } else {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }
  return obj;
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  // Drop request bodies for sensitive endpoints entirely.
  if (event.request?.url && SENSITIVE_PATH_RE.test(event.request.url)) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        for (const k of Object.keys(event.request.headers)) {
          if (SENSITIVE_KEY_RE.test(k)) event.request.headers[k] = "[redacted]";
        }
      }
    }
  }
  // Strip user PII; keep only the id (a UUID — not sensitive on its own here
  // because it's already required to correlate to a Supabase auth user).
  if (event.user) {
    event.user = { id: event.user.id };
  }
  // Scrub message / breadcrumbs / extra.
  if (event.message) event.message = scrubString(event.message);
  if (event.extra) event.extra = scrubObject(event.extra);
  if (event.contexts) event.contexts = scrubObject(event.contexts);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? scrubString(b.message) : b.message,
      data: b.data ? scrubObject(b.data) : b.data,
    }));
  }
  return event;
}

// --- Init -------------------------------------------------------------------

async function fetchConfig(): Promise<{ dsn: string; environment: string; release: string } | null> {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-sentry-config`, {
      method: "GET",
      headers: {
        apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "",
      },
    });
    if (!res.ok) return null;
    const cfg = (await res.json()) as { dsn?: string };
    if (!cfg.dsn) return null;
    // Release + environment come from the build-time generated module so
    // frontend and edge functions stay in lockstep on the same release tag.
    return { dsn: cfg.dsn, environment: ENVIRONMENT, release: RELEASE };
  } catch {
    return null;
  }
}

/** Idempotent. Safe to call multiple times. */
export async function initSentry(): Promise<void> {
  if (initialized) return;
  if (import.meta.env.DEV) return; // no Sentry chatter during local dev
  const cfg = await fetchConfig();
  if (!cfg) return;

  Sentry.init({
    dsn: cfg.dsn,
    environment: cfg.environment,
    release: cfg.release,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0, // only capture replays for sessions with errors
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb(crumb) {
      if (crumb.category === "fetch" || crumb.category === "xhr") {
        if (crumb.data?.url && SENSITIVE_PATH_RE.test(String(crumb.data.url))) {
          if (crumb.data) delete (crumb.data as Record<string, unknown>).request_body;
        }
      }
      if (crumb.message) crumb.message = scrubString(crumb.message);
      return crumb;
    },
  });

  initialized = true;

  // Set user scope from current Supabase session (id only — no email).
  supabase.auth.getSession().then(({ data }) => {
    Sentry.setUser(data.session?.user?.id ? { id: data.session.user.id } : null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    Sentry.setUser(session?.user?.id ? { id: session.user.id } : null);
  });

  // Forward 401 telemetry from apiClient into Sentry as breadcrumbs +
  // capture a warning when the refresh path failed (session lost).
  addTelemetrySink((event: UnauthorizedEvent) => {
    Sentry.addBreadcrumb({
      category: "auth.unauthorized",
      level: event.reason === "refresh_failed" ? "warning" : "info",
      message: `401 ${event.method} ${scrubString(event.endpoint)}`,
      data: {
        reason: event.reason,
        retryAttempted: event.retryAttempted,
        hadSession: event.hadSession,
        requestId: event.requestId,
      },
    });
    if (event.reason === "refresh_failed" || event.reason === "replay_still_401") {
      Sentry.captureMessage(`auth.${event.reason}`, "warning");
    }
  });

  // Unhandled promise rejections (Sentry catches these by default, but we
  // also tag them so alerts can route differently).
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (ev) => {
      Sentry.captureException(ev.reason, {
        tags: { source: "unhandledrejection" },
      });
    });
  }
}

export { Sentry };
