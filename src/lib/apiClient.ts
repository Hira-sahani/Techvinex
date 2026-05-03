import { supabase } from "@/integrations/supabase/client";

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
