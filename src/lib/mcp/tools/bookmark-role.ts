import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

export default defineTool({
  name: "bookmark_role",
  title: "Bookmark role",
  description: "Bookmark an explore job for the signed-in user. Idempotent — re-bookmarking is a no-op.",
  inputSchema: {
    job_id: z.string().uuid().describe("UUID of the explore job to bookmark."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ job_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "bookmark_role", { limit: 60, windowMs: 60_000 });
    if (rl) return rl;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("job_bookmarks")
      .upsert(
        { user_id: ctx.getUserId(), job_id },
        { onConflict: "user_id,job_id", ignoreDuplicates: false },
      )
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { job_id, bookmarked: true }) }],
      structuredContent: { bookmark: data },
    };
  },
});
