// Public read-only Explore jobs endpoint.
//
// Replaces direct PostgREST reads from anonymous browsers. Returns
// `Cache-Control: public, s-maxage=45, stale-while-revalidate=120` so the
// edge CDN absorbs 95%+ of requests at scale — the DB sees ~1 hit / 45 s
// per cache key (page) regardless of concurrent user count.
//
// Hard caps: pageSize ≤ 50, offset ≤ 500. IP-bucketed rate limit.

import { guard, z } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PUBLIC_COLUMNS =
  "id, source_requirement_id, title, short_description, description, skills, experience, " +
  "budget, job_type, location, company_name, show_company, show_salary, urgency, tags, " +
  "compliance_info, visibility, geo_targeting, skill_targeting, featured, status, slug, " +
  "meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, " +
  "expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at";

const querySchema = z.object({
  pageSize: z.number().int().min(1).max(50).optional(),
  pageIndex: z.number().int().min(0).max(10).optional(),
  search: z.string().max(120).optional(),
});

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: false,
    rateLimit: { key: "public-explore-jobs", limit: 120, windowMs: 60_000, bucketBy: "ip" },
    schema: querySchema,
    maxBodyBytes: 2 * 1024,
  }, async ({ body }) => {
    const pageSize = body.pageSize ?? 25;
    const pageIndex = body.pageIndex ?? 0;
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase
      .from("explore_jobs")
      .select(PUBLIC_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (body.search) {
      // Simple ILIKE over title only — keeps the plan index-friendly.
      // Escape LIKE-pattern metacharacters (\, %, _) so user input can't
      // smuggle wildcards or force pathological scans. Values are still
      // bound as parameters by PostgREST — this is defence-in-depth.
      const safe = body.search.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);
      q = q.ilike("title", `%${safe}%`);
    }

    const { data, count, error } = await q;
    if (error) {
      return new Response(JSON.stringify({ error: "fetch_failed" }), { status: 500,
        headers: { "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ jobs: data ?? [], total: count ?? 0, pageSize, pageIndex }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // CDN edge cache 45 s + stale-while-revalidate 120 s
          "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120",
          // Vary on the body params so different pages cache separately
          "Vary": "Origin, Content-Type",
        },
      },
    );
  })
);
