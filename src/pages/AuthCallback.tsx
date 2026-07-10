import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles the redirect from Supabase email confirmation links.
 * supabase-js has `detectSessionInUrl: true` by default and will parse the
 * hash/query params and set the session automatically. We wait for that,
 * then route the user based on account age.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      // Give supabase-js a tick to consume the URL hash / ?code param.
      const { data: { session } } = await supabase.auth.getSession();

      // If not yet, listen briefly for SIGNED_IN.
      if (!session) {
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
          if (s && !cancelled) {
            sub.subscription.unsubscribe();
            void route(s.user);
          }
        });
        // Fallback timeout
        setTimeout(async () => {
          if (cancelled) return;
          const { data: { session: s2 } } = await supabase.auth.getSession();
          if (s2) {
            sub.subscription.unsubscribe();
            void route(s2.user);
          } else {
            sub.subscription.unsubscribe();
            setMessage("Confirmation link is invalid or has expired.");
            toast.error("Could not confirm email. Please try signing in.");
            setTimeout(() => navigate("/login", { replace: true }), 1500);
          }
        }, 4000);
        return;
      }
      await route(session.user);
    };

    const route = async (user: { id: string; created_at?: string }) => {
      if (cancelled) return;
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const isNewUser = Date.now() - createdAt < 5 * 60 * 1000; // within 5 min of creation
      toast.success("Email confirmed. Welcome to Techvinex!");
      navigate(isNewUser ? "/onboarding" : "/explore", { replace: true });
    };

    void finish();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
