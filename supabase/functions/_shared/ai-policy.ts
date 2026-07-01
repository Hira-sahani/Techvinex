// Enterprise AI Policy Engine
// Central authorization + policy layer that every AI tool call MUST traverse.
// Combines: Context Firewall, Data Classification, Policy Evaluation,
// Human-in-the-Loop approval, and Tenant/Session Memory Isolation.

import { admin, log } from "./abuse-prevention.ts";
import {
  auditSecurity,
  redactDeep,
  redactSecrets,
  type PlanEnforcer,
} from "./ai-security.ts";

// ---------------------------------------------------------------------------
// 1. Data Classification
// ---------------------------------------------------------------------------

export type Classification = "public" | "internal" | "confidential" | "secret";

const CLASSIFICATION_RANK: Record<Classification, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
};

// Field-level classification map. Anything not listed defaults to "internal".
// "secret" fields are NEVER passed to the model.
const FIELD_CLASSIFICATION: Record<string, Classification> = {
  // secret
  password: "secret", password_hash: "secret", api_key: "secret",
  secret: "secret", access_token: "secret", refresh_token: "secret",
  service_role_key: "secret", stripe_secret: "secret", jwt: "secret",
  bank_account: "secret", iban: "secret", ssn: "secret", tax_id: "secret",
  // confidential
  email: "confidential", phone: "confidential", address: "confidential",
  date_of_birth: "confidential", salary: "confidential",
  compensation: "confidential", internal_notes: "confidential",
  employer_billing: "confidential", payout_account: "confidential",
  // internal
  user_id: "internal", org_id: "internal", employer_id: "internal",
  status: "internal", role: "internal",
  // public
  title: "public", description: "public", category: "public",
  company: "public", location: "public", created_at: "public",
};

function classifyKey(key: string): Classification {
  const k = key.toLowerCase();
  if (FIELD_CLASSIFICATION[k]) return FIELD_CLASSIFICATION[k];
  for (const [needle, cls] of Object.entries(FIELD_CLASSIFICATION)) {
    if (k.includes(needle)) return cls;
  }
  return "internal";
}

export interface ClassificationResult<T> {
  value: T;
  maxClassification: Classification;
  redactedKeys: string[];
}

/**
 * Walk an object and produce a copy where any field above `maxAllowed`
 * is replaced with a redaction marker. Also returns the highest
 * classification observed anywhere in the tree.
 */
export function classifyAndFilter<T>(
  input: T,
  maxAllowed: Classification = "confidential",
): ClassificationResult<T> {
  const redactedKeys: string[] = [];
  let seen: Classification = "public";
  const walk = (v: unknown, path = ""): unknown => {
    if (v == null) return v;
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const cls = classifyKey(k);
        if (CLASSIFICATION_RANK[cls] > CLASSIFICATION_RANK[seen]) seen = cls;
        if (CLASSIFICATION_RANK[cls] > CLASSIFICATION_RANK[maxAllowed]) {
          redactedKeys.push(`${path}.${k}`);
          out[k] = `[REDACTED:${cls}]`;
          continue;
        }
        out[k] = walk(val, `${path}.${k}`);
      }
      return out;
    }
    if (typeof v === "string") return redactSecrets(v);
    return v;
  };
  return { value: walk(input) as T, maxClassification: seen, redactedKeys };
}

// ---------------------------------------------------------------------------
// 2. Context Firewall
// ---------------------------------------------------------------------------

export interface ContextFirewallOptions {
  /** Only these top-level fields survive the firewall. */
  allowFields: readonly string[];
  /** Max classification allowed through. Anything above is redacted. */
  maxClassification?: Classification;
  /** Hard byte budget for the resulting JSON payload. */
  maxBytes?: number;
}

/**
 * Minimize the context that any model or tool ever sees. This is the ONLY
 * approved way to shape data before it is embedded into a prompt.
 */
export function contextFirewall<T extends Record<string, unknown>>(
  input: T,
  opts: ContextFirewallOptions,
): { safe: Record<string, unknown>; dropped: string[]; classification: Classification } {
  const dropped: string[] = [];
  const projected: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (!opts.allowFields.includes(k)) { dropped.push(k); continue; }
    projected[k] = v;
  }
  const classified = classifyAndFilter(projected, opts.maxClassification ?? "internal");
  let json = JSON.stringify(classified.value);
  const budget = opts.maxBytes ?? 8_000;
  if (json.length > budget) json = json.slice(0, budget) + '..."[TRUNCATED]"';
  return {
    safe: JSON.parse(json.endsWith('"[TRUNCATED]"') ? JSON.stringify(classified.value).slice(0, budget) : JSON.stringify(classified.value)),
    dropped,
    classification: classified.maxClassification,
  };
}

// ---------------------------------------------------------------------------
// 3. Central Policy Engine
// ---------------------------------------------------------------------------

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface PolicyContext {
  userId: string | null;
  orgId?: string | null;
  ip?: string | null;
  isAdmin?: boolean;
  planHash?: string | null;
  planScope?: "public" | "self" | "elevated";
  targetUserId?: string | null;
  targetOrgId?: string | null;
}

export interface PolicyDecision {
  allow: boolean;
  requiresApproval: boolean;
  risk: RiskLevel;
  reason: string;
  code?: string;
}

/**
 * Action → risk + approval requirement. High/critical always require human
 * approval (see section 4).
 */
const ACTION_POLICY: Record<string, { risk: RiskLevel; requiresApproval: boolean; adminOnly?: boolean }> = {
  fetch_public_job:              { risk: "low",      requiresApproval: false },
  fetch_benchmark_task_public:   { risk: "low",      requiresApproval: false },
  record_interview_turn:         { risk: "low",      requiresApproval: false },
  flag_content_for_review:       { risk: "medium",   requiresApproval: false },
  // High-risk / privileged surface (must be routed through approval flow)
  delete_user_data:              { risk: "critical", requiresApproval: true,  adminOnly: true },
  initiate_payment:              { risk: "critical", requiresApproval: true },
  issue_payout:                  { risk: "critical", requiresApproval: true,  adminOnly: true },
  grant_admin_role:              { risk: "critical", requiresApproval: true,  adminOnly: true },
  verify_employer:               { risk: "high",     requiresApproval: true,  adminOnly: true },
  bulk_message_users:            { risk: "high",     requiresApproval: true,  adminOnly: true },
  bulk_email_send:               { risk: "high",     requiresApproval: true,  adminOnly: true },
  modify_billing:                { risk: "high",     requiresApproval: true },
  publish_job_posting:           { risk: "medium",   requiresApproval: false },
};

export function getActionPolicy(action: string) {
  return ACTION_POLICY[action] ?? { risk: "medium" as RiskLevel, requiresApproval: true };
}

/**
 * Central authorization gate. Returns a decision. Callers MUST honor it.
 * Decisions are always audited by the caller via `auditSecurity`.
 */
export function evaluatePolicy(
  action: string,
  ctx: PolicyContext,
  enforcer: PlanEnforcer,
): PolicyDecision {
  const policy = getActionPolicy(action);

  // Plan allow-list already checked upstream, but re-assert here.
  if (!(enforcer.plan.allowedTools as readonly string[]).includes(action) &&
      // system/high-risk actions are dispatched only via approval workflow
      !policy.requiresApproval) {
    return { allow: false, requiresApproval: false, risk: policy.risk,
             reason: "tool not in execution plan", code: "not_in_plan" };
  }

  // Identity check.
  if (!ctx.userId && enforcer.plan.permissionScope !== "public") {
    return { allow: false, requiresApproval: false, risk: policy.risk,
             reason: "authenticated identity required", code: "unauth" };
  }

  // Admin-gated actions.
  if (policy.adminOnly && !ctx.isAdmin) {
    return { allow: false, requiresApproval: false, risk: policy.risk,
             reason: "admin role required", code: "admin_only" };
  }

  // Cross-tenant ownership guard.
  if (ctx.targetUserId && ctx.userId && ctx.targetUserId !== ctx.userId && !ctx.isAdmin) {
    return { allow: false, requiresApproval: false, risk: policy.risk,
             reason: "cross-user access blocked", code: "cross_tenant" };
  }
  if (ctx.targetOrgId && ctx.orgId && ctx.targetOrgId !== ctx.orgId && !ctx.isAdmin) {
    return { allow: false, requiresApproval: false, risk: policy.risk,
             reason: "cross-org access blocked", code: "cross_org" };
  }

  return { allow: true, requiresApproval: policy.requiresApproval,
           risk: policy.risk, reason: "policy_ok" };
}

// ---------------------------------------------------------------------------
// 4. Mandatory Human Approval
// ---------------------------------------------------------------------------

export interface ApprovalRequest {
  userId: string | null;
  orgId?: string | null;
  action: string;
  risk: RiskLevel;
  reason: string;
  params: Record<string, unknown>;
  planHash?: string | null;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed";

/**
 * File an approval request. Returns the request id. Caller MUST NOT execute
 * the underlying action until `status === "approved"`.
 */
export async function requestHumanApproval(req: ApprovalRequest): Promise<{ id: string; status: ApprovalStatus }> {
  const filtered = classifyAndFilter(req.params, "confidential");
  const { data, error } = await admin()
    .from("ai_approval_requests")
    .insert({
      user_id: req.userId,
      org_id: req.orgId ?? null,
      action: req.action,
      risk: req.risk,
      reason: req.reason,
      params: filtered.value,
      plan_hash: req.planHash ?? null,
      status: "pending",
    })
    .select("id,status")
    .single();
  if (error) {
    log("error", "approval_insert_failed", { error: String(error.message) });
    throw new Error("approval_insert_failed");
  }
  await auditSecurity({
    userId: req.userId, kind: "approval", event: "requested",
    severity: req.risk === "critical" ? "critical" : "high",
    planHash: req.planHash ?? null,
    details: { action: req.action, risk: req.risk, request_id: data.id },
  });
  return { id: data.id, status: data.status as ApprovalStatus };
}

export async function checkApprovalStatus(id: string): Promise<ApprovalStatus> {
  const { data } = await admin()
    .from("ai_approval_requests")
    .select("status,expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return "expired";
  if (data.status === "pending" && new Date(data.expires_at).getTime() < Date.now()) return "expired";
  return data.status as ApprovalStatus;
}

// ---------------------------------------------------------------------------
// 5. Memory Isolation
// ---------------------------------------------------------------------------

export interface MemoryScope {
  userId: string;
  sessionId: string;
  orgId?: string | null;
}

export interface MemoryEntry {
  content: Record<string, unknown>;
  classification?: Classification;
  scope?: "session" | "user";
}

/**
 * Write a memory entry. Session id is REQUIRED. Cross-session and cross-org
 * bleed is impossible: reads are keyed by (user_id, session_id) AND RLS
 * scopes to auth.uid(). Secret data is refused at the SQL layer as well.
 */
export async function writeMemory(scope: MemoryScope, entry: MemoryEntry): Promise<void> {
  const cls = entry.classification ?? "internal";
  if (cls === "secret") {
    await auditSecurity({
      userId: scope.userId, kind: "memory", event: "secret_write_blocked", severity: "high",
      details: { session_id: scope.sessionId },
    });
    throw new Error("secret_memory_not_allowed");
  }
  const safe = classifyAndFilter(entry.content, "confidential");
  await admin().from("ai_session_memory").insert({
    session_id: scope.sessionId,
    user_id: scope.userId,
    org_id: scope.orgId ?? null,
    scope: entry.scope ?? "session",
    classification: cls,
    content: safe.value,
  });
}

/**
 * Read memory strictly scoped to (user, session). No cross-session or
 * cross-tenant reads are possible: we filter by both keys and rely on RLS.
 */
export async function readMemory(
  scope: MemoryScope,
  limit = 20,
): Promise<Array<{ id: string; content: Record<string, unknown>; classification: Classification; created_at: string }>> {
  const { data, error } = await admin()
    .from("ai_session_memory")
    .select("id,content,classification,created_at,user_id,session_id,org_id,expires_at")
    .eq("user_id", scope.userId)
    .eq("session_id", scope.sessionId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 50));
  if (error) return [];
  const now = Date.now();
  return (data ?? [])
    // defense-in-depth: enforce tenant equality even if RLS is bypassed
    .filter((r) => r.user_id === scope.userId && r.session_id === scope.sessionId)
    .filter((r) => !r.org_id || !scope.orgId || r.org_id === scope.orgId)
    .filter((r) => new Date(r.expires_at).getTime() > now)
    .map((r) => ({
      id: r.id,
      content: redactDeep(r.content) as Record<string, unknown>,
      classification: r.classification as Classification,
      created_at: r.created_at,
    }));
}

export async function purgeSessionMemory(scope: MemoryScope): Promise<void> {
  await admin().from("ai_session_memory")
    .delete()
    .eq("user_id", scope.userId)
    .eq("session_id", scope.sessionId);
}
