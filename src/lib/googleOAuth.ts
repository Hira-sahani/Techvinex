import { supabase } from "@/integrations/supabase/client";

type OAuthTokens = {
  access_token: string;
  refresh_token: string;
};

type OAuthResult =
  | { error: null; redirected?: false }
  | { error: null; redirected: true }
  | { error: Error; redirected?: false };

type OAuthMessage = {
  type?: string;
  response?: {
    state?: string;
    error?: string;
    error_description?: string;
    access_token?: string;
    refresh_token?: string;
  };
};

const LOVABLE_PROJECT_ID = "5c870c01-d303-4b5b-b158-8aff44bf54eb";
const OAUTH_BROKER_URL = "https://oauth.lovable.app/initiate";
const SUPPORTED_OAUTH_ORIGINS = new Set(["https://oauth.lovable.app", "https://lovable.dev"]);
const POPUP_CHECK_INTERVAL_MS = 500;
const OAUTH_TIMEOUT_MS = 120_000;

const createState = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint8Array(16))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const getPopupFeatures = () => {
  const width = Math.min(520, Math.max(360, Math.floor(window.outerWidth * 0.5)));
  const height = Math.min(720, Math.max(560, Math.floor(window.outerHeight * 0.75)));
  const left = Math.max(0, Math.floor(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.floor(window.screenY + (window.outerHeight - height) / 2));

  return `width=${width},height=${height},left=${left},top=${top},popup=yes`;
};

const buildOAuthUrl = (state: string, useWebMessage: boolean, extraParams?: Record<string, string>) => {
  const params = new URLSearchParams({
    ...extraParams,
    provider: "google",
    project_id: LOVABLE_PROJECT_ID,
    redirect_uri: window.location.origin,
    state,
  });

  if (useWebMessage) {
    params.set("response_mode", "web_message");
  }

  return `${OAUTH_BROKER_URL}?${params.toString()}`;
};

const parseOAuthResponse = (message: OAuthMessage, expectedState: string): OAuthTokens => {
  const response = message.response;

  if (!response || response.state !== expectedState) {
    throw new Error("Google sign-in state is invalid. Please try again.");
  }

  if (response.error) {
    throw new Error(response.error_description || response.error);
  }

  if (!response.access_token || !response.refresh_token) {
    throw new Error("Google sign-in did not return a session. Please try again.");
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  };
};

export const signInWithGooglePopup = async (extraParams?: Record<string, string>): Promise<OAuthResult> => {
  const state = createState();
  const popupUrl = buildOAuthUrl(state, true, extraParams);
  const popup = window.open(popupUrl, "techvinex-google-oauth", getPopupFeatures());

  if (!popup) {
    window.location.assign(buildOAuthUrl(state, false, extraParams));
    return { error: null, redirected: true };
  }

  popup.focus();

  try {
    const message = await new Promise<OAuthMessage>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error("Google sign-in timed out. Please try again."));
      }, OAUTH_TIMEOUT_MS);

      const closedIntervalId = window.setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error("Google sign-in was cancelled."));
        }
      }, POPUP_CHECK_INTERVAL_MS);

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        window.clearInterval(closedIntervalId);
        window.clearTimeout(timeoutId);
      };

      const onMessage = (event: MessageEvent<OAuthMessage>) => {
        if (!SUPPORTED_OAUTH_ORIGINS.has(event.origin)) return;
        if (!event.data || event.data.type !== "authorization_response") return;

        cleanup();
        resolve(event.data);
      };

      window.addEventListener("message", onMessage);
    });

    const tokens = parseOAuthResponse(message, state);
    const { error } = await supabase.auth.setSession(tokens);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  } finally {
    popup.close();
  }
};