import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";


export default defineTool({
  name: "list_explore_jobs",
  title: "List explore jobs",
  description: "List published Techvinex explore jobs (public listings visible to signed-in users).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max jobs to return. Defaults to 20."),
    search: z.string().trim().min(1).max(120).optional().describe("Optional case-insensitive substring to match in the job title."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let client;
    try { client = supabaseForUser(ctx); }
    catch (e) { return errorResult(`Supabase client init failed: ${(e as Error).message}`); }
    let query = client
      .from("explore_jobs")
      .select("id, title, slug, location, budget, job_type, created_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (search) {
      const safe = search.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);
      query = query.ilike("title", `%${safe}%`);
    }
    const { data, error } = await query;
    if (error) return errorResult(`Query failed (code=${error.code ?? "?"}): ${error.message}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { jobs: data ?? [] },
    };
  },
});
