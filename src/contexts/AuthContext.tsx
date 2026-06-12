import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { onSessionExpired, type SessionExpiredEvent } from "@/lib/apiClient";
import { logAuthDiag } from "@/lib/authDiagnostics";
import { setRealtimeUser } from "@/lib/realtimeBus";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when apiFetch (or a refresh-failure event) detected an expired session. */
  isSessionExpired: boolean;
  /** The most recent session-expired event (timestamp + endpoint), if any. */
  sessionExpiredEvent: SessionExpiredEvent | null;
  /** Clear the session-expired flag (e.g. when the user re-authenticates or dismisses the surface). */
  dismissSessionExpired: () => void;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredEvent, setSessionExpiredEvent] = useState<SessionExpiredEvent | null>(null);
  // Track the last known session so we can detect refresh failure
  // (TOKEN_REFRESHED w/ null session while a session was previously active).
  const previousSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      logAuthDiag("info", "auth-state", event, {
        hasSession: !!newSession,
        userId: newSession?.user?.id,
        provider: newSession?.user?.app_metadata?.provider,
      });
      // Refresh-failure path: Supabase emits TOKEN_REFRESHED with a null
      // session (or USER_UPDATED with no user) when the refresh token is
      // rejected. Surface a clear "session expired" message and clear state.
      const hadSession = !!previousSessionRef.current;
      const isRefreshFailure =
        hadSession && !newSession && (event === "TOKEN_REFRESHED" || event === "USER_UPDATED");

      if (isRefreshFailure) {
        logAuthDiag("error", "auth-state", "Refresh failure detected (session lost)");
        try {
          Sentry.captureMessage("auth.refresh_failed", {
            level: "warning",
            tags: { source: "auth_state_change" },
          });
        } catch { /* noop */ }
        toast.error("Your session has expired. Please sign in again.", {
          id: "session-expired",
        });
        setSessionExpiredEvent({
          timestamp: new Date().toISOString(),
          endpoint: "auth:refresh",
        });
      }

      // A successful sign-in clears the expired flag automatically.
      if (event === "SIGNED_IN" && newSession) {
        setSessionExpiredEvent(null);
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      previousSessionRef.current = newSession;
      // Route the shared user-scope Realtime channel to the new identity.
      setRealtimeUser(newSession?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      logAuthDiag("info", "auth-init", "Initial session loaded", {
        hasSession: !!initialSession,
        userId: initialSession?.user?.id,
      });
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      previousSessionRef.current = initialSession;
      setRealtimeUser(initialSession?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to apiFetch's session-expired bus so a 401 from any
  // authenticated request flips the same UI flag.
  useEffect(() => {
    const unsubscribe = onSessionExpired((event) => {
      setSessionExpiredEvent(event);
    });
    return unsubscribe;
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpiredEvent(null);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSessionExpiredEvent(null);
    previousSessionRef.current = null;
    setRealtimeUser(null);
  }, []);

  const login = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      isLoggedIn: !!user,
      user,
      session,
      loading,
      isSessionExpired: !!sessionExpiredEvent,
      sessionExpiredEvent,
      dismissSessionExpired,
      login,
      logout,
    }),
    [user, session, loading, sessionExpiredEvent, dismissSessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
