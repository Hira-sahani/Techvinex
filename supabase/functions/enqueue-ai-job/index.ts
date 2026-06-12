// Enqueue an async AI job. Returns { jobId } immediately so the request is
// not blocked by the upstream model (OpenAI / ElevenLabs).
//
// Flow:
//   1. Validate + rate-limit (10 req/min/user via guard)
//   2. Insert ai_jobs row owned by auth.uid() with status='queued'
//   3. Fire-and-forget invoke the worker via EdgeRuntime.waitUntil
//   4. Return { jobId } in <50ms
//
// The worker is `ai-job-worker` and runs as a separate Edge Function so this
// endpoint never holds an open connection to the upstream model.

import { guard, z, guardJson } from "../_shared/guard.ts";

const inputSchema = z.object({
  kind: z.enum(["interview", "tts", "benchmark"]),
  input: z.object({
    // interview
    messages: z.array(z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string().max(8000),
    })).max(40).optional(),
    domain: z.string().max(100).optional(),
    // tts
    text: z.string().max(5000).optional(),
    voiceId: z.string().max(60).optional(),
    // benchmark
    task_id: z.string().uuid().optional(),
    model: z.string().max(60).optional(),
  }),
});

// Declare EdgeRuntime for Deno Deploy / Supabase Edge Functions.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "enqueue-ai-job", limit: 10, windowMs: 60_000, bucketBy: "user" },
    schema: inputSchema,
    maxBodyBytes: 64 * 1024,
  }, async ({ userId, body, db, audit }) => {
    const { data, error } = await db
      .from("ai_jobs")
      .insert({
        user_id: userId!,
        kind: body.kind,
        status: "queued",
        input: body.input,
      })
      .select("id")
      .single();

    if (error || !data) {
      return guardJson({ error: "enqueue_failed" }, 500);
    }

    await audit("ai_job.enqueued", { kind: body.kind, jobId: data.id });

    // Fire-and-forget: invoke the worker. The response returns before this resolves.
    const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-job-worker`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const workerCall = fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ jobId: data.id }),
    }).catch(() => { /* worker failures are recorded on the ai_jobs row */ });

    if (typeof EdgeRuntime !== "undefined") {
      EdgeRuntime.waitUntil(workerCall);
    }

    return guardJson({ jobId: data.id, status: "queued" }, 202);
  })
);
