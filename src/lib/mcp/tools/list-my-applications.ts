import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "list_my_applications",
  title: "List my applications",
  description: "List the signed-in user's job applications, newest first.",
  inputSchema: {
    status: z.string().trim().min(1).max(40).optional().describe("Filter by application status (e.g. 'submitted', 'reviewed')."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("job_applications")
      .select("id, job_id, status, created_at, explore_jobs(id, title, slug, company_name, location)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { applications: data ?? [] },
    };
  },
});
