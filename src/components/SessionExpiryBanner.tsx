import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAuthDiag } from "@/lib/authDiagnostics";

/**
 * - Shows a warning banner when the access token is within WARN_MS of expiry.
 * - Triggers a silent supabase.auth.refreshSession() when within REFRESH_MS.
 * Supabase already auto-refreshes, but this provides a visible safety net.
 */
const WARN_MS = 5 * 60 * 1000; // 5 min before expiry → show banner
const REFRESH_MS = 2 * 60 * 1000; // 2 min before expiry → silent refresh
const TICK_MS = 30 * 1000;

const SessionExpiryBanner = () => {
  const { session } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : null;
  const remaining = expiresAtMs ? expiresAtMs - now : null;

  useEffect(() => {
    if (!session || remaining === null) return;
    if (remaining > REFRESH_MS || remaining <= 0) return;
    if (refreshing) return;

    setRefreshing(true);
    logAuthDiag("info", "auto-refresh", "Triggering silent refresh", { remainingMs: remaining });
    supabase.auth
      .refreshSession()
      .then(({ data, error }) => {
        if (error) logAuthDiag("error", "auto-refresh", error.message);
        else logAuthDiag("info", "auto-refresh", "Silent refresh ok", { expires_at: data.session?.expires_at });
      })
      .finally(() => setRefreshing(false));
  }, [remaining, session, refreshing]);

  if (!session || remaining === null) return null;
  if (remaining > WARN_MS || remaining <= 0) return null;

  const minutes = Math.max(1, Math.round(remaining / 60000));
  return (
    <div className="fixed inset-x-0 top-0 z-[9998] bg-amber-500/95 px-4 py-2 text-center text-xs font-medium text-amber-950 shadow">
      Your session will expire in ~{minutes}m. {refreshing ? "Refreshing…" : "We'll auto-refresh shortly."}
    </div>
  );
};

export default SessionExpiryBanner;
