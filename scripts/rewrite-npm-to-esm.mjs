#!/usr/bin/env node
/**
 * Rewrite every `npm:` string literal in a file to an `https://esm.sh/` URL.
 *
 * Used by the Stage M (`mcp-only`) GitHub Actions workflow to shrink the
 * generated Supabase Edge Function bundle before deploy (see the workflow
 * comment for the 413 Request Entity Too Large context).
 *
 * The rewrite operates on the STRING LITERAL, not the surrounding syntax, so
 * it safely handles every import form emitted by any bundler:
 *   - `import x from "npm:pkg@1.0.0";`
 *   - `import { a as b } from "npm:pkg@1";`
 *   - multi-line `import { ... } from "npm:pkg@1";`
 *   - side-effect `import "npm:pkg@1";`
 *   - dynamic `await import("npm:pkg@1")`
 *   - subpath `"npm:@scope/pkg@1/sub/path"`
 *   - both `"` and `'` quoted literals
 *   - repeated identical specifiers across the file
 *
 * Semver-range prefixes on the version (^ ~ >= <= > < =) are stripped so
 * esm.sh receives a clean version identifier.
 *
 * Usage: node scripts/rewrite-npm-to-esm.mjs <file>
 * Exits non-zero if the file cannot be read/written. Does NOT fail if there
 * are no `npm:` specifiers — the workflow performs its own residual check.
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: rewrite-npm-to-esm.mjs <file>");
  process.exit(2);
}

const src = readFileSync(file, "utf8");

// Match a `"npm:..."` or `'npm:...'` string literal. Body cannot contain the
// matching quote or a newline — string literals in JS/TS module specifiers
// never span lines.
const LITERAL = /(["'])npm:([^"'\n\r]+)\1/g;

/**
 * Split "@scope/name@1.2.3/sub/path" or "name@1.2.3/sub" into
 *   { nameAndVersion: "@scope/name@1.2.3", subpath: "/sub/path" }
 * so the subpath survives rewriting untouched.
 */
function splitNameAndSubpath(body) {
  let nameEnd;
  if (body.startsWith("@")) {
    // Scoped: skip the "@scope/" segment, then the FIRST slash after that
    // is the subpath boundary.
    const firstSlash = body.indexOf("/");
    if (firstSlash === -1) {
      nameEnd = body.length;
    } else {
      const second = body.indexOf("/", firstSlash + 1);
      nameEnd = second === -1 ? body.length : second;
    }
  } else {
    const firstSlash = body.indexOf("/");
    nameEnd = firstSlash === -1 ? body.length : firstSlash;
  }
  return {
    nameAndVersion: body.slice(0, nameEnd),
    subpath: body.slice(nameEnd),
  };
}

// Pin zod to a v4 release. `@lovable.dev/mcp-js@0.22.2` bundles
// `@modelcontextprotocol/sdk@1.28.0`, which declares
// `"zod": "^3.25 || ^4.0"` and — when built for esm.sh — imports from
// the v4-only subpaths `zod/v3`, `zod/v4`, `zod/v4-mini`. Pinning to a
// zod v3 release (e.g. 3.23.8) makes esm.sh emit stubs that reference
// those subpaths against a version that does not publish them, and
// Deno's module graph fails with "Module not found: .../v3.mjs".
// Our tool files also declare `zod@^4.4.3`, so keeping the SDK and our
// tools on the same v4 line ensures both sides share one ZodType
// identity and mcp-js recognises our schemas without falling through
// to `z.custom(...)` (the source of the earlier "c.custom is not a
// function" crash).
const ZOD_PIN = "4.4.3";

let count = 0;
const out = src.replace(LITERAL, (_match, quote, body) => {
  const { nameAndVersion, subpath } = splitNameAndSubpath(body);
  // Strip semver operators immediately after the `@` version separator.
  let cleaned = nameAndVersion.replace(/@(?:\^|~|>=|<=|>|<|=)+/, "@");

  // Force every zod import (ours and any transitive) to the pinned v3.
  if (/^zod(?:@|$)/.test(cleaned)) {
    cleaned = `zod@${ZOD_PIN}`;
  }

  count++;
  // `target=denonext` → Deno-optimized build with node:* polyfills.
  // Without it, `@supabase/supabase-js` → node:stream crashes the worker
  // with WORKER_ERROR at startup before the auth middleware runs.
  //
  // For `@lovable.dev/mcp-js` and its embedded `@modelcontextprotocol/sdk`
  // we additionally use `bundle-deps`:
  //   1. Without bundling, esm.sh splits mcp-js into many internal chunk
  //      files (`.../es2022/cors-*.mjs` etc.) — Deno's module graph
  //      builder fails intermittently with "Module not found" on those
  //      chunk URLs during `supabase functions deploy`.
  //   2. `bundle-deps` returns ONE self-contained ES module with every
  //      dependency inlined at the requested versions — no chunk graph,
  //      no missing sub-paths.
  //   3. Combined with `deps=zod@<pin>`, esm.sh bundles the pinned zod v3
  //      copy into the module, so `z.custom(...)` resolves. Without the
  //      pin, mcp-js pulls a mismatched zod and crashes with
  //      "c.custom is not a function".
  //
  // The bundled artifact is served over HTTP at runtime, so it does NOT
  // count against the Supabase Edge Function upload size cap (only the
  // one-line import URL is in our bundle).
  const needsBundle =
    /^@lovable\.dev\/mcp-js(?:@|$)/.test(cleaned) ||
    /^@modelcontextprotocol\/sdk(?:@|$)/.test(cleaned);
  const params = needsBundle
    ? `target=denonext&bundle-deps&deps=zod@${ZOD_PIN}`
    : "target=denonext";
  const sep = subpath.includes("?") ? "&" : "?";
  return `${quote}https://esm.sh/${cleaned}${subpath}${sep}${params}${quote}`;
});

writeFileSync(file, out);
console.error(`  Rewrote ${count} npm: specifier(s) in ${file}`);
