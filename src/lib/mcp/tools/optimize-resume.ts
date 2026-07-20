import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";
import { chatComplete } from "./_ai";

export default defineTool({
  name: "optimize_resume",
  title: "Optimize resume",
  description:
    "Suggest ATS-friendly improvements to a resume, optionally tailored to a specific Techvinex job. " +
    "Read-only — returns suggestions, does not update the user's stored resume.",
  inputSchema: {
    resume_text: z
      .string()
      .trim()
      .min(50)
      .max(20_000)
      .describe("Raw resume text to review."),
    job_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional Techvinex job to tailor recommendations to."),
    focus: z
      .enum(["keywords", "impact_metrics", "clarity", "ats_formatting", "all"])
      .optional()
      .describe("Optimization focus. Defaults to 'all'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ resume_text, job_id, focus }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "optimize_resume", { limit: 10, windowMs: 60_000 });
    if (rl) return rl;

    let jobContext = "";
    let jobMeta: Record<string, unknown> | null = null;
    if (job_id) {
      const supabase = supabaseForUser(ctx);
      const { data: job, error } = await supabase
        .from("explore_jobs")
        .select("id, title, company_name, short_description, description, skills")
        .eq("id", job_id)
        .maybeSingle();
      if (error) return errorResult(`Job lookup failed: ${error.message}`);
      if (!job) return errorResult(`No job found for id=${job_id}.`);
      jobMeta = { id: job.id, title: job.title, company_name: job.company_name };
      jobContext = [
        `TARGET JOB: ${job.title}${job.company_name ? " @ " + job.company_name : ""}`,
        job.short_description ? `Summary: ${job.short_description}` : "",
        Array.isArray(job.skills) && job.skills.length ? `Skills: ${job.skills.join(", ")}` : "",
        (job.description ?? "").slice(0, 1500),
      ]
        .filter(Boolean)
        .join("\n");
    }

    const system =
      "You are a resume coach for engineering and product hiring. Return concrete, non-generic " +
      "suggestions. Be honest about weaknesses. Do not invent experience the resume doesn't show.";

    const user = [
      `FOCUS: ${focus ?? "all"}`,
      jobContext,
      "",
      "RESUME:",
      resume_text,
      "",
      "Respond as strict JSON with keys: summary (string), strengths (string[]), " +
        "improvements (string[]), missing_keywords (string[]), ats_issues (string[]), " +
        "rewritten_bullets ({original,rewritten}[]).",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { text, model } = await chatComplete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.3 },
      );

      // Best-effort JSON parse; fall back to raw text.
      let parsed: unknown = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}$/m) ?? text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch { parsed = null; }

      return {
        content: [{ type: "text", text }],
        structuredContent: {
          suggestions: parsed,
          raw: parsed ? undefined : text,
          model,
          job: jobMeta,
        },
      };
    } catch (e) {
      return errorResult((e as Error).message);
    }
  },
});
