// Focused unit tests for scan-upload Phase A revision 2.
// Verifies terminal-persistence + audit contract of finalize() and classify().
//
// We do NOT boot Deno.serve here — the module executes it as a side-effect on
// import, so we import for its exports and let the runtime bind an ephemeral
// port. Tests only exercise pure helpers.

import { assertEquals, assertMatch, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classify, finalize, sniffAllowedImage, type PersistenceClient } from "./index.ts";

// Minimal in-memory audit collector matching GuardCtx.audit shape.
function makeCtx() {
  const audits: Array<{ action: string; details: Record<string, unknown> }> = [];
  const ctx = {
    audit: async (action: string, details: Record<string, unknown> = {}) => {
      audits.push({ action, details });
    },
  };
  // deno-lint-ignore no-explicit-any
  return { ctx: ctx as any, audits };
}

function okPersistence(): { client: PersistenceClient; rows: Record<string, unknown>[] } {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    client: {
      insert: async (row) => { rows.push(row); return { error: null }; },
    },
  };
}
function failingPersistence(msg = "duplicate key value"): PersistenceClient {
  return {
    insert: async () => ({ error: { message: msg, code: "23505" } }),
  };
}

Deno.test("classify: no stats → unknown", () => {
  const r = classify(undefined);
  assertEquals(r.verdict, "unknown");
});

Deno.test("classify: 2 malicious → malicious", () => {
  const r = classify({ malicious: 2, harmless: 50, suspicious: 0, undetected: 10, timeout: 0 });
  assertEquals(r.verdict, "malicious");
  assertEquals(r.engines_hit, 2);
});

Deno.test("classify: 0 malicious, 0 suspicious → clean", () => {
  const r = classify({ malicious: 0, harmless: 60, suspicious: 0, undetected: 5, timeout: 0 });
  assertEquals(r.verdict, "clean");
});

Deno.test("finalize (missing VT key path): persists unknown + emits scan_completed", async () => {
  const { ctx, audits } = makeCtx();
  const { client, rows } = okPersistence();

  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/x.png",
    uploaded_by: "user-1", sha256: "abc", size_bytes: 100,
    verdict: "unknown",
    details: { reason: "VIRUSTOTAL_API_KEY not configured" },
    extraResponse: { reason: "scanner not configured" },
    persistence: client,
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.verdict, "unknown");
  assertEquals(body.reason, "scanner not configured");
  assertEquals(rows.length, 1);
  assertEquals((rows[0] as { verdict: string }).verdict, "unknown");
  assertEquals(audits.length, 1);
  assertEquals(audits[0].action, "scan_completed");
});

Deno.test("finalize (clean): persists + emits scan_completed", async () => {
  const { ctx, audits } = makeCtx();
  const { client, rows } = okPersistence();
  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/y.png",
    uploaded_by: "user-1", sha256: "aaa", size_bytes: 10,
    verdict: "clean", engines_hit: 0, engines_total: 65,
    persistence: client,
  });
  assertEquals(res.status, 200);
  assertEquals(rows.length, 1);
  assertEquals(audits[0].action, "scan_completed");
});

Deno.test("finalize (malicious + removed=true): persists removal flag", async () => {
  const { ctx, audits } = makeCtx();
  const { client, rows } = okPersistence();
  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/z.exe",
    uploaded_by: "user-1", sha256: "bad", size_bytes: 1000,
    verdict: "malicious", engines_hit: 5, engines_total: 65,
    removed: true, persistence: client,
  });
  const body = await res.json();
  assertEquals(body.verdict, "malicious");
  assertEquals(body.removed, true);
  const details = (rows[0] as { details: { removed: boolean } }).details;
  assertEquals(details.removed, true);
  assertEquals(audits[0].action, "scan_completed");
  assertEquals(audits[0].details.removed, true);
});

Deno.test("finalize (insert failure): returns safe static error, emits scan_persist_failed, no raw DB message", async () => {
  const { ctx, audits } = makeCtx();
  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/x.png",
    uploaded_by: "user-1", sha256: "abc", size_bytes: 100,
    verdict: "unknown",
    persistence: failingPersistence("relation \"storage_scan_results\" does not exist"),
  });

  assertEquals(res.status, 500);
  const text = await res.text();
  // Safe static shape only.
  const body = JSON.parse(text);
  assertEquals(body.error, "persistence_failed");
  assertEquals(body.code, "PERSIST");
  // Raw DB error must NOT leak.
  assertEquals(text.includes("storage_scan_results"), false);
  assertEquals(text.includes("relation"), false);

  assertEquals(audits.length, 1);
  assertEquals(audits[0].action, "scan_persist_failed");
  assertEquals(audits[0].details.db_error_code, "23505");
});

Deno.test("finalize (error verdict, oversized file): 413 + persisted", async () => {
  const { ctx, audits } = makeCtx();
  const { client, rows } = okPersistence();
  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/big.bin",
    uploaded_by: "user-1", sha256: null, size_bytes: 40_000_000,
    verdict: "error",
    details: { reason: "file exceeds VT public tier 32MB limit" },
    httpStatus: 413,
    extraResponse: { reason: "file too large" },
    persistence: client,
  });
  assertEquals(res.status, 413);
  const body = await res.json();
  assertEquals(body.verdict, "error");
  assertStringIncludes(body.reason, "file too large");
  assertEquals(rows.length, 1);
  assertEquals(audits[0].action, "scan_completed");
});

// ---------- S6: magic-byte sniff ----------
Deno.test("sniffAllowedImage: JPEG signature accepted", () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assertEquals(sniffAllowedImage(bytes), "image/jpeg");
});
Deno.test("sniffAllowedImage: PNG signature accepted", () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  assertEquals(sniffAllowedImage(bytes), "image/png");
});
Deno.test("sniffAllowedImage: GIF signature accepted", () => {
  const gif87 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0]);
  const gif89 = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
  assertEquals(sniffAllowedImage(gif87), "image/gif");
  assertEquals(sniffAllowedImage(gif89), "image/gif");
});
Deno.test("sniffAllowedImage: WebP signature accepted", () => {
  const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assertEquals(sniffAllowedImage(bytes), "image/webp");
});
Deno.test("sniffAllowedImage: SVG text rejected (starts with '<')", () => {
  const svg = new TextEncoder().encode("<?xml version=\"1.0\"?><svg xmlns=");
  assertEquals(sniffAllowedImage(svg), null);
});
Deno.test("sniffAllowedImage: PE / executable rejected", () => {
  const mz = new Uint8Array([0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assertEquals(sniffAllowedImage(mz), null);
});
Deno.test("sniffAllowedImage: PDF rejected", () => {
  const pdf = new TextEncoder().encode("%PDF-1.4\n%...");
  assertEquals(sniffAllowedImage(pdf), null);
});
Deno.test("sniffAllowedImage: too-short buffer rejected", () => {
  assertEquals(sniffAllowedImage(new Uint8Array([0xff, 0xd8])), null);
});

// ---------- S3: suspicious verdict removal is now server-side ----------
Deno.test("finalize (suspicious + removed=true): persists removal flag on suspicious", async () => {
  const { ctx, audits } = makeCtx();
  const { client, rows } = okPersistence();
  const res = await finalize({
    ctx, bucket: "blog-images", object_path: "u/susp.png",
    uploaded_by: "user-1", sha256: "sus", size_bytes: 100,
    verdict: "suspicious", engines_hit: 2, engines_total: 65,
    removed: true, persistence: client,
  });
  const body = await res.json();
  assertEquals(body.verdict, "suspicious");
  assertEquals(body.removed, true);
  const details = (rows[0] as { details: { removed: boolean } }).details;
  assertEquals(details.removed, true);
  assertEquals(audits[0].details.removed, true);
});

// ---------- classify: 1 malicious → suspicious ----------
Deno.test("classify: 1 malicious → suspicious (borderline)", () => {
  const r = classify({ malicious: 1, harmless: 60, suspicious: 0, undetected: 5, timeout: 0 });
  assertEquals(r.verdict, "suspicious");
  assertEquals(r.engines_hit, 1);
});
Deno.test("classify: 2 suspicious → suspicious", () => {
  const r = classify({ malicious: 0, harmless: 60, suspicious: 2, undetected: 5, timeout: 0 });
  assertEquals(r.verdict, "suspicious");
  assertEquals(r.engines_hit, 2);
});
