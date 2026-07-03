// VirusTotal-backed upload scanner.
// Flow: client uploads file to Supabase Storage, then calls this function with
// { bucket, object_path }. We download the object with the service role,
// hash it, look it up on VirusTotal, and if unknown submit it for analysis.
// Verdict is written to public.storage_scan_results; malicious files are
// deleted from storage. Suspicious/malicious verdicts trigger admin
// notifications via the DB trigger already in place.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VT_KEY = Deno.env.get("VIRUSTOTAL_API_KEY") ?? "";
const VT_BASE = "https://www.virustotal.com/api/v3";
const MAX_BYTES = 32 * 1024 * 1024; // VT public tier upload cap

type Verdict = "clean" | "suspicious" | "malicious" | "unknown" | "error";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`VT lookup ${res.status}`);
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
  if (!res.ok) throw new Error(`VT upload ${res.status}`);
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
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Auth: require a logged-in user. Owner-only or admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const uid = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const bucket = String(body.bucket ?? "").trim();
    const object_path = String(body.object_path ?? "").trim();
    const owner_id: string | null = body.owner_id ?? uid;
    if (!bucket || !object_path) return json({ error: "bucket and object_path required" }, 400);

    // Download the object
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(object_path);
    if (dlErr || !file) return json({ error: `download failed: ${dlErr?.message ?? "no file"}` }, 404);
    if (file.size > MAX_BYTES) {
      await supabase.from("storage_scan_results").insert({
        bucket, object_path, owner_id, sha256: null, size_bytes: file.size,
        verdict: "error", vendor: "virustotal",
        details: { reason: "file exceeds VT public tier 32MB limit" },
      });
      return json({ verdict: "error", reason: "file too large" }, 413);
    }

    const buf = await file.arrayBuffer();
    const hash = await sha256(buf);

    if (!VT_KEY) {
      await supabase.from("storage_scan_results").insert({
        bucket, object_path, owner_id, sha256: hash, size_bytes: file.size,
        verdict: "unknown", vendor: "virustotal",
        details: { reason: "VIRUSTOTAL_API_KEY not configured" },
      });
      return json({ verdict: "unknown", reason: "scanner not configured" }, 200);
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
      analysisId = await vtUpload(new Uint8Array(buf), object_path.split("/").pop() ?? "upload.bin");
      stats = await vtPollAnalysis(analysisId);
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
      bucket, object_path, owner_id, sha256: hash, size_bytes: file.size,
      verdict, vendor: "virustotal",
      engines_hit, engines_total,
      analysis_id: analysisId,
      details: { stats, removed },
    });
    if (insErr) console.error("scan insert failed", insErr);

    return json({ verdict, engines_hit, engines_total, sha256: hash, removed });
  } catch (e) {
    console.error("scan-upload error", e);
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
