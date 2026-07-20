import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "get_blog",
  title: "Get blog",
  description: "Fetch a single published Techvinex blog post by id or slug (full content).",
  inputSchema: {
    id: z.string().uuid().optional().describe("Blog UUID."),
    slug: z.string().trim().min(1).max(200).optional().describe("Blog slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, slug }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!id && !slug) return errorResult("Provide either `id` or `slug`.");
    let q = supabaseForUser(ctx)
      .from("blogs")
      .select("id, title, slug, short_description, content, image_url, category, author, read_time, status, created_at, updated_at")
      .eq("status", "published");
    q = id ? q.eq("id", id) : q.eq("slug", slug!);
    const { data, error } = await q.maybeSingle();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? null) }],
      structuredContent: { blog: data ?? null },
    };
  },
});
