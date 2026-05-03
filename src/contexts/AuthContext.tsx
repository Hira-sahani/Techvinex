import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Track the last known session so we can detect refresh failure
  // (TOKEN_REFRESHED w/ null session while a session was previously active).
  const previousSessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Refresh-failure path: Supabase emits TOKEN_REFRESHED with a null
      // session (or USER_UPDATED with no user) when the refresh token is
      // rejected. Surface a clear "session expired" message and clear state.
      const hadSession = !!previousSessionRef.current;
      const isRefreshFailure =
        hadSession && !newSession && (event === "TOKEN_REFRESHED" || event === "USER_UPDATED");

      if (isRefreshFailure) {
        toast.error("Your session has expired. Please sign in again.", {
          id: "session-expired",
        });
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      previousSessionRef.current = newSession;
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      previousSessionRef.current = initialSession;
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    previousSessionRef.current = null;
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!user,
      user,
      session,
      loading,
      login: () => {},
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
