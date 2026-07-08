import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TechvinexLoader from "@/components/TechvinexLoader";

const BlogDashboardProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin(data?.some((r: any) => r.role === "admin") ?? false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || isAdmin === null) return <TechvinexLoader />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default BlogDashboardProtectedRoute;
