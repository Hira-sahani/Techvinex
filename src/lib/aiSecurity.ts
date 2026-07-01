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
  reason?: "type" | "size" | "extension" | "empty" | "signature" | "executable" | "macro";
  detected?: string;
}

export function validateUploadedFile(file: File): FileValidationResult {
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "size" };
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) return { ok: false, reason: "type" };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const banned = new Set([
    "exe", "sh", "bat", "cmd", "js", "mjs", "cjs", "html", "htm", "svg", "jsp",
    "php", "py", "rb", "pl", "ps1", "vbs", "com", "dll", "jar", "war", "apk", "msi",
    "docm", "xlsm", "pptm",
  ]);
  if (banned.has(ext)) return { ok: false, reason: "extension" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Magic-byte / file-signature verification. The server re-runs this; the
// client pass exists to reject obviously-hostile uploads before they hit the
// network. Executable disguises, Office macros, and mismatched extensions
// are all rejected here.
// ---------------------------------------------------------------------------

type FileKind = "pdf" | "png" | "jpeg" | "gif" | "webp" | "docx" | "docm" | "xlsx" | "pptx" | "zip"
  | "mp3" | "wav" | "webm" | "text" | "exe" | "elf" | "macho" | "script" | "unknown";

function startsWith(buf: Uint8Array, sig: number[], offset = 0) {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false;
  return true;
}

export function detectFileKind(bytes: Uint8Array): FileKind {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8)) return "wav";
  if (startsWith(bytes, [0x49, 0x44, 0x33]) || startsWith(bytes, [0xff, 0xfb])) return "mp3";
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  if (startsWith(bytes, [0x4d, 0x5a])) return "exe";
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return "elf";
  if (startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) || startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce])) return "macho";
  if (startsWith(bytes, [0x23, 0x21])) return "script";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const tail = new TextDecoder("latin1").decode(bytes);
    if (/vbaProject\.bin/i.test(tail)) return "docm";
    if (/word\/document\.xml/i.test(tail)) return "docx";
    if (/xl\/workbook\.xml/i.test(tail)) return "xlsx";
    if (/ppt\/presentation\.xml/i.test(tail)) return "pptx";
    return "zip";
  }
  let printable = 0;
  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  for (const b of sample) if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) printable++;
  if (sample.length > 0 && printable / sample.length > 0.9) return "text";
  return "unknown";
}

/** Read the first 4 KB and verify the declared MIME/extension matches the magic bytes. */
export async function verifyFileSignature(file: File): Promise<FileValidationResult> {
  if (file.size === 0) return { ok: false, reason: "empty" };
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const kind = detectFileKind(head);
  if (kind === "exe" || kind === "elf" || kind === "macho" || kind === "script") {
    return { ok: false, reason: "executable", detected: kind };
  }
  if (kind === "docm") return { ok: false, reason: "macro", detected: kind };
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, FileKind[]> = {
    pdf: ["pdf"], png: ["png"], jpg: ["jpeg"], jpeg: ["jpeg"], gif: ["gif"], webp: ["webp"],
    mp3: ["mp3"], wav: ["wav"], webm: ["webm"], txt: ["text"], md: ["text"], csv: ["text"],
    docx: ["docx"], xlsx: ["xlsx"], pptx: ["pptx"],
  };
  const expected = extMap[ext];
  if (expected && !expected.includes(kind)) return { ok: false, reason: "signature", detected: kind };
  return { ok: true, detected: kind };
}

// ---------------------------------------------------------------------------
// Unicode normalization + homoglyph mapping — mirrors server logic so the
// client cannot smuggle homoglyph-encoded jailbreaks past a form validator.
// ---------------------------------------------------------------------------

const HOMOGLYPHS: Record<string, string> = {
  "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c",
  "\u0445": "x", "\u0455": "s", "\u0456": "i",
};
export function normalizeUnicode(input: string): string {
  let out = String(input ?? "").normalize("NFKC");
  out = out.replace(/[\u0080-\uFFFF]/g, (ch) => HOMOGLYPHS[ch] ?? ch);
  return out.replace(/[\u0300-\u036F\u200B-\u200D\uFEFF]/g, "");
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
  const t = normalizeUnicode(text);
  const findings: string[] = [];
  for (const re of JAILBREAK_PATTERNS) {
    if (re.test(t)) findings.push(re.source.slice(0, 40));
  }
  return { blocked: findings.length >= 2, findings };
}

// Approved-model allow-list mirror (server is source of truth).
export const APPROVED_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-pro",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "elevenlabs/tts",
] as const;
export function isApprovedModel(model: string): boolean {
  return (APPROVED_MODELS as readonly string[]).includes(model);
}

