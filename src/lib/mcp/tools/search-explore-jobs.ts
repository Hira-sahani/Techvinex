import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

// Escape LIKE metacharacters so user input can't smuggle wildcards.
function escapeLike(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/[%_,()]/g, (c) => `\\${c}`);
}

export default defineTool({
  name: "search_explore_jobs",
  title: "Search explore jobs",
  description:
    "Search published Techvinex explore jobs by keyword, location, job type, or skills. Returns the newest matches first.",
  inputSchema: {
    query: z.string().trim().min(1).max(120).optional().describe("Case-insensitive substring matched against title and short description."),
    location: z.string().trim().min(1).max(80).optional().describe("Case-insensitive substring matched against the job location."),
    job_type: z.string().trim().min(1).max(40).optional().describe("Exact job type (e.g. 'full-time', 'contract')."),
    skills: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe("Skills the job must include (AND semantics)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max jobs to return. Defaults to 20."),
    offset: z.number().int().min(0).max(1000).optional().describe("Pagination offset. Defaults to 0."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, location, job_type, skills, limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const lim = limit ?? 20;
    const off = offset ?? 0;
    let q = supabaseForUser(ctx)
      .from("explore_jobs")
      .select(
        "id, title, slug, short_description, location, budget, job_type, skills, tags, company_name, show_company, featured, created_at",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(off, off + lim - 1);
    if (query) {
      const s = escapeLike(query);
      q = q.or(`title.ilike.%${s}%,short_description.ilike.%${s}%`);
    }
    if (location) q = q.ilike("location", `%${escapeLike(location)}%`);
    if (job_type) q = q.eq("job_type", job_type);
    if (skills && skills.length) q = q.contains("skills", skills);
    const { data, error } = await q;
    if (error) return errorResult(`Query failed (code=${error.code ?? "?"}): ${error.message}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { jobs: data ?? [], offset: off, limit: lim },
    };
  },
});
