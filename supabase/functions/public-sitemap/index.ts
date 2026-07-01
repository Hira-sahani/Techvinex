// Dynamic sitemap generator. Returns a full XML sitemap covering:
//  - static public routes
//  - all published blog posts (/blog/:slug)
//  - all active public explore jobs (/opportunities/:slug and /jobs/:slug)
//
// Cached at the edge for 10 minutes so search-engine crawls do not hit the DB.
// JWT verification is disabled via config.toml (public endpoint).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://www.techvinex.com";

const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/explore", priority: "0.9", changefreq: "daily" },
  { path: "/opportunities", priority: "0.9", changefreq: "daily" },
  { path: "/blog", priority: "0.9", changefreq: "daily" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookie-policy", priority: "0.3", changefreq: "yearly" },
];

function escape(url: string) {
  return url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlEntry(loc: string, lastmod?: string, changefreq = "weekly", priority = "0.6") {
  return [
    "  <url>",
    `    <loc>${escape(loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].filter(Boolean).join("\n");
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: blogs }, { data: jobs }] = await Promise.all([
    supabase
      .from("blogs")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("explore_jobs")
      .select("slug, updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5000),
  ]);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  for (const r of STATIC_ROUTES) {
    parts.push(urlEntry(`${BASE}${r.path}`, undefined, r.changefreq, r.priority));
  }

  for (const b of blogs ?? []) {
    if (!b?.slug) continue;
    parts.push(urlEntry(`${BASE}/blog/${b.slug}`, b.updated_at ?? undefined, "weekly", "0.7"));
  }

  for (const j of jobs ?? []) {
    if (!j?.slug) continue;
    parts.push(urlEntry(`${BASE}/opportunities/${j.slug}`, j.updated_at ?? undefined, "daily", "0.8"));
  }

  parts.push("</urlset>");

  return new Response(parts.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
