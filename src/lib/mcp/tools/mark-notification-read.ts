import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

export default defineTool({
  name: "mark_notification_read",
  title: "Mark notification read",
  description: "Mark one notification, or all notifications, as read for the signed-in user.",
  inputSchema: {
    notification_id: z.string().uuid().optional().describe("Notification UUID. Omit together with `all: true` to mark all as read."),
    all: z.boolean().optional().describe("If true, marks every unread notification for the user as read."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ notification_id, all }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!notification_id && !all) return errorResult("Provide `notification_id` or set `all: true`.");
    const rl = await rateLimit(ctx, "mark_notification_read", { limit: 60, windowMs: 60_000 });
    if (rl) return rl;

    let q = supabaseForUser(ctx)
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", ctx.getUserId());
    q = notification_id ? q.eq("id", notification_id) : q.eq("is_read", false);
    const { data, error } = await q.select();
    if (error) return errorResult(error.message);
    return {
      content: [{ type: "text", text: JSON.stringify({ updated: data?.length ?? 0 }) }],
      structuredContent: { updated: data?.length ?? 0 },
    };
  },
});
