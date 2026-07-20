import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

export function supabaseForUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL;
  // Independent Supabase projects only inject SUPABASE_ANON_KEY; Lovable Cloud
  // projects also inject SUPABASE_PUBLISHABLE_KEY. Prefer the publishable name
  // when present, otherwise fall back so tools work on either runtime.
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      `Missing Supabase env: url=${!!url} key=${!!key} (expected SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY|SUPABASE_ANON_KEY)`,
    );
  }
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuthenticated() {
  return { content: [{ type: "text" as const, text: "Not authenticated" }], isError: true as const };
}

export function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

/**
 * Best-effort rate limiter using the public.rate_limit_hit RPC.
 * Returns null when allowed, or an error result when the caller has exceeded
 * the configured budget within the window.
 */
export async function rateLimit(
  ctx: ToolContext,
  tool: string,
  { limit, windowMs }: { limit: number; windowMs: number },
) {
  const supabase = supabaseForUser(ctx);
  const key = `mcp:${tool}:${ctx.getUserId()}`;
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    _key: key,
    _window_ms: windowMs,
  });
  if (error) return null; // fail-open on limiter errors
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row.current_count === "number" && row.current_count > limit) {
    return errorResult(
      `Rate limit exceeded for ${tool}. Try again in ${Math.ceil((row.reset_ms ?? 0) / 1000)}s.`,
    );
  }
  return null;
}
