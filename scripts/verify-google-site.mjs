#!/usr/bin/env node
/**
 * Google Search Console verification guard.
 *
 * 1. Asserts the verification file exists in the production build output (dist/)
 *    with the EXACT filename and EXACT content. Used as a CI deploy guard.
 * 2. If VERIFY_URL env is set (e.g. https://techvinex.com), fetches the live
 *    URL post-deploy and asserts 200 OK + matching body.
 *
 * Usage:
 *   node scripts/verify-google-site.mjs                 # build-output check only
 *   VERIFY_URL=https://techvinex.com node scripts/verify-google-site.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const FILE = "googlef122523e2b7d8b15.html";
const EXPECTED = "google-site-verification: googlef122523e2b7d8b15.html";

const errors = [];

// 1) Build output check (fails CI if file is missing from dist/)
const distPath = resolve(process.cwd(), "dist", FILE);
const publicPath = resolve(process.cwd(), "public", FILE);

if (!existsSync(publicPath)) {
  errors.push(`MISSING in /public: ${publicPath}`);
} else {
  const body = readFileSync(publicPath, "utf8").trim();
  if (body !== EXPECTED) {
    errors.push(`/public file content mismatch.\n  expected: ${EXPECTED}\n  got:      ${body}`);
  }
}

if (existsSync(resolve(process.cwd(), "dist"))) {
  if (!existsSync(distPath)) {
    errors.push(`MISSING in build output: ${distPath} (Vite did not copy /public/${FILE})`);
  } else {
    const body = readFileSync(distPath, "utf8").trim();
    if (body !== EXPECTED) {
      errors.push(`dist/${FILE} content mismatch.\n  expected: ${EXPECTED}\n  got:      ${body}`);
    }
  }
} else {
  console.log("dist/ not present — skipping build-output check (run `vite build` first).");
}

// 2) Optional live URL check
if (process.env.VERIFY_URL) {
  const url = `${process.env.VERIFY_URL.replace(/\/$/, "")}/${FILE}`;
  console.log(`Fetching ${url} ...`);
  try {
    const res = await fetch(url, { redirect: "manual" });
    if (res.status !== 200) {
      errors.push(`Live URL returned ${res.status} (expected 200). URL: ${url}`);
    } else {
      const body = (await res.text()).trim();
      if (body !== EXPECTED) {
        errors.push(`Live URL body mismatch at ${url}\n  expected: ${EXPECTED}\n  got:      ${body}`);
      } else {
        console.log(`OK: ${url} returned 200 with correct body.`);
      }
    }
  } catch (e) {
    errors.push(`Failed to fetch ${url}: ${e.message}`);
  }
}

if (errors.length) {
  console.error("\nGoogle verification check FAILED:\n");
  for (const e of errors) console.error("  - " + e);
  console.error(`
Troubleshooting:
  1. Ensure public/${FILE} exists with EXACT content:
       ${EXPECTED}
  2. Do NOT rename or wrap the file in HTML tags.
  3. Run \`vite build\` and confirm dist/${FILE} is present.
  4. On Vercel: confirm Build Output Directory = "dist".
  5. Ensure no rewrite/redirect intercepts /${FILE} (check vercel.json,
     middleware, or a SPA catch-all that returns index.html for unknown paths).
  6. After deploy, hard-reload the URL (CDN cache may serve stale 404).
  7. If using Cloudflare proxy, purge the cached path.
`);
  process.exit(1);
}

console.log("\nGoogle verification check PASSED.");
