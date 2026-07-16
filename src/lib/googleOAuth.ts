import { supabase } from "@/integrations/supabase/client";
import { logAuthDiag } from "@/lib/authDiagnostics";

type OAuthResult =
  | { error: null; redirected: true }
  | { error: Error; redirected?: false };

/**
 * Google OAuth via native Supabase provider.
 *
 * Redirect target: production domain in prod, current origin otherwise.
 * The Supabase project's Google provider must allow-list both
 * https://techvinex.com and https://www.techvinex.com (plus preview origins)
 * under Authentication → URL Configuration → Redirect URLs.
 */
const resolveRedirectTo = (): string => {
  if (typeof window === "undefined") return "https://techvinex.com";
  const host = window.location.hostname;
  if (host === "techvinex.com" || host === "www.techvinex.com") {
    return `${window.location.origin}/`;
  }
  // Preview / localhost / lovable.app — return to current origin so the
  // session lands back in the same environment the user signed in from.
  return `${window.location.origin}/`;
};

export const signInWithGooglePopup = async (
  extraParams?: Record<string, string>,
  nextPath?: string,
): Promise<OAuthResult> => {
  try {
    const base = resolveRedirectTo();
    // If a `next` (same-origin relative path) is provided (OAuth consent flow),
    // send Google back to /auth/callback?next=... so the app finishes the
    // consent redirect after the session lands. Otherwise return to the app
    // root as before.
    const redirectTo = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : base;
    logAuthDiag("info", "google-oauth", "Starting Supabase Google OAuth", {
      origin: window.location.origin,
      redirectTo,
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: extraParams,
      },
    });


    if (error) {
      logAuthDiag("error", "google-oauth", error.message);
      return { error };
    }

    // Supabase triggers a full-page redirect to Google.
    return { error: null, redirected: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logAuthDiag("error", "google-oauth", err.message);
    return { error: err };
  }
};
