// AI Interview — direct OpenAI streaming. No Lovable dependency.
// Auth: required (any signed-in user). Rate-limited per user.
import { guard, z } from "../_shared/guard.ts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a professional technical interviewer at Techvinex, a top-tier talent platform. You conduct domain expert interviews to evaluate candidates' technical skills.

RULES:
- Ask exactly 5 technical questions, one at a time
- Start with a brief introduction and your first question
- After each answer, briefly acknowledge it and ask the next question
- Questions should range from fundamentals to advanced concepts
- Be professional, encouraging, and concise
- Keep responses under 3 sentences when asking questions
- After the 5th answer, thank the candidate and say "That concludes our interview"
- Evaluate based on depth of knowledge, problem-solving approach, and communication
- Do NOT use markdown formatting (no **, *, etc.) — speak naturally as this will be read aloud`;

const bodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().max(8000),
  })).min(1).max(40),
  domain: z.string().max(100).optional(),
});

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "ai-interview", limit: 30, windowMs: 60_000 },
    schema: bodySchema,
    maxBodyBytes: 128 * 1024,
  }, async (ctx) => {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "service_unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { messages, domain } = ctx.body as z.infer<typeof bodySchema>;
    const systemMessage = {
      role: "system" as const,
      content: domain ? SYSTEM_PROMPT.replace("technical skills", `${domain} skills`) : SYSTEM_PROMPT,
    };

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 402 ? 402 : 502;
      return new Response(JSON.stringify({ error: "upstream_error", status: response.status }), {
        status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(response.body, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  })
);
