import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";

export default defineTool({
  name: "apply_to_role",
  title: "Apply to role",
  description:
    "Submit the signed-in user's application to a Techvinex explore job. " +
    "Irreversible: pass `confirm: true` to actually submit. Idempotent — re-submitting " +
    "returns the existing application row instead of creating a duplicate (enforced by a unique " +
    "constraint on job_id + user_id).",
  inputSchema: {
    job_id: z.string().uuid().describe("UUID of the explore job to apply to."),
    confirm: z
      .boolean()
      .optional()
      .describe("Must be `true` to actually submit. If omitted or false, returns a dry-run preview."),
    cover_letter: z
      .string()
      .trim()
      .max(10_000)
      .optional()
      .describe("Optional cover letter text stored with the application (if provided)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ job_id, confirm, cover_letter }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "apply_to_role", { limit: 20, windowMs: 60_000 });
    if (rl) return rl;

    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    // Look up job for preview + validation.
    const { data: job, error: jobErr } = await supabase
      .from("explore_jobs")
      .select("id, title, company_name, location, status, visibility, allow_direct_apply, application_limit, applications_count, expiry_date")
      .eq("id", job_id)
      .maybeSingle();
    if (jobErr) return errorResult(`Job lookup failed: ${jobErr.message}`);
    if (!job) return errorResult(`No published job found for id=${job_id}.`);
    if (job.status !== "published" || job.visibility !== "public") {
      return errorResult(`Job ${job_id} is not open for applications (status=${job.status}, visibility=${job.visibility}).`);
    }
    if (job.allow_direct_apply === false) {
      return errorResult(`Job ${job_id} does not accept direct applications through Techvinex.`);
    }
    if (job.expiry_date && new Date(job.expiry_date) < new Date()) {
      return errorResult(`Job ${job_id} has expired.`);
    }

    // Check for existing application (idempotency).
    const { data: existing, error: existErr } = await supabase
      .from("job_applications")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .eq("job_id", job_id)
      .maybeSingle();
    if (existErr) return errorResult(`Duplicate check failed: ${existErr.message}`);

    if (existing) {
      return {
        content: [{
          type: "text",
          text: `Already applied to "${job.title}" on ${existing.created_at} (status=${existing.status}). No new application created.`,
        }],
        structuredContent: {
          already_applied: true,
          application: existing,
          job: { id: job.id, title: job.title },
        },
      };
    }

    if (!confirm) {
      return {
        content: [{
          type: "text",
          text:
            `DRY RUN — no application submitted. To submit, call apply_to_role again with confirm: true.\n` +
            `Job: ${job.title} @ ${job.company_name ?? "(hidden)"} (${job.location ?? "Remote"})`,
        }],
        structuredContent: {
          dry_run: true,
          would_submit: { user_id: userId, job_id, cover_letter: cover_letter ?? null },
          job: { id: job.id, title: job.title, company_name: job.company_name, location: job.location },
        },
      };
    }

    const { data: inserted, error: insErr } = await supabase
      .from("job_applications")
      .insert({ user_id: userId, job_id, status: "applied" })
      .select("id, status, created_at")
      .maybeSingle();

    if (insErr) {
      // Race: unique constraint (job_id,user_id) — re-read.
      if (insErr.code === "23505") {
        const { data: race } = await supabase
          .from("job_applications")
          .select("id, status, created_at")
          .eq("user_id", userId)
          .eq("job_id", job_id)
          .maybeSingle();
        return {
          content: [{ type: "text", text: `Already applied (race resolved).` }],
          structuredContent: { already_applied: true, application: race },
        };
      }
      return errorResult(`Insert failed (code=${insErr.code ?? "?"}): ${insErr.message}`);
    }

    return {
      content: [{
        type: "text",
        text: `Application submitted to "${job.title}". Application id: ${inserted?.id}.`,
      }],
      structuredContent: {
        submitted: true,
        application: inserted,
        job: { id: job.id, title: job.title },
        cover_letter_captured: !!cover_letter,
      },
    };
  },
});
