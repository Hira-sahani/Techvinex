#!/usr/bin/env node
/**
 * Full-vendor the MCP function's remote module graph.
 *
 * Runs AFTER scripts/rewrite-npm-to-esm.mjs. Uses `deno info --json` to
 * enumerate every https:// module reachable from index.ts, copies each into
 * supabase/functions/mcp/vendor/, and rewrites every remote URL occurrence
 * across ALL files (index.ts + adjacent .mjs + vendored files) to relative
 * `./vendor/...` paths.
 *
 * Result: no https:// specifier remains anywhere in the function folder.
 * Deno resolves the whole graph from local files only — no runtime fetch,
 * no import map, no esm.sh dependency at cold start.
 *
 * Usage: node scripts/vendor-mcp-graph.mjs <function-dir>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const fnDir = resolve(process.argv[2] || "supabase/functions/mcp");
const vendorDir = join(fnDir, "vendor");
const entry = join(fnDir, "index.ts");

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
}

/** URL → path segment usable on disk. Preserves uniqueness for query strings. */
function urlToVendorSubpath(u) {
  const url = new URL(u);
  let p = url.hostname + url.pathname;
  if (url.search) {
    // esm.sh uses query params for build variants — encode them into the path
    // so different variants of the same URL land in distinct files.
    p += "__" + url.search.slice(1).replace(/[^\w.@=+-]/g, "_");
  }
  // Only recognise real JS/TS module extensions. Version numbers like
  // "zod@4.4.3" end with ".3" which naive `\.[a-z0-9]+$` treats as an
  // extension and leaves the file without a loader-recognised suffix —
  // Deno then errors "Expected a JavaScript or TypeScript module, but
  // identified a Unknown module." Force `.mjs` on anything that doesn't
  // already end in a real module extension.
  if (!/\.(mjs|cjs|js|mts|cts|ts|json)$/.test(p)) p += ".mjs";
  return p;
}

function ensureDir(f) {
  mkdirSync(dirname(f), { recursive: true });
}

// 1. Enumerate the graph.
console.error(`[vendor] deno info --json ${entry}`);
const graphJson = sh("deno", ["info", "--json", entry], { cwd: fnDir });
const graph = JSON.parse(graphJson);
const modules = graph.modules || [];
const remote = modules.filter((m) => (m.specifier || "").startsWith("http"));
console.error(`[vendor] modules total=${modules.length} remote=${remote.length}`);

// 2. Build URL → local vendor path map and copy bytes.
const urlToLocal = new Map();
mkdirSync(vendorDir, { recursive: true });
let bytes = 0;
let skippedTypes = 0;
for (const m of remote) {
  const spec = m.specifier;
  // Skip .d.ts type-only modules — Deno's runtime graph doesn't execute them.
  // (They appear because `deno info` walks type imports too.)
  if (spec.endsWith(".d.ts") || spec.endsWith(".d.mts")) {
    skippedTypes++;
    continue;
  }
  const sub = urlToVendorSubpath(spec);
  const local = join(vendorDir, sub);
  urlToLocal.set(spec, local);
  if (m.local && existsSync(m.local)) {
    ensureDir(local);
    // Copy, then strip Deno's `// denoCacheMetadata=...` trailing comment.
    // It's a cache-manifest line Deno writes into the on-disk copy; the
    // module content itself doesn't need it, and it contains the original
    // https:// URL as a string which trips our post-vendor guard grep.
    let text = readFileSync(m.local, "utf8");
    text = text.replace(/\n\/\/ denoCacheMetadata=\{[^\n]*\}\s*$/g, "\n");
    writeFileSync(local, text);
    bytes += statSync(local).size;
  } else if (m.error) {
    console.error(`[vendor] WARN unresolved: ${spec} — ${m.error}`);
  } else {
    console.error(`[vendor] WARN no local cache path for: ${spec}`);
  }
}
console.error(`[vendor] copied ${urlToLocal.size} files, ${bytes} bytes; skipped ${skippedTypes} .d.ts`);

// 3. Build a per-module dependency map: moduleUrl → [{rawSpec, resolvedUrl}].
// This lets us translate the raw import string that actually appears inside a
// vendored file (e.g. `"/@supabase/phoenix@^0.4.0?target=denonext"` — with a
// caret semver range) to its resolved URL (e.g. `.../@supabase/phoenix@0.4.5...`).
// Just rewriting the resolved URL string won't work: the file contains the
// UNRESOLVED specifier that Deno translated at graph-walk time.
const modDeps = new Map(); // absolute module URL/path → [{rawSpec, resolvedUrl}]
for (const m of modules) {
  const deps = (m.dependencies || [])
    .map((d) => ({
      rawSpec: d.specifier,
      resolvedUrl: d.code?.specifier || d.type?.specifier || null,
    }))
    .filter((d) => d.resolvedUrl && urlToLocal.has(d.resolvedUrl));
  if (deps.length) modDeps.set(m.specifier, deps);
}

// Longest-first for the plain-URL replacement pass, to avoid `https://esm.sh/x`
// clobbering `https://esm.sh/x@1`.
const orderedUrls = [...urlToLocal.keys()].sort((a, b) => b.length - a.length);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteFile(filePath, moduleUrl) {
  if (!existsSync(filePath)) return 0;
  const before = readFileSync(filePath, "utf8");
  let after = before;
  let hits = 0;

  // (a) Absolute-URL rewrites — how our own generated .mjs/index.ts reference
  // remote modules before vendoring.
  for (const url of orderedUrls) {
    if (!after.includes(url)) continue;
    const targetAbs = urlToLocal.get(url);
    let rel = relative(dirname(filePath), targetAbs).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    const parts = after.split(url);
    hits += parts.length - 1;
    after = parts.join(rel);
  }

  // (b) Per-file raw-specifier rewrites — the specifier strings esm.sh emits
  // inside its own bundles (bare, origin-relative, and semver-ranged). We use
  // the deno info dependency graph: for this module, replace each raw
  // specifier verbatim with the relative path to its resolved vendored file.
  const deps = modDeps.get(moduleUrl) || [];
  for (const { rawSpec, resolvedUrl } of deps) {
    const targetAbs = urlToLocal.get(resolvedUrl);
    if (!targetAbs) continue;
    let rel = relative(dirname(filePath), targetAbs).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    // Match rawSpec only inside string literals (bounded by the same quote).
    const re = new RegExp(`(["'])${escapeRe(rawSpec)}\\1`, "g");
    after = after.replace(re, (_m, q) => {
      hits++;
      return q + rel + q;
    });
  }

  if (after !== before) writeFileSync(filePath, after);
  return hits;
}

// 4. Walk every file in fnDir and rewrite. For vendored files we know their
// module URL (reverse of urlToLocal); local files use the file:// URL that
// deno info reported.
const localToUrl = new Map();
for (const [url, localPath] of urlToLocal) localToUrl.set(localPath, url);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|mts|mjs|js|cjs|json)$/.test(name)) out.push(p);
  }
  return out;
}
const files = walk(fnDir);
let totalHits = 0;
for (const f of files) {
  const moduleUrl = localToUrl.get(f) || ("file://" + f);
  totalHits += rewriteFile(f, moduleUrl);
}
console.error(`[vendor] rewrote ${totalHits} URL occurrences across ${files.length} files`);

// 5. Verify no https:// module specifier remains reachable. `deno info --json`
// re-run should show ZERO remote modules.
console.error(`[vendor] verifying — deno info --json on rewritten entry`);
const verifyJson = sh("deno", ["info", "--json", entry], { cwd: fnDir });
const verify = JSON.parse(verifyJson);
const remoteAfter = (verify.modules || []).filter((m) => (m.specifier || "").startsWith("http"));
if (remoteAfter.length > 0) {
  console.error(`[vendor] FAIL: ${remoteAfter.length} remote modules still reachable:`);
  for (const m of remoteAfter.slice(0, 10)) console.error(`  ${m.specifier}`);
  process.exit(1);
}
console.error(`[vendor] OK: 0 remote modules reachable. total local modules=${verify.modules.length}`);
