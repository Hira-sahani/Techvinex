import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { signInWithGooglePopup } from "@/lib/googleOAuth";
import {
  clearAuthDiag,
  getAuthDiag,
  logAuthDiag,
  subscribeAuthDiag,
  type AuthDiagEntry,
} from "@/lib/authDiagnostics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString();

const AuthTestPage = () => {
  useDocumentMeta({
    title: "Auth Diagnostics | Techvinex",
    description: "Internal authentication diagnostics and Google OAuth test page.",
  });
  const { user, session, loading, isSessionExpired, logout } = useAuth();
  const [entries, setEntries] = useState<AuthDiagEntry[]>(getAuthDiag());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeAuthDiag(setEntries);
  }, []);

  useEffect(() => {
    logAuthDiag("info", "auth-test", "Page mounted", {
      origin: window.location.origin,
      href: window.location.href,
      ua: navigator.userAgent,
    });
  }, []);

  const handleGoogle = async () => {
    setBusy(true);
    logAuthDiag("info", "google-oauth", "Initiating Google sign-in popup");
    const result = await signInWithGooglePopup();
    if (result.error) {
      logAuthDiag("error", "google-oauth", result.error.message);
      toast.error(result.error.message);
    } else if ("redirected" in result && result.redirected) {
      logAuthDiag("warn", "google-oauth", "Popup blocked, redirecting full window");
    } else {
      logAuthDiag("info", "google-oauth", "Sign-in succeeded");
      toast.success("Signed in with Google");
    }
    setBusy(false);
  };

  const handleRefresh = async () => {
    setBusy(true);
    logAuthDiag("info", "session", "Manual refresh triggered");
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      logAuthDiag("error", "session", `Refresh failed: ${error.message}`);
      toast.error(error.message);
    } else {
      logAuthDiag("info", "session", "Refresh succeeded", {
        expires_at: data.session?.expires_at,
      });
      toast.success("Session refreshed");
    }
    setBusy(false);
  };

  const handleLogout = async () => {
    setBusy(true);
    logAuthDiag("info", "session", "Manual logout");
    await logout();
    toast.success("Signed out");
    setBusy(false);
  };

  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString()
    : "—";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Auth diagnostics</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Use this page to verify Google sign-in, session persistence, and refresh on
        production. Append <code>?authDebug=1</code> anywhere on the site to enable
        the floating session indicator.
      </p>

      <section className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Current state</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {loading
                ? "loading"
                : isSessionExpired
                ? "session expired"
                : user
                ? "signed in"
                : "signed out"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="break-all font-mono text-xs">{user?.id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Provider</dt>
            <dd>{user?.app_metadata?.provider ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Session expires</dt>
            <dd>{expiresAt}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Origin</dt>
            <dd className="break-all">{typeof window !== "undefined" ? window.location.origin : ""}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-6 flex flex-wrap gap-2">
        <Button onClick={handleGoogle} disabled={busy}>Sign in with Google</Button>
        <Button onClick={handleRefresh} variant="outline" disabled={busy || !session}>
          Refresh session
        </Button>
        <Button onClick={handleLogout} variant="outline" disabled={busy || !user}>
          Sign out
        </Button>
        <Button onClick={clearAuthDiag} variant="ghost">Clear log</Button>
        <Button asChild variant="ghost">
          <Link to="/">Back to home</Link>
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Diagnostics log ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="max-h-[420px] space-y-1 overflow-auto font-mono text-xs">
            {entries.slice().reverse().map((e, i) => (
              <li
                key={`${e.ts}-${i}`}
                className={
                  e.level === "error"
                    ? "text-destructive"
                    : e.level === "warn"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                }
              >
                <span className="text-muted-foreground">{formatTime(e.ts)}</span>{" "}
                <span className="text-muted-foreground">[{e.scope}]</span> {e.message}
                {e.data ? (
                  <span className="text-muted-foreground"> {JSON.stringify(e.data)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default AuthTestPage;
