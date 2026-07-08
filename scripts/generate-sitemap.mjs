#!/usr/bin/env node
// Build-time sitemap generator.
//
// Fetches the full URL set (static routes + published blogs + active jobs)
// from the `public-sitemap` edge function and writes it to
// `public/sitemap.xml` so Google discovers everything from
// https://www.techvinex.com/sitemap.xml only — never from the Supabase URL.
//
// Runs via the `prebuild` npm hook. Falls back to a static-only sitemap if
// the edge function is unreachable so the build never breaks.

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const OUT = resolve("public/sitemap.xml");
const EDGE_URL =
  "https://xfgyzcvrvgsntjenxecp.supabase.co/functions/v1/public-sitemap";
const BASE = "https://www.techvinex.com";

const STATIC_FALLBACK = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${BASE}/explore</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${BASE}/opportunities</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${BASE}/blog</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${BASE}/about</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>${BASE}/privacy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${BASE}/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>${BASE}/cookie-policy</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>`;

async function fetchDynamic() {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(EDGE_URL, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!xml.includes("<urlset")) throw new Error("invalid sitemap payload");
    return xml;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  let xml;
  try {
    xml = await fetchDynamic();
    const count = (xml.match(/<url>/g) || []).length;
    console.log(`sitemap.xml written from edge (${count} entries)`);
  } catch (err) {
    xml = STATIC_FALLBACK;
    console.warn(
      `sitemap.xml fallback used — edge fetch failed: ${err?.message ?? err}`
    );
  }
  writeFileSync(OUT, xml);
}

main().catch((err) => {
  console.error("generate-sitemap failed:", err);
  writeFileSync(OUT, STATIC_FALLBACK);
  process.exit(0);
});
