// Client-side AI security guardrails.
//
// This file is a thin mirror of `supabase/functions/_shared/ai-security.ts`
// used to redact secrets and strip injection payloads from anything an AI
// job produces BEFORE it hits the DOM. The server is the source of truth;
// this exists purely as defense-in-depth so a compromised model response
// cannot leak secrets or execute markup client-side.

const SECRET_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /xoxb-[A-Za-z0-9-]{10,}/g,
  /AIza[0-9A-Za-z-_]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /service_role[^\s"]*/gi,
  /Bearer\s+[A-Za-z0-9._~+/=-]{16,}/g,
  /postgres(?:ql)?:\/\/[^\s"]+/gi,
  /https?:\/\/[a-z0-9-]+\.supabase\.co[^\s"]*/gi,
];

export function redactSecrets(text: string): string {
  let out = String(text ?? "");
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED_SECRET]");
  return out;
}

const TOOL_CALL_PATTERNS = [
  /```tool[_-]?call[\s\S]*?```/gi,
  /<\s*tool(_call)?\s*>[\s\S]*?<\s*\/\s*tool(_call)?\s*>/gi,
];

export function stripToolCalls(text: string): string {
  let out = String(text ?? "");
  for (const re of TOOL_CALL_PATTERNS) out = out.replace(re, "");
  return out;
}

const MAX_RENDER_BYTES = 128 * 1024;

export function sanitizeAiOutput(text: string): string {
  const stripped = stripToolCalls(String(text ?? ""));
  const redacted = redactSecrets(stripped);
  return redacted.length > MAX_RENDER_BYTES ? redacted.slice(0, MAX_RENDER_BYTES) + "\n[truncated]" : redacted;
}

export function sanitizeAiJson<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") return sanitizeAiOutput(value) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeAiJson) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeAiJson(v);
    return out as unknown as T;
  }
  return value;
}
