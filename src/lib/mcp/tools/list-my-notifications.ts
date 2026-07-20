import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";


export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description: "List the signed-in user's most recent Techvinex notifications, newest first.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max notifications to return. Defaults to 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let client;
    try { client = supabaseForUser(ctx); }
    catch (e) { return errorResult(`Supabase client init failed: ${(e as Error).message}`); }
    const { data, error } = await client
      .from("notifications")
      .select("id, title, body, action_url, read_at, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return errorResult(`Query failed (code=${error.code ?? "?"}): ${error.message}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
