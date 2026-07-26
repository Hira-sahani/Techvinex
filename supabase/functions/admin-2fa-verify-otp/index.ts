// Verifies a 6-digit OTP against an admin_2fa_sessions row. Enforces a
// 10-minute expiration and 5-attempt cap per session. Every attempt is
// recorded in admin_2fa_attempts.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const schema = z.object({
  sessionId: z.string().uuid(),
  otp: z.string().regex(/^\d{6}$/),
  userId: z.string().uuid(),
});

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string compare to avoid timing leaks.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  let parsed: z.infer<typeof schema>;
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return json({ error: "validation_failed", issues: result.error.flatten().fieldErrors }, 422);
    }
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { sessionId, otp, userId } = parsed;

  const record = async (success: boolean, details: Record<string, unknown>) => {
    await db.from("admin_2fa_attempts").insert({
      session_id: sessionId,
      user_id: userId,
      event: "verify_otp",
      success,
      ip,
      user_agent: ua,
      details,
    });
  };

  try {
    const { data: session, error: fetchErr } = await db
      .from("admin_2fa_sessions")
      .select("id, user_id, email, otp_hash, attempts, verified, expires_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (fetchErr || !session) {
      await record(false, { reason: "session_not_found" });
      return json({ error: "session_not_found" }, 404);
    }

    if (session.user_id !== userId) {
      await record(false, { reason: "user_mismatch" });
      return json({ error: "forbidden" }, 403);
    }

    if (session.verified) {
      await record(false, { reason: "already_verified" });
      return json({ error: "already_verified" }, 409);
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      await record(false, { reason: "expired" });
      return json({ error: "expired" }, 410);
    }

    if ((session.attempts ?? 0) >= MAX_ATTEMPTS) {
      await record(false, { reason: "too_many_attempts" });
      return json({ error: "too_many_attempts" }, 429);
    }

    const otpHash = await sha256Hex(otp);
    const match = timingSafeEqual(otpHash, session.otp_hash);

    if (!match) {
      await db
        .from("admin_2fa_sessions")
        .update({ attempts: (session.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", sessionId);
      await record(false, { reason: "invalid_otp", attempts: (session.attempts ?? 0) + 1 });
      return json({ error: "invalid_otp", attemptsRemaining: MAX_ATTEMPTS - ((session.attempts ?? 0) + 1) }, 401);
    }

    await db
      .from("admin_2fa_sessions")
      .update({
        verified: true,
        attempts: (session.attempts ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    await record(true, { reason: "verified" });
    return json({ success: true, verified: true });
  } catch (e) {
    await record(false, { reason: "unhandled", error: String(e) });
    return json({ error: "internal_error" }, 500);
  }
});
