import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";

// Beta auth.oauth namespace on supabase-js is not in the generated types yet.
// Keep a tiny typed wrapper here rather than reaching into the SDK internals.
type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function getOAuth(): OAuthNamespace | null {
  const ns = (supabase.auth as unknown as { oauth?: OAuthNamespace }).oauth;
  return ns ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const oauth = getOAuth();
      if (!oauth) {
        setError("OAuth is not available on this project. Please contact support.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const oauth = getOAuth();
    if (!oauth) return;
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-6">
        <div className="flex justify-center mb-4">
          <BrandLogo size={48} className="h-12 w-12" />
        </div>
        {error ? (
          <div className="text-center">
            <h1 className="text-base font-semibold mb-2">Could not load this request</h1>
            <p className="text-xs text-muted-foreground break-words">{error}</p>
          </div>
        ) : !details ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <h1 className="text-base font-semibold text-center mb-1">
              Connect {clientName} to Techvinex
            </h1>
            <p className="text-xs text-muted-foreground text-center mb-4">
              This lets {clientName} use Techvinex as you
              {userEmail ? ` (${userEmail})` : ""}.
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 mb-5 list-disc pl-5">
              <li>Share your basic profile</li>
              <li>Share your email address</li>
              <li>Call Techvinex tools while you are signed in</li>
            </ul>
            <p className="text-[11px] text-muted-foreground mb-5">
              This does not bypass Techvinex permissions or backend policies.
              Your existing access rules still apply.
            </p>
            <div className="flex flex-col gap-2">
              <Button disabled={busy} onClick={() => decide(true)} className="w-full h-10 text-sm">
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => decide(false)}
                className="w-full h-10 text-sm"
              >
                Cancel connection
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
