import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FunctionInvokeOptions = Parameters<typeof supabase.functions.invoke>[1];
type FunctionsResponse<T> = Awaited<ReturnType<typeof supabase.functions.invoke<T>>>;

/**
 * Global handler invoked whenever an authenticated apiFetch call returns 401.
 * Default behaviour signs the user out and surfaces a "session expired" toast,
 * mirroring the refresh-failure flow in AuthContext. Tests can override this
 * via `setUnauthorizedHandler` to assert the contract without touching the
 * real Supabase client.
 */
export type UnauthorizedHandler = (response: Response, input: RequestInfo | URL) => void | Promise<void>;

/**
 * Resolve the right login route for the area the user is currently in,
 * so e.g. an admin lands back on /admin/login rather than the generic /login.
 */
function resolveLoginPath(pathname: string): string {
  if (pathname.startsWith("/admin")) return "/admin/login";
  if (pathname.startsWith("/blog-dashboard")) return "/admin/login";
  if (pathname.startsWith("/employer")) return "/employer/login";
  if (pathname.startsWith("/benchmark")) return "/benchmark/login";
  return "/login";
}

let unauthorizedHandler: UnauthorizedHandler = async () => {
  // Avoid duplicate toasts on a burst of 401s by reusing a stable id.
  toast.error("Your session has expired. Please sign in again.", {
    id: "session-expired",
  });
  try {
    await supabase.auth.signOut();
  } catch {
    // signOut failures should not break callers — AuthContext also reacts to
    // the resulting auth state change, and the toast already informed the user.
  }

  // Redirect to the appropriate login screen so the user lands on a valid
  // session-recovery surface. Skip if we're already on a login page (avoid
  // redirect loops) and skip in non-browser environments.
  if (typeof window === "undefined") return;
  const current = window.location.pathname;
  if (current.endsWith("/login") || current === "/login") return;

  const loginPath = resolveLoginPath(current);
  const redirectTo = encodeURIComponent(current + window.location.search);
  window.location.assign(`${loginPath}?redirect=${redirectTo}`);
};

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

// In-flight de-duplication: if many calls 401 in parallel we only want
// to invoke the handler once per "burst" so we don't spam signOut/toasts.
let handling401: Promise<void> | null = null;

async function handleUnauthorized(response: Response, input: RequestInfo | URL) {
  if (handling401) return handling401;
  handling401 = Promise.resolve(unauthorizedHandler(response, input))
    .catch(() => {})
    .finally(() => {
      handling401 = null;
    });
  return handling401;
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * If true, when the first attempt returns 401 we try to refresh the
   * Supabase session ONCE and, on success, replay the request with the
   * fresh token. The replay goes through apiFetch again (with retry
   * disabled to prevent loops), which re-reads getSession at call time —
   * so the stale Authorization header from the first attempt can never
   * be reused.
   *
   * If the refresh fails or the replay still returns 401, the global
   * unauthorized handler runs (sign-out + redirect to login).
   *
   * Defaults to false to preserve existing call sites' behaviour.
   */
  retryOnUnauthorized?: boolean;
}

/**
 * Thin authenticated fetch wrapper used across the app.
 *
 * Reads the access token from the current Supabase session AT CALL TIME
 * (never caches it), so after a refresh failure / sign-out / token rotation
 * the next call automatically picks up the latest state. If there is no
 * active session, the call runs unauthenticated (no Authorization header) —
 * the server is responsible for returning 401 in that case.
 *
 * Any 401 response (whether the call attached a Bearer or not) triggers the
 * global unauthorized handler, which signs the user out and surfaces a
 * "session expired" message. The original Response is still returned so
 * callers can branch on it.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchOptions = {},
): Promise<Response> {
  const { retryOnUnauthorized, ...fetchInit } = init;

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const headers = new Headers(fetchInit.headers ?? {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    // Defense-in-depth: ensure no caller-supplied stale Authorization
    // header survives when there is no active session.
    headers.delete("Authorization");
  }

  const response = await fetch(input, { ...fetchInit, headers });

  if (response.status !== 401) return response;

  // --- 401 path ---
  if (retryOnUnauthorized) {
    // Try to refresh the session ONCE. On success, replay the request
    // through apiFetch (which re-reads getSession), guaranteeing the
    // stale token from the first attempt is never reused.
    let refreshed: string | null = null;
    try {
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      if (!error) {
        refreshed = refreshData.session?.access_token ?? null;
      }
    } catch {
      refreshed = null;
    }

    if (refreshed) {
      // Strip any Authorization the caller may have supplied so the
      // replay can only ever carry the freshly refreshed token (set
      // by the inner apiFetch from the live session).
      const replayHeaders = new Headers(fetchInit.headers ?? {});
      replayHeaders.delete("Authorization");
      replayHeaders.delete("authorization");

      const replay = await apiFetch(input, {
        ...fetchInit,
        headers: replayHeaders,
        retryOnUnauthorized: false, // hard cap: never loop
      });
      if (replay.status !== 401) return replay;
      // Replay still 401 — fall through to the unauthorized handler.
      void handleUnauthorized(replay, input);
      return replay;
    }
    // Refresh failed — fall through to the unauthorized handler.
  }

  // Fire-and-forget: don't block the caller from inspecting the response.
  void handleUnauthorized(response, input);
  return response;
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
