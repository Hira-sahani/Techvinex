// Returns the public Sentry DSN + env + release to the browser.
// The DSN is public by design (abuse protection lives in Sentry inbound filters).
// Public, no JWT — see config.toml. Env overrides: SENTRY_ENVIRONMENT, SENTRY_RELEASE.
import { RELEASE, ENVIRONMENT } from "../_shared/release.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "public, max-age=60",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const dsn = Deno.env.get("SENTRY_DSN") ?? "";
  // Env overrides win so hosted environments (staging/canary) can pin their own,
  // otherwise fall back to the build-time generated release shared with the frontend.
  const environment = Deno.env.get("SENTRY_ENVIRONMENT") ?? ENVIRONMENT;
  const release = Deno.env.get("SENTRY_RELEASE") ?? RELEASE;

  return new Response(JSON.stringify({ dsn, environment, release }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
