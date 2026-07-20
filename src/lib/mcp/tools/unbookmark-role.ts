import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

export default defineTool({
  name: "unbookmark_role",
  title: "Unbookmark role",
  description: "Remove a bookmark on an explore job for the signed-in user.",
  inputSchema: {
    job_id: z.string().uuid().describe("UUID of the explore job to unbookmark."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ job_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "unbookmark_role", { limit: 60, windowMs: 60_000 });
    if (rl) return rl;
    const { data, error } = await supabaseForUser(ctx)
      .from("job_bookmarks")
      .delete()
      .eq("user_id", ctx.getUserId())
      .eq("job_id", job_id)
      .select();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify({ removed: data?.length ?? 0 }) }],
      structuredContent: { removed: data?.length ?? 0, job_id },
    };
  },
});
