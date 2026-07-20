import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

// Whitelist of profile fields the signed-in user is allowed to update over MCP.
// Sensitive/derived columns (email, user_id, signatures, onboarding flags,
// timestamps) are intentionally excluded.
const UpdatableProfile = z
  .object({
    full_name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(3).max(32).optional(),
    linkedin: z.string().trim().url().max(300).optional(),
    portfolio: z.string().trim().url().max(300).optional(),
    github: z.string().trim().url().max(300).optional(),
    leetcode: z.string().trim().url().max(300).optional(),
    codechef: z.string().trim().url().max(300).optional(),
    codeforces: z.string().trim().url().max(300).optional(),
    country: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    postal_code: z.string().trim().max(20).optional(),
  })
  .strict();

export default defineTool({
  name: "update_my_profile",
  title: "Update my profile",
  description:
    "Update whitelisted fields on the signed-in Techvinex user's profile (name, contact, links, location). Sensitive fields cannot be changed here.",
  inputSchema: {
    patch: UpdatableProfile.describe("Object with the profile fields to update. Only include fields you want to change."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ patch }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const keys = Object.keys(patch ?? {});
    if (keys.length === 0) return errorResult("Provide at least one field in `patch`.");

    const rl = await rateLimit(ctx, "update_my_profile", { limit: 20, windowMs: 60_000 });
    if (rl) return rl;

    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .update(patch)
      .eq("user_id", ctx.getUserId())
      .select()
      .maybeSingle();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? null) }],
      structuredContent: { profile: data ?? null, updated_fields: keys },
    };
  },
});
