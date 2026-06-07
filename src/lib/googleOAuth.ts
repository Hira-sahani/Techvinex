import { lovable } from "@/integrations/lovable/index";
import { logAuthDiag } from "@/lib/authDiagnostics";

type OAuthResult =
  | { error: null; redirected: true }
  | { error: Error; redirected?: false };

/**
 * Google OAuth via Lovable Cloud Managed Social Login.
 * No Client ID/Secret setup needed — managed credentials are used by default.
 */
export const signInWithGooglePopup = async (
  extraParams?: Record<string, string>,
): Promise<OAuthResult> => {
  try {
    logAuthDiag("info", "google-oauth", "Starting Lovable managed Google OAuth", {
      origin: window.location.origin,
    });

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams,
    });

    if (result.error) {
      const err = result.error instanceof Error ? result.error : new Error(String(result.error));
      logAuthDiag("error", "google-oauth", err.message);
      return { error: err };
    }

    if (result.redirected) {
      logAuthDiag("info", "google-oauth", "Redirecting to Google");
      return { error: null, redirected: true };
    }

    // Tokens received and session set
    return { error: null, redirected: true };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logAuthDiag("error", "google-oauth", err.message);
    return { error: err };
  }
};
