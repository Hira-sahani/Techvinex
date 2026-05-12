import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Small floating chip that shows current auth/session status.
 * Helpful for diagnosing production OAuth/session issues quickly.
 * Hidden by default; show when ?authDebug=1 is in the URL or
 * localStorage flag `techvinex.authDebug` === "1".
 */
const SessionStatusIndicator = () => {
  const { user, session, loading, isSessionExpired } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const flag =
        params.get("authDebug") === "1" ||
        localStorage.getItem("techvinex.authDebug") === "1";
      if (params.get("authDebug") === "1") {
        localStorage.setItem("techvinex.authDebug", "1");
      }
      if (params.get("authDebug") === "0") {
        localStorage.removeItem("techvinex.authDebug");
      }
      setVisible(flag);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  const status = loading
    ? { label: "checking…", color: "bg-muted text-muted-foreground" }
    : isSessionExpired
    ? { label: "expired", color: "bg-destructive text-destructive-foreground" }
    : user
    ? { label: "signed in", color: "bg-primary text-primary-foreground" }
    : { label: "signed out", color: "bg-secondary text-secondary-foreground" };

  const expiresIn = session?.expires_at
    ? Math.max(0, session.expires_at * 1000 - Date.now())
    : null;

  return (
    <Link
      to="/auth-test"
      className="fixed bottom-3 right-3 z-[9999] rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs shadow-md backdrop-blur hover:bg-background"
      title="Open auth diagnostics"
    >
      <span className={`mr-2 inline-block rounded-full px-2 py-0.5 ${status.color}`}>
        {status.label}
      </span>
      {user?.email ? <span className="text-muted-foreground">{user.email}</span> : null}
      {expiresIn !== null ? (
        <span className="ml-2 text-muted-foreground">
          · {Math.round(expiresIn / 60000)}m
        </span>
      ) : null}
    </Link>
  );
};

export default SessionStatusIndicator;
