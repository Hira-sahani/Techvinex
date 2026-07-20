import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in Techvinex user's profile row.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let client;
    try {
      client = supabaseForUser(ctx);
    } catch (e) {
      return errorResult(`Supabase client init failed: ${(e as Error).message}`);
    }
    const userId = ctx.getUserId();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return errorResult(`Query failed (code=${error.code ?? "?"}): ${error.message}`);
    }
    if (!data) {
      return {
        content: [{
          type: "text",
          text: `No profile row exists for user_id=${userId}. Authentication and RLS succeeded, but the profiles table has no matching row.`,
        }],
        structuredContent: { profile: null, user_id: userId, reason: "no_profile_row" },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { profile: data },
    };
  },
});
