import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface BenchmarkRequest {
  task_id: string;
  model: string;
  retry_count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { task_id, model = "google/gemini-3-flash-preview", retry_count = 1 }: BenchmarkRequest = await req.json();

    if (!task_id) {
      return new Response(JSON.stringify({ error: "task_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from("benchmark_tasks")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const attempts: Array<{
      attempt: number;
      response: string;
      score: number;
      latency_ms: number;
    }> = [];

    let bestScore = 0;
    let bestResponse = "";
    let bestLatency = 0;
    let passAt1 = false;

    for (let i = 0; i < retry_count; i++) {
      const startTime = Date.now();

      const messages: Array<{ role: string; content: string }> = [];

      if (task.system_prompt) {
        messages.push({ role: "system", content: task.system_prompt });
      }

      messages.push({ role: "user", content: task.prompt });

      if (task.input_data) {
        messages.push({
          role: "user",
          content: `Additional input data:\n${task.input_data}`,
        });
      }

      const aiResponse = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "Credits exhausted. Please add funds in Settings > Workspace > Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: `AI Gateway error [${aiResponse.status}]: ${errText}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - startTime;

      // Score the response using rubric
      const score = await scoreResponse(LOVABLE_API_KEY, task, aiContent);

      attempts.push({
        attempt: i + 1,
        response: aiContent,
        score,
        latency_ms: latencyMs,
      });

      if (i === 0 && score >= task.max_score * 0.7) {
        passAt1 = true;
      }

      if (score > bestScore) {
        bestScore = score;
        bestResponse = aiContent;
        bestLatency = latencyMs;
      }
    }

    const passAtN = attempts.some((a) => a.score >= task.max_score * 0.7);

    // Save result
    const { data: result, error: insertError } = await supabase
      .from("benchmark_results")
      .insert({
        task_id,
        user_id: user.id,
        model,
        ai_response: bestResponse,
        score: bestScore,
        max_score: task.max_score,
        latency_ms: bestLatency,
        attempts,
        pass_at_1: passAt1,
        pass_at_n: passAtN,
        status: "completed",
        metadata: {
          total_attempts: retry_count,
          avg_score: attempts.reduce((s, a) => s + a.score, 0) / attempts.length,
          avg_latency: Math.round(attempts.reduce((s, a) => s + a.latency_ms, 0) / attempts.length),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save result" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ result, attempts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Benchmark error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function scoreResponse(
  apiKey: string,
  task: any,
  response: string
): Promise<number> {
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: scoringPrompt }],
        temperature: 0.1,
        max_tokens: 500,
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
  } catch {
    return 0;
  }
}
