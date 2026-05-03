import { supabase } from "@/integrations/supabase/client";
import type { FunctionInvokeOptions, FunctionsResponse } from "@supabase/functions-js";

/**
 * Thin authenticated fetch wrapper used across the app.
 *
 * Reads the access token from the current Supabase session AT CALL TIME
 * (never caches it), so after a refresh failure / sign-out / token rotation
 * the next call automatically picks up the latest state. If there is no
 * active session, the call runs unauthenticated (no Authorization header) —
 * the server is responsible for returning 401 in that case.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers = new Headers(init.headers ?? {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    // Defense-in-depth: ensure no caller-supplied stale Authorization
    // header survives when there is no active session.
    headers.delete("Authorization");
  }

  return fetch(input, { ...init, headers });
}

/**
 * Authenticated wrapper around supabase.functions.invoke that reads the
 * current session AT CALL TIME and explicitly sets (or strips) the
 * Authorization header so a stale Bearer token from an old session can
 * never slip through after a refresh failure / sign-out.
 *
 * If there is no active session, any caller-supplied Authorization header
 * is stripped and the invocation runs unauthenticated. The edge function
 * is responsible for rejecting unauthenticated calls when needed.
 */
export async function apiInvoke<T = unknown>(
  functionName: string,
  options: FunctionInvokeOptions = {},
): Promise<FunctionsResponse<T>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  // Normalise caller-supplied headers into a plain object so we can
  // deterministically remove any Authorization variant.
  const incoming = new Headers((options.headers as HeadersInit | undefined) ?? {});
  incoming.delete("Authorization");
  incoming.delete("authorization");

  const headers: Record<string, string> = {};
  incoming.forEach((value, key) => {
    headers[key] = value;
  });

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers,
  });
}
