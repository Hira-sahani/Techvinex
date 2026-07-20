import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "list_my_bookmarks",
  title: "List my bookmarks",
  description: "List the signed-in user's bookmarked jobs, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max rows. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("job_bookmarks")
      .select("id, job_id, created_at, explore_jobs(id, title, slug, company_name, location, budget)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { bookmarks: data ?? [] },
    };
  },
});
