// ElevenLabs TTS — auth required, per-user rate-limited.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { guard, guardJson, z } from "../_shared/guard.ts";

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

// ---- Decrypt (matches admin-secrets) ----
async function getKey(): Promise<CryptoKey> {
  const seed = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("secrets-v1::" + seed));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}
function b64uDec(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function decrypt(payload: string): Promise<string> {
  const [iv, ct] = payload.split(".");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64uDec(iv) }, key, b64uDec(ct));
  return new TextDecoder().decode(pt);
}

const cache = new Map<string, { value: string; exp: number }>();
async function getSecret(name: string): Promise<string | null> {
  const cached = cache.get(name);
  if (cached && cached.exp > Date.now()) return cached.value;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && sk) {
      const admin = createClient(url, sk);
      const { data } = await admin.from("secrets").select("value").eq("key", name).maybeSingle();
      if (data?.value) {
        const plain = await decrypt(data.value);
        cache.set(name, { value: plain, exp: Date.now() + 60_000 });
        return plain;
      }
    }
  } catch { /* fall through */ }
  const env = Deno.env.get(name);
  if (env) { cache.set(name, { value: env, exp: Date.now() + 60_000 }); return env; }
  return null;
}

const bodySchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().regex(/^[A-Za-z0-9]{1,40}$/).optional(),
});

Deno.serve((req) =>
  guard(req, {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: { key: "elevenlabs-tts", limit: 60, windowMs: 60_000 },
    schema: bodySchema,
    maxBodyBytes: 32 * 1024,
  }, async (ctx) => {
    const ELEVENLABS_API_KEY = await getSecret("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) return guardJson({ error: "service_unavailable" }, 503);

    const { text, voiceId } = ctx.body as z.infer<typeof bodySchema>;
    const selectedVoice = voiceId || VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true, speed: 1.0 },
        }),
      }
    );

    if (!response.ok) return guardJson({ error: "upstream_error", status: response.status }, 502);

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
    });
  })
);
