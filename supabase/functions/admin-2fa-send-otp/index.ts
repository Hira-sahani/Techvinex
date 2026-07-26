// Sends a 6-digit OTP to a Super Admin's email and creates a 10-minute
// verification session in admin_2fa_sessions. Every attempt is recorded in
// admin_2fa_attempts for audit.
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
  email: z.string().email().max(255),
  userId: z.string().uuid(),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, "0");
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
      await db.from("admin_2fa_attempts").insert({
        event: "send_otp",
        success: false,
        ip,
        user_agent: ua,
        details: { reason: "validation_failed", issues: result.error.flatten().fieldErrors },
      });
      return json({ error: "validation_failed", issues: result.error.flatten().fieldErrors }, 422);
    }
    parsed = result.data;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { email, userId } = parsed;

  try {
    const otp = generateOtp();
    const otpHash = await sha256Hex(otp);
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { data: session, error: insErr } = await db
      .from("admin_2fa_sessions")
      .insert({
        user_id: userId,
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insErr || !session) {
      await db.from("admin_2fa_attempts").insert({
        user_id: userId,
        email,
        event: "send_otp",
        success: false,
        ip,
        user_agent: ua,
        details: { reason: "session_insert_failed", error: insErr?.message },
      });
      return json({ error: "session_create_failed" }, 500);
    }

    // Best-effort delivery via Supabase Auth generateLink (magic email transport)
    // OR fall back to logging OTP in details for dev environments. Replace with
    // your transactional email provider as needed.
    let delivered = false;
    let deliveryError: string | null = null;
    try {
      // If a transactional-email edge function exists, invoke it. Otherwise skip.
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          to: email,
          subject: "Your Techvinex admin verification code",
          html: `<p>Your verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in 10 minutes.</p>`,
          text: `Your verification code is ${otp}. It expires in 10 minutes.`,
          purpose: "transactional",
        }),
      });
      delivered = resp.ok;
      if (!resp.ok) deliveryError = `email_status_${resp.status}`;
    } catch (e) {
      deliveryError = String(e);
    }

    await db.from("admin_2fa_attempts").insert({
      session_id: session.id,
      user_id: userId,
      email,
      event: "send_otp",
      success: true,
      ip,
      user_agent: ua,
      details: { delivered, delivery_error: deliveryError },
    });

    return json({ success: true, sessionId: session.id, expiresIn: 600 });
  } catch (e) {
    await db.from("admin_2fa_attempts").insert({
      user_id: userId,
      email,
      event: "send_otp",
      success: false,
      ip,
      user_agent: ua,
      details: { reason: "unhandled", error: String(e) },
    });
    return json({ error: "internal_error" }, 500);
  }
});
