import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

export default defineTool({
  name: "schedule_interview",
  title: "Schedule interview",
  description:
    "Schedule an interview as the signed-in employer. Requires `confirm: true` to actually create " +
    "the row. RLS ensures only employers can insert interviews they own.",
  inputSchema: {
    candidate_id: z.string().uuid().optional().describe("Candidate user UUID (optional)."),
    candidate_name: z.string().trim().min(1).max(200).optional().describe("Candidate display name."),
    job_id: z.string().uuid().optional().describe("Explore job UUID (optional)."),
    job_title: z.string().trim().min(1).max(200).optional().describe("Job title snapshot."),
    scheduled_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Interview date in YYYY-MM-DD format."),
    scheduled_time: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .optional()
      .describe("Interview time (free text, e.g. '10:30 AM IST')."),
    confirm: z
      .boolean()
      .optional()
      .describe("Must be `true` to actually create the interview. Otherwise returns a dry-run preview."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "schedule_interview", { limit: 30, windowMs: 60_000 });
    if (rl) return rl;

    if (!input.candidate_id && !input.candidate_name) {
      return errorResult("Provide at least one of candidate_id or candidate_name.");
    }

    // Basic date sanity check.
    const when = new Date(`${input.scheduled_date}T00:00:00Z`);
    if (Number.isNaN(when.getTime())) return errorResult("scheduled_date is not a valid date.");

    const supabase = supabaseForUser(ctx);
    const employerId = ctx.getUserId();

    const row = {
      employer_id: employerId,
      candidate_id: input.candidate_id ?? null,
      candidate_name: input.candidate_name ?? null,
      job_id: input.job_id ?? null,
      job_title: input.job_title ?? null,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time ?? null,
      status: "scheduled",
    };

    if (!input.confirm) {
      return {
        content: [{
          type: "text",
          text:
            `DRY RUN — no interview created. Call schedule_interview again with confirm: true to schedule.`,
        }],
        structuredContent: { dry_run: true, would_insert: row },
      };
    }

    const { data, error } = await supabase
      .from("employer_interviews")
      .insert(row)
      .select("id, employer_id, candidate_id, candidate_name, job_id, job_title, scheduled_date, scheduled_time, status, created_at")
      .maybeSingle();

    if (error) return errorResult(`Insert failed (code=${error.code ?? "?"}): ${error.message}`);

    return {
      content: [{
        type: "text",
        text: `Interview scheduled for ${input.candidate_name ?? input.candidate_id} on ${input.scheduled_date}${input.scheduled_time ? ` at ${input.scheduled_time}` : ""}. id=${data?.id}`,
      }],
      structuredContent: { scheduled: true, interview: data },
    };
  },
});
