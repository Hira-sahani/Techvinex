import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import JetraLoaderInline from "@/components/JetraLoaderInline";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIsAdmin(data?.some((r: any) => r.role === "admin") ?? false);
      });
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <JetraLoaderInline />
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default AdminProtectedRoute;
