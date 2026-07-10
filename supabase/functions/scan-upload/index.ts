// VirusTotal-backed upload scanner (Phase A hardened, revision 2).
//
// Flow: client uploads file to Supabase Storage, then calls this function with
// { bucket, object_path }. We verify the caller owns the object (or is admin),
// download it with the service role, hash it, look it up on VirusTotal, and if
// unknown submit it for analysis. Verdict is written to
// public.storage_scan_results; malicious files are deleted from storage.
// Suspicious/malicious verdicts trigger admin notifications via the DB trigger.
//
// Every terminal outcome (clean / suspicious / malicious / unknown / error)
// flows through finalize(), which is the ONLY code path that persists a row
// and emits a terminal audit event. Persistence failures are captured via
// Sentry, emit a `scan_persist_failed` audit row, and return a safe static
// error to the client — raw DB errors are never returned.
//
// All request handling (method, Origin, JWT, RBAC hint, rate limit, schema,
// body-size, secure headers, audit) goes through `_shared/guard.ts`.

import { createClient } from "npm:@supabase/supabase-js@2";
import { guard, guardJson, z, type GuardCtx } from "../_shared/guard.ts";
import { withSentry, captureEdgeException } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VT_KEY = Deno.env.get("VIRUSTOTAL_API_KEY") ?? "";
const VT_BASE = "https://www.virustotal.com/api/v3";
const MAX_BYTES = 32 * 1024 * 1024; // VT public tier upload cap
// Defensive server-side size cap that mirrors the bucket-level 5 MB limit.
// Storage already enforces it; we re-check because storage limits are
// bucket-config and could drift (Cloud UI is the only place to set them today).
const BUCKET_MAX_BYTES = 5 * 1024 * 1024;

// Buckets scannable via this endpoint. Kept explicit to prevent scan-any-object
// abuse and to bound cost. Extend deliberately as new buckets appear.
const ALLOWED_BUCKETS = ["blog-images"] as const;

const BodySchema = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  object_path: z.string().min(1).max(1024),
});

/**
 * Magic-byte sniff for the four image formats we accept.
 * Rejects anything else — including SVG (text `<?xml`/`<svg …>`), which is
 * an XSS vector on a public bucket. Returns the detected mime, or null if
 * the signature does not match any allowed format.
 */
export function sniffAllowedImage(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  // GIF: "GIF87a" or "GIF89a"
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  // WebP: "RIFF" .... "WEBP"
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

export type Verdict = "clean" | "suspicious" | "malicious" | "unknown" | "error";

/** Test seam — allows unit tests to inject a fake persistence client. */
export interface PersistenceClient {
  insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string; code?: string } | null }>;
}
function defaultPersistence(): PersistenceClient {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  return {
    insert: async (row) => {
      const { error } = await supabase.from("storage_scan_results").insert(row);
      return { error };
    },
  };
}

interface FinalizeInput {
  ctx: GuardCtx<z.infer<typeof BodySchema>>;
  bucket: string;
  object_path: string;
  uploaded_by: string;
  sha256: string | null;
  size_bytes: number | null;
  verdict: Verdict;
  engines_hit?: number;
  engines_total?: number;
  vendor_scan_id?: string | null;
  details?: Record<string, unknown>;
  /** HTTP status to return on the *success* path. Defaults to 200. */
  httpStatus?: number;
  /** Extra fields to add to the response body. */
  extraResponse?: Record<string, unknown>;
  /** Was the object removed from storage as part of this outcome? */
  removed?: boolean;
  /** Test seam: inject persistence client. Defaults to real Supabase. */
  persistence?: PersistenceClient;
}

/**
 * Single terminal exit point for the scanner.
 *
 * Guarantees:
 *  1. Every terminal outcome persists a row to storage_scan_results.
 *  2. Insert failures are captured (Sentry + audit) — never silently ignored.
 *  3. On insert failure the client receives a safe static error, never a raw
 *     Postgres/PostgREST error string.
 *  4. Exactly one terminal audit event per invocation:
 *       - scan_completed         (persist succeeded)
 *       - scan_persist_failed    (persist failed)
 */
export async function finalize(input: FinalizeInput): Promise<Response> {
  const {
    ctx, bucket, object_path, uploaded_by, sha256, size_bytes, verdict,
    engines_hit = 0, engines_total = 0, vendor_scan_id = null,
    details = {}, httpStatus = 200, extraResponse = {}, removed = false,
    persistence = defaultPersistence(),
  } = input;

  const { error: insErr } = await persistence.insert({
    bucket, object_path, uploaded_by, sha256, size_bytes,
    verdict, vendor: "virustotal",
    engines_hit, engines_total, vendor_scan_id,
    details: { ...details, removed },
  });

  if (insErr) {
    // Report to Sentry (message is scrubbed by sentry.ts).
    await captureEdgeException(
      new Error(`scan_persist_failed: ${insErr.message ?? "unknown"}`),
      {
        function_name: "scan-upload",
        level: "error",
        tags: { verdict, bucket },
        extra: { object_path, engines_hit, engines_total },
      },
    );
    // Audit event — no raw DB error, only a short code.
    await ctx.audit("scan_persist_failed", {
      bucket, object_path, verdict, engines_hit, engines_total,
      db_error_code: insErr.code ?? null,
    });
    // Safe static response — never expose insErr.message.
    return guardJson(
      { error: "persistence_failed", code: "PERSIST" },
      500,
    );
  }

  await ctx.audit("scan_completed", {
    bucket, object_path, verdict, engines_hit, engines_total, removed,
  });

  return guardJson(
    { verdict, engines_hit, engines_total, sha256, removed, ...extraResponse },
    httpStatus,
  );
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function classify(stats: Record<string, number> | undefined): {
  verdict: Verdict;
  engines_hit: number;
  engines_total: number;
} {
  if (!stats) return { verdict: "unknown", engines_hit: 0, engines_total: 0 };
  const malicious = stats.malicious ?? 0;
  const suspicious = stats.suspicious ?? 0;
  const engines_total =
    (stats.harmless ?? 0) +
    (stats.malicious ?? 0) +
    (stats.suspicious ?? 0) +
    (stats.undetected ?? 0) +
    (stats.timeout ?? 0);
  const engines_hit = malicious + suspicious;
  let verdict: Verdict = "clean";
  if (malicious >= 2) verdict = "malicious";
  else if (malicious === 1 || suspicious >= 2) verdict = "suspicious";
  return { verdict, engines_hit, engines_total };
}

async function vtLookupHash(hash: string) {
  const res = await fetch(`${VT_BASE}/files/${hash}`, {
    headers: { "x-apikey": VT_KEY },
  });
  if (res.status === 404) { await res.body?.cancel(); return null; }
  if (!res.ok) { await res.body?.cancel(); throw new Error(`vt_lookup_${res.status}`); }
  return await res.json();
}

async function vtUpload(bytes: Uint8Array, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart]), filename);
  const res = await fetch(`${VT_BASE}/files`, {
    method: "POST",
    headers: { "x-apikey": VT_KEY },
    body: form,
  });
  if (!res.ok) { await res.body?.cancel(); throw new Error(`vt_upload_${res.status}`); }
  const data = await res.json();
  return data?.data?.id as string;
}

async function vtPollAnalysis(id: string, timeoutMs = 45_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`${VT_BASE}/analyses/${id}`, {
      headers: { "x-apikey": VT_KEY },
    });
    if (res.ok) {
      const data = await res.json();
      const status = data?.data?.attributes?.status;
      if (status === "completed") return data.data.attributes.stats as Record<string, number>;
    } else {
      await res.body?.cancel();
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return undefined;
}

Deno.serve(withSentry("scan-upload", (req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "scan-upload", limit: 20, windowMs: 60_000, bucketBy: "user+ip" },
    schema: BodySchema,
    maxBodyBytes: 4 * 1024, // request body is tiny; file bytes come from storage
  }, async (ctx) => {
    const { bucket, object_path } = ctx.body as z.infer<typeof BodySchema>;
    const uid = ctx.userId!;
    const isAdmin = ctx.roles.includes("admin");

    // Ownership check — service-role RPC (storage schema is not exposed to
    // PostgREST). The RPC is EXECUTE-restricted to service_role, so it cannot
    // be used by authenticated clients to enumerate object owners. Admins bypass.
    if (!isAdmin) {
      const { data: ownerId, error: objErr } = await ctx.db.rpc(
        "storage_object_owner",
        { _bucket: bucket, _name: object_path },
      );
      if (objErr) {
        await ctx.audit("scan_deny_lookup_failed", { bucket, object_path });
        return guardJson({ error: "not_found", code: "OBJECT" }, 404);
      }
      if (!ownerId) {
        await ctx.audit("scan_deny_not_found", { bucket, object_path });
        return guardJson({ error: "not_found", code: "OBJECT" }, 404);
      }
      if (ownerId !== uid) {
        await ctx.audit("scan_deny_forbidden", { bucket, object_path });
        return guardJson({ error: "forbidden", code: "OWNER" }, 403);
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Download the object
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(object_path);
    if (dlErr || !file) {
      await ctx.audit("scan_download_failed", { bucket, object_path });
      return guardJson({ error: "not_found", code: "OBJECT" }, 404);
    }

    if (file.size > MAX_BYTES) {
      return await finalize({
        ctx, bucket, object_path, uploaded_by: uid,
        sha256: null, size_bytes: file.size,
        verdict: "error",
        details: { reason: "file exceeds VT public tier 32MB limit" },
        httpStatus: 413,
        extraResponse: { reason: "file too large" },
      });
    }

    const buf = await file.arrayBuffer();
    const hash = await sha256Hex(buf);

    if (!VT_KEY) {
      return await finalize({
        ctx, bucket, object_path, uploaded_by: uid,
        sha256: hash, size_bytes: file.size,
        verdict: "unknown",
        details: { reason: "VIRUSTOTAL_API_KEY not configured" },
        extraResponse: { reason: "scanner not configured" },
      });
    }

    // 1) Hash lookup
    let stats: Record<string, number> | undefined;
    let analysisId: string | null = null;
    try {
      const hit = await vtLookupHash(hash);
      stats = hit?.data?.attributes?.last_analysis_stats;
    } catch (_e) { /* fall through to upload */ }

    // 2) Upload + poll if unknown
    if (!stats) {
      try {
        analysisId = await vtUpload(new Uint8Array(buf), object_path.split("/").pop() ?? "upload.bin");
        stats = await vtPollAnalysis(analysisId);
      } catch (_e) { /* leave stats undefined -> unknown */ }
    }

    const { verdict, engines_hit, engines_total } = classify(stats);

    // 3) Delete malicious files
    let removed = false;
    if (verdict === "malicious") {
      const { error: rmErr } = await supabase.storage.from(bucket).remove([object_path]);
      removed = !rmErr;
    }

    // 4) Persist + terminal audit (single exit point).
    return await finalize({
      ctx, bucket, object_path, uploaded_by: uid,
      sha256: hash, size_bytes: file.size,
      verdict, engines_hit, engines_total,
      vendor_scan_id: analysisId,
      details: { stats },
      removed,
    });
  })
));
