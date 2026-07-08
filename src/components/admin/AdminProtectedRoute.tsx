import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import TechvinexLoader from "@/components/TechvinexLoader";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }

    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Fail closed on any role-lookup error.
          console.warn("[AdminProtectedRoute] role lookup failed:", error.message);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(data?.some((r: any) => r.role === "admin") ?? false);
      });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return <TechvinexLoader />;
  }

  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default AdminProtectedRoute;
