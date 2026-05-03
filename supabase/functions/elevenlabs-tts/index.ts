import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

// ---- Shared decrypt (matches admin-secrets) ----
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

// In-memory cache (per warm instance)
const cache = new Map<string, { value: string; exp: number }>();

async function getSecret(name: string): Promise<string | null> {
  const cached = cache.get(name);
  if (cached && cached.exp > Date.now()) return cached.value;

  // 1) Try secrets table
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
  } catch (e) {
    console.warn(`secrets table lookup failed for ${name}:`, e);
  }

  // 2) Fallback to env
  const env = Deno.env.get(name);
  if (env) {
    cache.set(name, { value: env, exp: Date.now() + 60_000 });
    return env;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ELEVENLABS_API_KEY = await getSecret("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_API_KEY not found in secrets manager or environment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedVoice = voiceId || VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6, similarity_boost: 0.75, style: 0.3,
            use_speaker_boost: true, speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("ElevenLabs API error:", response.status, errBody);
      return new Response(JSON.stringify({ error: `ElevenLabs API error: ${response.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("TTS function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
