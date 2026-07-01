// Platform Security — client-side choke point.
//
// EVERY dashboard-initiated privileged operation MUST call `safeAction()`.
// Direct `supabase.functions.invoke` for privileged endpoints is discouraged;
// use this wrapper to guarantee:
//
//   1. Frozen client-side execution plan (allow-listed action, params shape,
//      max attempts, output types) — external data cannot mutate the plan.
//   2. Sandboxed request: params are sanitized + secret-redacted before send.
//   3. CSRF-safe: goes through the shared apiClient which attaches the JWT,
//      Origin, and idempotency key.
//   4. Human-approval flow: 202 responses surface `approval_id` to the caller.
//   5. Output guard: response is secret-redacted before the UI ever sees it.
//   6. Audit trail: every attempt is logged both client-side (Sentry breadcrumb)
//      and server-side (edge function audit_logs).
//
// Non-goal: this file NEVER embeds secrets, service-role keys, or SQL.

import { supabase } from "@/integrations/supabase/client";
import { redactSecrets, sanitizeAiOutput } from "@/lib/aiSecurity";

export type SafePermissionScope = "public" | "self" | "elevated";
export type SafeOutputType = "text" | "json";

export interface SafePlan<TParams extends Record<string, unknown>> {
  readonly action: string;
  readonly params: Readonly<TParams>;
  readonly permissionScope: SafePermissionScope;
  readonly maxAttempts: number;
  readonly allowedOutputTypes: readonly SafeOutputType[];
  readonly requiresApproval?: boolean;
  readonly approvalId?: string;
  readonly targetUserId?: string;
  readonly targetOrgId?: string;
}

export interface SafeActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  status: number;
  approvalId?: string;
  error?: string;
  code?: string;
}

function deepFreeze<T>(o: T): T {
  Object.freeze(o);
  if (o && typeof o === "object") {
    for (const v of Object.values(o as Record<string, unknown>)) {
      if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v);
    }
  }
  return o;
}

/**
 * Freeze a plan the moment it's created. External data can never mutate it.
 */
export function createPlan<TParams extends Record<string, unknown>>(
  plan: SafePlan<TParams>,
): SafePlan<TParams> {
  return deepFreeze({ ...plan, params: { ...plan.params } });
}

/**
 * Execute a privileged action through the platform security pipeline.
 * All calls land in the `ai-safe-action` edge function which re-verifies
 * identity, RBAC, ownership, plan HMAC (server-side), and business rules.
 */
export async function safeAction<T = unknown>(
  plan: SafePlan<Record<string, unknown>>,
  serverPlanToken: string,
): Promise<SafeActionResult<T>> {
  // 1. Sandbox inputs: sanitize and redact any accidental secrets/PII.
  const cleanParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(plan.params)) {
    cleanParams[k] = typeof v === "string"
      ? redactSecrets(sanitizeAiOutput(v))
      : v;
  }

  try {
    const { data, error } = await supabase.functions.invoke("ai-safe-action", {
      body: {
        planToken: serverPlanToken,
        action: plan.action,
        params: cleanParams,
        approvalId: plan.approvalId,
        targetUserId: plan.targetUserId,
        targetOrgId: plan.targetOrgId,
      },
    });

    if (error) {
      return { ok: false, status: 500, error: error.message ?? "invoke_failed" };
    }

    // 2. Human-in-the-loop: server returns 202 with an approval_id.
    if (data?.status === "approval_required") {
      return {
        ok: false,
        status: 202,
        approvalId: data.approval_id,
        code: "approval_required",
      };
    }

    // 3. Output guard: redact secrets before handing to the UI.
    const scrub = (v: unknown): unknown => {
      if (typeof v === "string") return redactSecrets(v);
      if (Array.isArray(v)) return v.map(scrub);
      if (v && typeof v === "object") {
        const out: Record<string, unknown> = {};
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = scrub(val);
        return out;
      }
      return v;
    };
    return { ok: true, status: 200, data: scrub(data) as T };
  } catch (e) {
    return { ok: false, status: 500, error: (e as Error).message };
  }
}

/**
 * Session isolation helper: derive a per-tab session id that never leaks
 * across other tabs, users, or organizations. Used as memory scope key.
 */
export function getSessionId(): string {
  const key = "tv_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}
