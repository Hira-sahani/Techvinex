import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, rateLimit, supabaseForUser } from "./_shared";
import { chatComplete } from "./_ai";

export default defineTool({
  name: "generate_cover_letter",
  title: "Generate cover letter",
  description:
    "Generate a tailored cover letter for the signed-in user for a specific Techvinex job. " +
    "Uses the user's profile for context. Read-only — returns text, does not submit anything.",
  inputSchema: {
    job_id: z.string().uuid().describe("Explore job UUID to tailor the letter to."),
    tone: z
      .enum(["professional", "friendly", "enthusiastic", "concise"])
      .optional()
      .describe("Desired tone. Defaults to 'professional'."),
    extra_context: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .describe("Extra context to include (achievements, motivations, etc.)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: true },
  handler: async ({ job_id, tone, extra_context }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const rl = await rateLimit(ctx, "generate_cover_letter", { limit: 10, windowMs: 60_000 });
    if (rl) return rl;

    const supabase = supabaseForUser(ctx);

    const [{ data: job, error: jobErr }, { data: profile, error: profErr }] = await Promise.all([
      supabase
        .from("explore_jobs")
        .select("id, title, company_name, location, short_description, description, skills, experience")
        .eq("id", job_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, headline, bio, location, linkedin, portfolio, github")
        .eq("user_id", ctx.getUserId())
        .maybeSingle(),
    ]);
    if (jobErr) return errorResult(`Job lookup failed: ${jobErr.message}`);
    if (!job) return errorResult(`No job found for id=${job_id}.`);
    if (profErr) return errorResult(`Profile lookup failed: ${profErr.message}`);

    const system =
      "You write concise, tailored cover letters for job applications. " +
      "Use only facts from the provided profile — do not invent employers, degrees, or metrics. " +
      "Return only the cover letter body, no salutation/signature placeholders like [Your Name].";

    const user = [
      `TONE: ${tone ?? "professional"}`,
      `JOB TITLE: ${job.title}`,
      job.company_name ? `COMPANY: ${job.company_name}` : "",
      job.location ? `LOCATION: ${job.location}` : "",
      `JOB DESCRIPTION:\n${job.short_description ?? ""}\n${(job.description ?? "").slice(0, 2000)}`,
      Array.isArray(job.skills) && job.skills.length ? `REQUIRED SKILLS: ${job.skills.join(", ")}` : "",
      "",
      "APPLICANT PROFILE:",
      profile?.full_name ? `Name: ${profile.full_name}` : "",
      profile?.headline ? `Headline: ${profile.headline}` : "",
      profile?.location ? `Location: ${profile.location}` : "",
      profile?.bio ? `Bio: ${profile.bio}` : "",
      profile?.linkedin ? `LinkedIn: ${profile.linkedin}` : "",
      profile?.portfolio ? `Portfolio: ${profile.portfolio}` : "",
      profile?.github ? `GitHub: ${profile.github}` : "",
      extra_context ? `\nEXTRA CONTEXT:\n${extra_context}` : "",
      "",
      "Write a 3–4 paragraph cover letter, ~250 words.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { text, model } = await chatComplete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.5 },
      );
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          cover_letter: text,
          model,
          job: { id: job.id, title: job.title, company_name: job.company_name },
        },
      };
    } catch (e) {
      return errorResult((e as Error).message);
    }
  },
});
