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
  const [tests, setTests] = useState<{ name: string; status: "pass" | "fail" | "skip"; detail?: string }[]>([]);
  const [running, setRunning] = useState(false);

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

  const downloadLog = (format: "json" | "txt") => {
    const data = getAuthDiag();
    const content =
      format === "json"
        ? JSON.stringify(data, null, 2)
        : data
            .map((e) => `${e.ts} [${e.level}] [${e.scope}] ${e.message}${e.data ? " " + JSON.stringify(e.data) : ""}`)
            .join("\n");
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `techvinex-auth-diag-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    try {
      const data = getAuthDiag();
      const compact = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const url = `${window.location.origin}/auth-test?authDebug=1#diag=${compact}`;
      await navigator.clipboard.writeText(url);
      toast.success("Shareable debug link copied");
    } catch (e) {
      toast.error("Could not copy link");
    }
  };

  const runTests = async () => {
    setRunning(true);
    setTests([]);
    const results: typeof tests = [];
    const add = (name: string, status: "pass" | "fail" | "skip", detail?: string) => {
      results.push({ name, status, detail });
      setTests([...results]);
      logAuthDiag(status === "fail" ? "error" : "info", "test", `${name}: ${status}`, detail ? { detail } : undefined);
    };

    // 1. Supabase client reachable
    try {
      const { error } = await supabase.auth.getSession();
      add("Supabase client reachable", error ? "fail" : "pass", error?.message);
    } catch (e) {
      add("Supabase client reachable", "fail", String(e));
    }

    // 2. localStorage available (session persistence)
    try {
      localStorage.setItem("__authtest", "1");
      localStorage.removeItem("__authtest");
      add("localStorage writable (persistence)", "pass");
    } catch (e) {
      add("localStorage writable (persistence)", "fail", String(e));
    }

    // 3. Third-party cookies / popups available
    add(
      "Popups allowed (heuristic)",
      typeof window.open === "function" ? "pass" : "fail",
    );

    // 4. Session present
    if (!session) {
      add("Active session", "skip", "Not signed in — sign in then re-run");
    } else {
      add("Active session", "pass", `expires ${new Date(session.expires_at! * 1000).toLocaleString()}`);

      // 5. Token refresh works
      const { data, error } = await supabase.auth.refreshSession();
      add("Refresh token works", error ? "fail" : "pass", error?.message ?? `new exp ${data.session?.expires_at}`);

      // 6. User profile fetch
      const { data: u, error: uErr } = await supabase.auth.getUser();
      add("getUser() returns user", uErr || !u.user ? "fail" : "pass", uErr?.message);
    }

    setRunning(false);
  };

  // Restore shared diagnostics from URL hash
  useEffect(() => {
    const m = window.location.hash.match(/diag=([^&]+)/);
    if (!m) return;
    try {
      const decoded = decodeURIComponent(escape(atob(m[1])));
      const parsed = JSON.parse(decoded) as AuthDiagEntry[];
      if (Array.isArray(parsed)) {
        toast.info(`Loaded ${parsed.length} shared log entries (read-only)`);
        setEntries(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
        <Button onClick={runTests} variant="secondary" disabled={running}>
          {running ? "Running…" : "Run auth tests"}
        </Button>
        <Button onClick={() => downloadLog("json")} variant="ghost">Export JSON</Button>
        <Button onClick={() => downloadLog("txt")} variant="ghost">Export TXT</Button>
        <Button onClick={copyShareLink} variant="ghost">Copy share link</Button>
        <Button onClick={clearAuthDiag} variant="ghost">Clear log</Button>
        <Button asChild variant="ghost">
          <Link to="/">Back to home</Link>
        </Button>
      </section>

      {tests.length > 0 && (
        <section className="mb-6 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">Test results</h2>
          <ul className="space-y-1 text-sm">
            {tests.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={
                    "inline-block min-w-[44px] rounded px-2 py-0.5 text-center text-xs font-medium " +
                    (t.status === "pass"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : t.status === "fail"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {t.status}
                </span>
                <div>
                  <div>{t.name}</div>
                  {t.detail && <div className="text-xs text-muted-foreground">{t.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
