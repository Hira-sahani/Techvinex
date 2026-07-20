#!/usr/bin/env node
/**
 * Rewrite every `npm:` string literal in a file to an `https://esm.sh/` URL,
 * and VENDOR the `@lovable.dev/mcp-js/stacks/supabase` bundle locally so we
 * do not depend on a runtime import-map redirect for the zod v4 barrel fix.
 *
 * Background — the two crashes this file exists to prevent
 * -----------------------------------------------------------------------------
 * 1. `supabase functions deploy` inlines `npm:` specifiers into the uploaded
 *    bundle. `@supabase/supabase-js` + mcp-js pushed us past the ~10 MB cap.
 *    Rewriting to `https://esm.sh/...` keeps deps out of the upload — Deno
 *    fetches them at runtime instead.
 *
 * 2. `esm.sh` serves `zod@4.4.3/denonext/v4.mjs` as a barrel that ONLY exports
 *    `{ default, z }`. The compiled `stacks/supabase.bundle.mjs` does
 *    `import * as c from ".../v4.mjs"` and calls `c.custom(...)`, `c.string(...)`,
 *    etc. — those symbols are missing, so the worker crashes at cold start
 *    with `TypeError: c.custom is not a function`.
 *
 * Previous fix (removed):
 *   Emit a `deno.json` import map that redirects the broken v4.mjs URL to a
 *   local shim. Works locally, but relies on Supabase Edge Runtime honouring
 *   the sibling `deno.json` for REMOTE URL specifiers — behaviour we could
 *   not observe from outside the host.
 *
 * Current fix (this file):
 *   Vendor the `stacks/supabase` bundle at build time. Patch the broken
 *   `.../v4.mjs` reference to `./zod-v4-shim.mjs` INSIDE the vendored bytes.
 *   Rewrite the `npm:` import in the generated function to point at the local
 *   file. No import map, no runtime redirect — Deno just loads a local module
 *   that references a local shim.
 *
 * Usage: node scripts/rewrite-npm-to-esm.mjs <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("usage: rewrite-npm-to-esm.mjs <file>");
  process.exit(2);
}

const src = readFileSync(file, "utf8");
const dir = dirname(file);

// Pin zod v4 — must match what esm.sh injects for mcp-js via `deps=zod@...`.
const ZOD_PIN = "4.4.3";

// Match "npm:..." / 'npm:...' string literals only. String literals cannot
// span lines in JS/TS module specifiers.
const LITERAL = /(["'])npm:([^"'\n\r]+)\1/g;

function splitNameAndSubpath(body) {
  let nameEnd;
  if (body.startsWith("@")) {
    const firstSlash = body.indexOf("/");
    if (firstSlash === -1) nameEnd = body.length;
    else {
      const second = body.indexOf("/", firstSlash + 1);
      nameEnd = second === -1 ? body.length : second;
    }
  } else {
    const firstSlash = body.indexOf("/");
    nameEnd = firstSlash === -1 ? body.length : firstSlash;
  }
  return { nameAndVersion: body.slice(0, nameEnd), subpath: body.slice(nameEnd) };
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  return await res.text();
}

/**
 * Vendor `@lovable.dev/mcp-js@<v>/stacks/supabase`:
 *   1. Fetch the esm.sh stub.
 *   2. Follow its `export *` re-export to the real `stacks/supabase.bundle.mjs`.
 *   3. Patch the four `/zod@X.Y.Z/denonext/...mjs` references in the bundle.
 *      Only `v4.mjs` is broken (barrel missing flat exports); the others
 *      re-export their externals correctly. We patch just v4 to keep the
 *      change surface minimal and leave the other three fetched from esm.sh
 *      normally — they load fine.
 *   4. Rewrite the STUB to `export *` from the vendored bundle path.
 *      Anyone who imports the vendored stub gets the fixed module graph.
 */
async function vendorStacksSupabase(nameAndVersion, targetDir) {
  // `bundle-deps` collapses the stub to a single `stacks/supabase.bundle.mjs`
  // re-export. Without it esm.sh emits ~10 chunk imports (`dist/cors-*.mjs`
  // etc.) — the same chunk-graph shape that caused "Module not found" errors
  // during earlier deploys. `deps=zod@<pin>` keeps the bundle on one zod copy.
  const stubUrl = `https://esm.sh/${nameAndVersion}/stacks/supabase?target=denonext&bundle-deps&deps=zod@${ZOD_PIN}`;
  const stubText = await fetchText(stubUrl);

  // Real bundle path lives inside the stub as `export * from "/@lovable.dev/..."`.
  const bundlePathMatch = stubText.match(/from\s*"(\/@lovable\.dev\/mcp-js@[^"]+\/stacks\/supabase\.bundle\.mjs)"/);
  if (!bundlePathMatch) {
    throw new Error(`Could not locate stacks/supabase.bundle.mjs path in esm.sh stub for ${nameAndVersion}`);
  }
  const bundleUrl = `https://esm.sh${bundlePathMatch[1]}`;
  let bundleText = await fetchText(bundleUrl);

  // Patch every zod reference in the vendored bundle. esm.sh emits them as
  // ORIGIN-RELATIVE URLs (`"/zod@4.4.3/denonext/v4.mjs"`) that are only
  // resolvable when the module itself is served from an https://esm.sh
  // origin. Now that we serve the bundle from a local file:// URL, Deno
  // resolves each `"/…"` against `file:///`, producing missing-module errors.
  // Two distinct patches:
  //   (a) v4.mjs → local shim, because esm.sh's v4 barrel is missing the flat
  //       exports mcp-js's `c.custom(...)` etc. need.
  //   (b) v3.mjs, v4-mini.mjs, zod.mjs → absolute https://esm.sh URLs. Those
  //       three subpath modules re-export their externals correctly, so no
  //       shim needed — just make the URL absolute.
  const V4_URL = /(?:https:\/\/esm\.sh)?\/zod@[0-9.]+\/denonext\/v4\.mjs/g;
  const v4Hits = (bundleText.match(V4_URL) || []).length;
  bundleText = bundleText.replace(V4_URL, "./zod-v4-shim.mjs");

  const OTHER_ZOD_URL = /(?<!https:)\/(zod@[0-9.]+\/denonext\/(?:v3|v4-mini|zod)\.mjs)/g;
  const otherHits = (bundleText.match(OTHER_ZOD_URL) || []).length;
  bundleText = bundleText.replace(OTHER_ZOD_URL, "https://esm.sh/$1");

  if (v4Hits === 0) {
    console.error("  ⚠ vendored stacks/supabase bundle contained no v4.mjs reference (esm.sh output changed?)");
  }

  // Guard: after both patches, no origin-relative `/zod@…` refs must remain.
  // esm.sh always emits these as string literals — a bad ref is a quote (or
  // whitespace) IMMEDIATELY before `/zod@`. A patched absolute ref is
  // preceded by a domain label like `esm.sh` so it won't match.
  const leftover = bundleText.match(/["'\s]\/zod@[0-9.]+\/[^"'\s]+/g);
  if (leftover && leftover.length) {
    throw new Error(
      `Vendored bundle still contains ${leftover.length} unresolved zod ref(s): ` +
        leftover.slice(0, 3).map((s) => s.slice(1)).join(", "),
    );
  }



  // Write vendored bundle + a local stub that re-exports from it. Both live
  // next to the function's index.ts so relative resolution just works.
  const bundleLocal = "mcp-js-stacks-supabase.bundle.mjs";
  const stubLocal = "mcp-js-stacks-supabase.mjs";
  writeFileSync(join(targetDir, bundleLocal), bundleText);
  writeFileSync(
    join(targetDir, stubLocal),
    `// AUTO-GENERATED by scripts/rewrite-npm-to-esm.mjs\n` +
      `export * from "./${bundleLocal}";\n`,
  );
  console.error(`  Vendored ${bundleLocal} (${bundleText.length} bytes, patched ${v4Hits} v4.mjs ref(s))`);
  console.error(`  Vendored ${stubLocal}`);
  return `./${stubLocal}`;
}

function rewriteSimple(cleaned, subpath) {
  // Non-vendored packages: point at esm.sh with the same params we've been
  // using. `target=denonext` gets Deno-optimized node:* polyfills (needed by
  // @supabase/supabase-js). `bundle-deps` + `deps=zod@<pin>` keep mcp-js on
  // one shared zod instance so schema identity checks work.
  const needsBundle =
    /^@lovable\.dev\/mcp-js(?:@|$)/.test(cleaned) ||
    /^@modelcontextprotocol\/sdk(?:@|$)/.test(cleaned);
  const params = needsBundle
    ? `target=denonext&bundle-deps&deps=zod@${ZOD_PIN}`
    : "target=denonext";
  const sep = subpath.includes("?") ? "&" : "?";
  return `https://esm.sh/${cleaned}${subpath}${sep}${params}`;
}

async function main() {
  // First pass: collect every unique literal and decide its replacement.
  const literals = new Map(); // full match → replacement string
  for (const m of src.matchAll(LITERAL)) {
    const [full, quote, body] = m;
    if (literals.has(full)) continue;

    const { nameAndVersion, subpath } = splitNameAndSubpath(body);
    let cleaned = nameAndVersion.replace(/@(?:\^|~|>=|<=|>|<|=)+/, "@");
    if (/^zod(?:@|$)/.test(cleaned)) cleaned = `zod@${ZOD_PIN}`;

    // The ONLY vendored specifier: the stacks/supabase subpath of mcp-js.
    // Its bundle contains the broken `c.custom` call; everything else in the
    // graph is safe to fetch from esm.sh at runtime.
    if (/^@lovable\.dev\/mcp-js(@|$)/.test(cleaned) && subpath === "/stacks/supabase") {
      const localPath = await vendorStacksSupabase(cleaned, dir);
      literals.set(full, `${quote}${localPath}${quote}`);
      continue;
    }

    literals.set(full, `${quote}${rewriteSimple(cleaned, subpath)}${quote}`);
  }

  let out = src;
  let count = 0;
  for (const [full, repl] of literals) {
    const parts = out.split(full);
    count += parts.length - 1;
    out = parts.join(repl);
  }

  writeFileSync(file, out);
  console.error(`  Rewrote ${count} npm: specifier occurrence(s) in ${file}`);

  // Shim: re-export the flat zod v4 API surface that `v4.mjs` fails to
  // expose. Both `classic/schemas.mjs` and `classic/external.mjs` are stable
  // subpath modules (not barrels) — they work as-is.
  writeFileSync(
    join(dir, "zod-v4-shim.mjs"),
    `// AUTO-GENERATED by scripts/rewrite-npm-to-esm.mjs\n` +
      `// Full zod v4 flat namespace — replaces the broken esm.sh v4.mjs barrel.\n` +
      `export * from "https://esm.sh/zod@${ZOD_PIN}/denonext/v4/classic/schemas.mjs";\n` +
      `export * from "https://esm.sh/zod@${ZOD_PIN}/denonext/v4/classic/external.mjs";\n`,
  );
  console.error(`  Wrote zod-v4-shim.mjs`);
  // NOTE: deno.json is intentionally NOT written. Runtime module resolution
  // is now purely a function of the emitted `import` statements and the
  // vendored files sitting next to them — no import-map indirection.
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
