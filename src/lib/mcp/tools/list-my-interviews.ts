import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, supabaseForUser } from "./_shared";

export default defineTool({
  name: "list_my_interviews",
  title: "List my interviews",
  description:
    "List interviews visible to the signed-in user under RLS. Employers see interviews they own " +
    "on employer_interviews; candidates see rows where they are the candidate (if any policy allows). " +
    "Newest first.",
  inputSchema: {
    status: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .optional()
      .describe("Filter by interview status (e.g. 'scheduled', 'completed')."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);

    let q = supabase
      .from("employer_interviews")
      .select(
        "id, candidate_id, job_id, employer_id, candidate_name, job_title, scheduled_date, scheduled_time, status, feedback, created_at",
      )
      .order("scheduled_date", { ascending: false, nullsFirst: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return errorResult(`Query failed (code=${error.code ?? "?"}): ${error.message}`);

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { interviews: data ?? [], count: data?.length ?? 0 },
    };
  },
});
