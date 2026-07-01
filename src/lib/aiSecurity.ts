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

// ---------------------------------------------------------------------------
// HTML / Markdown protection — used for AI-generated content, blog authoring,
// and any rich text that will hit the DOM.
// ---------------------------------------------------------------------------

const UNSAFE_HTML_PATTERNS: RegExp[] = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /\son\w+\s*=\s*"[^"]*"/gi, // inline event handlers "onclick=..."
  /\son\w+\s*=\s*'[^']*'/gi,
  /\son\w+\s*=\s*[^\s>]+/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

export function sanitizeHtml(html: string): string {
  let out = String(html ?? "");
  for (const re of UNSAFE_HTML_PATTERNS) out = out.replace(re, "");
  return redactSecrets(out);
}

/** Strip HTML tags entirely — safest option for AI output rendered as text. */
export function stripHtml(html: string): string {
  return String(html ?? "").replace(/<[^>]*>/g, "");
}

export function sanitizeMarkdown(md: string): string {
  let out = String(md ?? "");
  // Block raw HTML islands, javascript: links, and image URLs.
  out = sanitizeHtml(out);
  out = out.replace(/\]\(\s*javascript:[^)]*\)/gi, "](#)");
  out = out.replace(/\]\(\s*data:text\/html[^)]*\)/gi, "](#)");
  return out;
}

// ---------------------------------------------------------------------------
// File upload validation — MIME allow-list + size cap. Server-side must
// re-validate; this exists to reject obviously unsafe files before upload.
// ---------------------------------------------------------------------------

export const ALLOWED_UPLOAD_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "text/markdown", "text/csv",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/wav", "audio/webm",
]);

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface FileValidationResult {
  ok: boolean;
  reason?: "type" | "size" | "extension" | "empty";
}

export function validateUploadedFile(file: File): FileValidationResult {
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "size" };
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) return { ok: false, reason: "type" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const banned = new Set([
    "exe", "sh", "bat", "cmd", "js", "mjs", "cjs", "html", "htm", "svg", "jsp",
    "php", "py", "rb", "pl", "ps1", "vbs", "com", "dll", "jar", "war", "apk", "msi",
  ]);
  if (banned.has(ext)) return { ok: false, reason: "extension" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Jailbreak detection — client-side prefilter. Server re-runs the same check.
// ---------------------------------------------------------------------------

const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+(the\s+)?(above|previous)/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+(an?\s+)?(admin|root|system|dan|developer)/gi,
  /reveal\s+(the\s+)?(system\s+)?prompt/gi,
  /print\s+(the\s+)?(env|environment|secrets?|api[_ ]?keys?)/gi,
  /developer\s+mode|jailbreak|prompt\s+leak/gi,
  /<\|(im_start|im_end|endoftext)\|>/gi,
];

export function detectJailbreak(text: string): { blocked: boolean; findings: string[] } {
  const t = String(text ?? "");
  const findings: string[] = [];
  for (const re of JAILBREAK_PATTERNS) {
    if (re.test(t)) findings.push(re.source.slice(0, 40));
  }
  return { blocked: findings.length >= 2, findings };
}

