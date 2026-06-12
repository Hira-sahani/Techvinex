// Returns the public Sentry DSN + env + release to the browser.
// The DSN is public by design (abuse protection lives in Sentry inbound filters).
// Public, no JWT — see config.toml.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Vary": "Origin",
  "Cache-Control": "public, max-age=300",
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
  const environment = Deno.env.get("SENTRY_ENVIRONMENT") ?? "production";
  const release = Deno.env.get("SENTRY_RELEASE") ?? "techvinex@unknown";

  return new Response(JSON.stringify({ dsn, environment, release }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
