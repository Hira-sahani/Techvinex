// VirusTotal-backed upload scanner (Phase A hardened).
//
// Flow: client uploads file to Supabase Storage, then calls this function with
// { bucket, object_path }. We verify the caller owns the object (or is admin),
// download it with the service role, hash it, look it up on VirusTotal, and if
// unknown submit it for analysis. Verdict is written to
// public.storage_scan_results; malicious files are deleted from storage.
// Suspicious/malicious verdicts trigger admin notifications via the DB trigger.
//
// All request handling (method, Origin, JWT, RBAC hint, rate limit, schema,
// body-size, secure headers, audit) goes through `_shared/guard.ts`.

import { createClient } from "npm:@supabase/supabase-js@2";
import { guard, guardJson, z } from "../_shared/guard.ts";
import { withSentry } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VT_KEY = Deno.env.get("VIRUSTOTAL_API_KEY") ?? "";
const VT_BASE = "https://www.virustotal.com/api/v3";
const MAX_BYTES = 32 * 1024 * 1024; // VT public tier upload cap

// Buckets scannable via this endpoint. Kept explicit to prevent scan-any-object
// abuse and to bound cost. Extend deliberately as new buckets appear.
const ALLOWED_BUCKETS = ["blog-images"] as const;

const BodySchema = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  object_path: z.string().min(1).max(1024),
});

type Verdict = "clean" | "suspicious" | "malicious" | "unknown" | "error";

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function classify(stats: Record<string, number> | undefined): {
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
  form.append("file", new Blob([bytes]), filename);
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

    // Ownership check — service-role read of storage.objects. Admins bypass.
    if (!isAdmin) {
      const { data: obj, error: objErr } = await ctx.db
        .schema("storage")
        .from("objects")
        .select("owner")
        .eq("bucket_id", bucket)
        .eq("name", object_path)
        .maybeSingle();
      if (objErr || !obj) {
        await ctx.audit("scan_deny_not_found", { bucket, object_path });
        return guardJson({ error: "not_found", code: "OBJECT" }, 404);
      }
      if (obj.owner !== uid) {
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
      await supabase.from("storage_scan_results").insert({
        bucket, object_path, uploaded_by: uid, sha256: null, size_bytes: file.size,
        verdict: "error", vendor: "virustotal",
        details: { reason: "file exceeds VT public tier 32MB limit" },
      });
      return guardJson({ verdict: "error", reason: "file too large" }, 413);
    }

    const buf = await file.arrayBuffer();
    const hash = await sha256(buf);

    if (!VT_KEY) {
      await supabase.from("storage_scan_results").insert({
        bucket, object_path, uploaded_by: uid, sha256: hash, size_bytes: file.size,
        verdict: "unknown", vendor: "virustotal",
        details: { reason: "VIRUSTOTAL_API_KEY not configured" },
      });
      return guardJson({ verdict: "unknown", reason: "scanner not configured" }, 200);
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

    // 4) Persist verdict (trigger notifies admins for malicious/suspicious)
    const { error: insErr } = await supabase.from("storage_scan_results").insert({
      bucket, object_path, uploaded_by: uid, sha256: hash, size_bytes: file.size,
      verdict, vendor: "virustotal",
      engines_hit, engines_total,
      vendor_scan_id: analysisId,
      details: { stats, removed },
    });
    if (insErr) {
      await ctx.audit("scan_insert_failed", { bucket, object_path });
    } else {
      await ctx.audit("scan_completed", { bucket, object_path, verdict, engines_hit, engines_total, removed });
    }

    return guardJson({ verdict, engines_hit, engines_total, sha256: hash, removed });
  })
));
