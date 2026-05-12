import { supabase } from "@/integrations/supabase/client";
import { logAuthDiag } from "@/lib/authDiagnostics";

type OAuthResult =
  | { error: null; redirected: true }
  | { error: Error; redirected?: false };

/**
 * Native Supabase Google OAuth — no Lovable broker in the runtime path.
 *
 * Requires (one-time setup in Supabase Dashboard → Authentication → Providers → Google):
 *   - Google Client ID + Secret saved
 *   - Site URL + Redirect URLs include your production / vercel / custom domains
 *   - In Google Cloud Console, authorized redirect URI:
 *       https://xfgyzcvrvgsntjenxecp.supabase.co/auth/v1/callback
 */
export const signInWithGooglePopup = async (
  extraParams?: Record<string, string>,
): Promise<OAuthResult> => {
  try {
    logAuthDiag("info", "google-oauth", "Starting native Supabase Google OAuth", {
      origin: window.location.origin,
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: extraParams,
      },
    });

    if (error) {
      logAuthDiag("error", "google-oauth", error.message);
      return { error };
    }

    logAuthDiag("info", "google-oauth", "Redirecting to Google", { url: data?.url });
    // Browser will navigate to Google; nothing more to do here.
    return { error: null, redirected: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logAuthDiag("error", "google-oauth", err.message);
    return { error: err };
  }
};
