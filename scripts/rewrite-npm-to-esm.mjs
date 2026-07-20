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

let count = 0;
const out = src.replace(LITERAL, (_match, quote, body) => {
  const { nameAndVersion, subpath } = splitNameAndSubpath(body);
  // Strip semver operators immediately after the `@` version separator.
  const cleaned = nameAndVersion.replace(/@(?:\^|~|>=|<=|>|<|=)+/, "@");
  count++;
  // Append `?target=denonext` so esm.sh serves Deno-optimized builds with
  // proper node:* polyfills. Without this, packages that import node builtins
  // (e.g. `@supabase/supabase-js` → node:stream) crash the edge worker at
  // startup with WORKER_ERROR before auth middleware runs.
  // Preserve any existing subpath but insert the query before it if the
  // subpath already contains a `?` (unlikely for npm specifiers).
  const sep = subpath.includes("?") ? "&" : "?";
  return `${quote}https://esm.sh/${cleaned}${subpath}${sep}target=denonext${quote}`;
});

writeFileSync(file, out);
console.error(`  Rewrote ${count} npm: specifier(s) in ${file}`);
