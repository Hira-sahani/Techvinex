import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminHost } from "@/components/HostnameRouter";

const AuthRedirectHandler = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  const prevUser = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger on fresh login (user went from null to logged in)
    if (loading || !user || hasRedirected.current) return;
    if (prevUser.current === user.id) return;
    // On the admin subdomain, the AdminLogin page handles post-login routing
    // (into /admin/*). Skip the candidate-oriented redirect to /explore.
    if (isAdminHost()) return;

    // Don't redirect if email is not confirmed yet (signup without auto-confirm)
    if (!user.email_confirmed_at) return;

    // Don't redirect if user is already on a meaningful page (not root or login)
    const publicPaths = ["/", "/login"];
    if (!publicPaths.includes(location.pathname)) {
      prevUser.current = user.id;
      return;
    }

    const checkAndRedirect = async () => {
      hasRedirected.current = true;
      prevUser.current = user.id;

      // Check if this is a brand new user (created within the last 30 seconds)
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const now = Date.now();
      const isNewUser = (now - createdAt) < 30000; // 30 seconds

      if (isNewUser) {
        // New signup → go to onboarding
        navigate("/onboarding", { replace: true });
      } else {
        // Existing user login → go to explore
        navigate("/explore", { replace: true });
      }
    };

    checkAndRedirect();
  }, [user, loading, navigate, location.pathname]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      hasRedirected.current = false;
      prevUser.current = null;
    }
  }, [user]);

  return null;
};

export default AuthRedirectHandler;
