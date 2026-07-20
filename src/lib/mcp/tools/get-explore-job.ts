import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "get_explore_job",
  title: "Get explore job",
  description: "Fetch a single Techvinex explore job by id or slug (public listing fields only).",
  inputSchema: {
    id: z.string().uuid().optional().describe("Job UUID."),
    slug: z.string().trim().min(1).max(200).optional().describe("Job slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, slug }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!id && !slug) return errorResult("Provide either `id` or `slug`.");
    let q = supabaseForUser(ctx)
      .from("explore_jobs")
      .select(
        "id, title, slug, short_description, description, skills, experience, budget, job_type, location, company_name, show_company, show_salary, tags, urgency, featured, status, meta_title, meta_description, allow_direct_apply, expiry_date, views_count, applications_count, created_at",
      );
    q = id ? q.eq("id", id) : q.eq("slug", slug!);
    const { data, error } = await q.maybeSingle();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? null) }],
      structuredContent: { job: data ?? null },
    };
  },
});
