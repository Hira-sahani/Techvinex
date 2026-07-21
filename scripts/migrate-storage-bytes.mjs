#!/usr/bin/env node
// Copies every object in every bucket from the SOURCE Supabase project's
// storage to the TARGET project's storage, using service_role keys.
//
// Buckets are created on the target if missing (public flag copied from source).
// Existing objects on the target are skipped (idempotent).
//
// Required env:
//   SUPABASE_URL_SOURCE
//   SUPABASE_SERVICE_ROLE_KEY_SOURCE
//   SUPABASE_URL_TARGET
//   SUPABASE_SERVICE_ROLE_KEY_TARGET

import { createClient } from "@supabase/supabase-js";

// Node 20 has no global WebSocket. @supabase/supabase-js pulls in @supabase/realtime-js
// on client construction, which throws on Node <21 without a WebSocket polyfill.
// We don't use realtime here, but we still need a valid constructor to avoid the crash.
// Polyfill from `ws` when the global is missing (Node 20). No-op on Node 22+.
if (typeof globalThis.WebSocket === "undefined") {
  try {
    const { WebSocket } = await import("ws");
    globalThis.WebSocket = WebSocket;
    console.log("Polyfilled global WebSocket from 'ws' (Node <21 compatibility).");
  } catch (e) {
    console.warn("No global WebSocket and 'ws' not installed; realtime disabled only.");
  }
}

const need = (k) => {
  const v = process.env[k];
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
  return v;
};

const src = createClient(need("SUPABASE_URL_SOURCE"), need("SUPABASE_SERVICE_ROLE_KEY_SOURCE"), {
  auth: { persistSession: false },
});
const tgt = createClient(need("SUPABASE_URL_TARGET"), need("SUPABASE_SERVICE_ROLE_KEY_TARGET"), {
  auth: { persistSession: false },
});

async function listAll(client, bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const it of data) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) {
        // Folder — recurse.
        out.push(...(await listAll(client, bucket, path)));
      } else {
        out.push({ path, size: it.metadata?.size ?? 0, mime: it.metadata?.mimetype });
      }
    }
    if (data.length < limit) break;
    offset += data.length;
  }
  return out;
}

const { data: buckets, error: bErr } = await src.storage.listBuckets();
if (bErr) { console.error("listBuckets:", bErr.message); process.exit(1); }
console.log(`Source has ${buckets.length} bucket(s):`, buckets.map((b) => b.name).join(", "));

let totalCopied = 0, totalSkipped = 0, totalFailed = 0, totalBytes = 0;

for (const b of buckets) {
  console.log(`\n== bucket: ${b.name} (public=${b.public})`);

  // Ensure target bucket exists.
  const { data: existing } = await tgt.storage.getBucket(b.name);
  if (!existing) {
    const { error: cErr } = await tgt.storage.createBucket(b.name, {
      public: b.public, fileSizeLimit: b.file_size_limit, allowedMimeTypes: b.allowed_mime_types,
    });
    if (cErr) { console.error(`  createBucket failed: ${cErr.message}`); continue; }
    console.log(`  created target bucket`);
  }

  const objects = await listAll(src, b.name);
  console.log(`  ${objects.length} object(s) in source`);

  for (const obj of objects) {
    // Skip if already present on target.
    const { data: head } = await tgt.storage.from(b.name).list(
      obj.path.includes("/") ? obj.path.slice(0, obj.path.lastIndexOf("/")) : "",
      { search: obj.path.split("/").pop(), limit: 1 },
    );
    if (head?.length) { totalSkipped++; continue; }

    const { data: blob, error: dErr } = await src.storage.from(b.name).download(obj.path);
    if (dErr) { console.error(`  download ${obj.path}: ${dErr.message}`); totalFailed++; continue; }

    const buf = Buffer.from(await blob.arrayBuffer());
    const { error: uErr } = await tgt.storage.from(b.name).upload(obj.path, buf, {
      contentType: obj.mime || blob.type || "application/octet-stream",
      upsert: false,
    });
    if (uErr) { console.error(`  upload ${obj.path}: ${uErr.message}`); totalFailed++; continue; }
    totalCopied++;
    totalBytes += buf.length;
    if (totalCopied % 25 === 0) console.log(`  progress: ${totalCopied} copied`);
  }
}

console.log(`\n== Storage migration complete`);
console.log(`   copied:  ${totalCopied}`);
console.log(`   skipped: ${totalSkipped}`);
console.log(`   failed:  ${totalFailed}`);
console.log(`   bytes:   ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
if (totalFailed > 0) process.exit(1);
