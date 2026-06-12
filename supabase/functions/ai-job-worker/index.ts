// AI Job Worker — internal, service-role only.
//
// Consumes a single ai_jobs row by id, runs the upstream model call (OpenAI
// chat for `interview`, ElevenLabs for `tts`), and writes the result back.
// Designed for fire-and-forget invocation from enqueue-ai-job, but also
// invocable by a future Inngest worker that fans events into this endpoint.
//
// Auth: rejects anything without the service-role bearer token (set by the
// parent enqueue call). This function is not user-facing — it must never
// trust client input.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";
const ELEVENLABS_VOICE_DEFAULT = "JBFqnCBsd6RMkjVDRZzb";

type Job = {
  id: string;
  user_id: string;
  kind: "interview" | "tts" | "benchmark";
  status: string;
  input: Record<string, unknown>;
  attempts: number;
};

async function runInterview(input: Record<string, unknown>): Promise<unknown> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("openai_not_configured");

  const messages = (input.messages as unknown[]) ?? [];
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  if (!r.ok) throw new Error(`openai_${r.status}`);
  const data = await r.json();
  return { content: data.choices?.[0]?.message?.content ?? "" };
}

async function runTts(input: Record<string, unknown>): Promise<unknown> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) throw new Error("elevenlabs_not_configured");
  const text = String(input.text ?? "");
  const voiceId = String(input.voiceId ?? ELEVENLABS_VOICE_DEFAULT);

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!r.ok) throw new Error(`elevenlabs_${r.status}`);

  // Base64-encode the mp3 payload — keeps the row JSON-safe.
  const buf = new Uint8Array(await r.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return { audioContent: btoa(binary), mime: "audio/mpeg" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response("method", { status: 405, headers: CORS });
  }

  // Service-role bearer is required.
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) {
    return new Response("forbidden", { status: 403, headers: CORS });
  }

  let payload: { jobId?: string };
  try { payload = await req.json(); } catch { return new Response("bad json", { status: 400, headers: CORS }); }
  if (!payload.jobId) return new Response("missing jobId", { status: 400, headers: CORS });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Atomically claim the job.
  const { data: job, error: claimErr } = await db
    .from("ai_jobs")
    .update({ status: "running", started_at: new Date().toISOString(), attempts: 1 })
    .eq("id", payload.jobId)
    .eq("status", "queued")
    .select("id, user_id, kind, status, input, attempts")
    .maybeSingle();

  if (claimErr || !job) {
    // Already claimed or doesn't exist — that's fine, exit quietly.
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const j = job as Job;
  try {
    let result: unknown;
    if (j.kind === "interview") result = await runInterview(j.input);
    else if (j.kind === "tts") result = await runTts(j.input);
    else throw new Error(`unsupported_kind:${j.kind}`);

    await db.from("ai_jobs").update({
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
    }).eq("id", j.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    await db.from("ai_jobs").update({
      status: "failed",
      error: String((e as Error).message ?? e).slice(0, 500),
      completed_at: new Date().toISOString(),
    }).eq("id", j.id);

    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
