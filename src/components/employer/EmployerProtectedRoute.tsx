import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import TechvinexLoader from "@/components/TechvinexLoader";

const EmployerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setHasAccess(false); return; }

    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Fail closed on any role-lookup error.
          console.warn("[EmployerProtectedRoute] role lookup failed:", error.message);
          setHasAccess(false);
          return;
        }
        setHasAccess(data?.some((r: any) => r.role === "employer" || r.role === "admin") ?? false);
      });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (authLoading || hasAccess === null) {
    return <TechvinexLoader />;
  }

  if (!user || !hasAccess) return <Navigate to="/employer/login" replace />;
  return <>{children}</>;
};

export default EmployerProtectedRoute;
