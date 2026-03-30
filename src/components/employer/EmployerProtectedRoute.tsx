import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const EmployerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setHasAccess(false); return; }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setHasAccess(data?.some((r: any) => r.role === "employer" || r.role === "admin") ?? false);
      });
  }, [user, authLoading]);

  if (authLoading || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <JetraLoaderInline />
      </div>
    );
  }

  if (!user || !hasAccess) return <Navigate to="/employer/login" replace />;
  return <>{children}</>;
};

export default EmployerProtectedRoute;
