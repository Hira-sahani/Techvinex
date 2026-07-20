import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

// Whitelist of profile fields we surface. Every field is treated as optional
// and coerced to `null` when missing so a sparse profile never throws.
const PROFILE_FIELDS = [
  "user_id",
  "email",
  "full_name",
  "avatar_url",
  "phone",
  "headline",
  "bio",
  "location",
  "country",
  "state",
  "city",
  "postal_code",
  "linkedin",
  "portfolio",
  "github",
  "leetcode",
  "codechef",
  "codeforces",
  "resume_url",
  "created_at",
  "updated_at",
] as const;

function safeGet(row: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!row || typeof row !== "object") return null;
  const v = (row as Record<string, unknown>)[key];
  return v === undefined ? null : v;
}

function normalizeProfile(row: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) out[key] = safeGet(row, key);
  // Also passthrough any additional keys as-is (null-safe).
  if (row && typeof row === "object") {
    for (const [k, v] of Object.entries(row)) {
      if (!(k in out)) out[k] = v ?? null;
    }
  }
  return out;
}

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description:
    "Return the signed-in Techvinex user's profile row. Every field is optional; missing fields are returned as null.",
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

    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return errorResult(
          `Query failed (code=${error.code ?? "?"}): ${error.message ?? "unknown"}`,
        );
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

      // Null-safe normalization — never throws on missing/NULL fields.
      const profile = normalizeProfile(data as Record<string, unknown>);

      return {
        content: [{ type: "text", text: JSON.stringify(profile) }],
        structuredContent: { profile, user_id: userId },
      };
    } catch (e) {
      // Capture the exact file:line of any unexpected null-deref or runtime error.
      const err = e as Error;
      const firstFrame = (err.stack ?? "")
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("at ")) ?? "no-stack";
      return errorResult(
        `get_my_profile runtime exception: ${err.name}: ${err.message} | ${firstFrame}`,
      );
    }
  },
});
