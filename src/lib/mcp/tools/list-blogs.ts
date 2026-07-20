import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "list_blogs",
  title: "List blogs",
  description: "List published Techvinex blog posts, newest first.",
  inputSchema: {
    category: z.string().trim().min(1).max(60).optional().describe("Filter by blog category."),
    search: z.string().trim().min(1).max(120).optional().describe("Case-insensitive substring matched against title."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows. Defaults to 20."),
    offset: z.number().int().min(0).max(1000).optional().describe("Pagination offset. Defaults to 0."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit, offset }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const lim = limit ?? 20;
    const off = offset ?? 0;
    let q = supabaseForUser(ctx)
      .from("blogs")
      .select("id, title, slug, short_description, image_url, category, author, read_time, status, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(off, off + lim - 1);
    if (category) q = q.eq("category", category);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { blogs: data ?? [], limit: lim, offset: off },
    };
  },
});
