// Benchmark runner — Lovable AI Gateway. Auth required, rate-limited.
import { guard, guardJson, z } from "../_shared/guard.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const bodySchema = z.object({
  task_id: z.string().uuid(),
  model: z.string().min(1).max(100).optional(),
  retry_count: z.number().int().min(1).max(5).optional(),
});

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "openai-benchmark", limit: 20, windowMs: 60_000 },
    schema: bodySchema,
    maxBodyBytes: 16 * 1024,
  }, async (ctx) => {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return guardJson({ error: "service_unavailable" }, 503);

    const { task_id, model = "google/gemini-3-flash-preview", retry_count = 1 } =
      ctx.body as z.infer<typeof bodySchema>;
    const userId = ctx.userId!;

    const { data: task, error: taskError } = await ctx.db
      .from("benchmark_tasks").select("*").eq("id", task_id).single();
    if (taskError || !task) return guardJson({ error: "task_not_found" }, 404);

    const attempts: Array<{ attempt: number; response: string; score: number; latency_ms: number }> = [];
    let bestScore = 0, bestResponse = "", bestLatency = 0, passAt1 = false;

    for (let i = 0; i < retry_count; i++) {
      const startTime = Date.now();
      const messages: Array<{ role: string; content: string }> = [];
      if (task.system_prompt) messages.push({ role: "system", content: task.system_prompt });
      messages.push({ role: "user", content: task.prompt });
      if (task.input_data) messages.push({ role: "user", content: `Additional input data:\n${task.input_data}` });

      const aiResponse = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) return guardJson({ error: "rate_limited_upstream" }, 429);
        if (aiResponse.status === 402) return guardJson({ error: "credits_exhausted" }, 402);
        return guardJson({ error: "upstream_error", status: aiResponse.status }, 502);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - startTime;
      const score = await scoreResponse(LOVABLE_API_KEY, task, aiContent);

      attempts.push({ attempt: i + 1, response: aiContent, score, latency_ms: latencyMs });
      if (i === 0 && score >= task.max_score * 0.7) passAt1 = true;
      if (score > bestScore) { bestScore = score; bestResponse = aiContent; bestLatency = latencyMs; }
    }

    const passAtN = attempts.some((a) => a.score >= task.max_score * 0.7);
    const { data: result, error: insertError } = await ctx.db
      .from("benchmark_results")
      .insert({
        task_id, user_id: userId, model, ai_response: bestResponse,
        score: bestScore, max_score: task.max_score, latency_ms: bestLatency, attempts,
        pass_at_1: passAt1, pass_at_n: passAtN, status: "completed",
        metadata: {
          total_attempts: retry_count,
          avg_score: attempts.reduce((s, a) => s + a.score, 0) / attempts.length,
          avg_latency: Math.round(attempts.reduce((s, a) => s + a.latency_ms, 0) / attempts.length),
        },
      })
      .select().single();

    if (insertError) return guardJson({ error: "save_failed" }, 500);
    return guardJson({ result, attempts });
  })
);

async function scoreResponse(apiKey: string, task: any, response: string): Promise<number> {
  const rubricText = Array.isArray(task.rubric)
    ? task.rubric.map((r: any, i: number) => `${i + 1}. ${r.criterion} (weight: ${r.weight || 1})`).join("\n")
    : "Evaluate overall quality, accuracy, and completeness.";
  const scoringPrompt = `You are an expert AI evaluator. Score the following AI response based on the rubric.

TASK: ${task.title}
PROMPT: ${task.prompt}
${task.expected_output ? `EXPECTED OUTPUT: ${task.expected_output}` : ""}

RUBRIC:
${rubricText}

AI RESPONSE:
${response}

Score from 0 to ${task.max_score}. Respond with ONLY a JSON object: {"score": <number>, "reasoning": "<brief explanation>"}`;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: scoringPrompt }],
        temperature: 0.1, max_tokens: 500,
      }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Math.min(Math.max(Number(parsed.score) || 0, 0), task.max_score);
    }
    return 0;
  } catch { return 0; }
}
