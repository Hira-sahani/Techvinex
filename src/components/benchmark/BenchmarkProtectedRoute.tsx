import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TechvinexLoader from "@/components/TechvinexLoader";

type BenchmarkRole = "admin" | "reviewer" | "viewer";

interface Props {
  children: React.ReactNode;
  /**
   * Roles allowed to view the wrapped content. Defaults to all benchmark roles
   * (admin, reviewer, viewer). Pass a narrower list to lock down admin/reviewer
   * only surfaces.
   */
  requiredRoles?: BenchmarkRole[];
}

const DEFAULT_ROLES: BenchmarkRole[] = ["admin", "reviewer", "viewer"];

const BenchmarkProtectedRoute = ({ children, requiredRoles = DEFAULT_ROLES }: Props) => {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r: any) => r.role as string);
        setAllowed(roles.some((r) => (requiredRoles as string[]).includes(r)));
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, requiredRoles]);

  if (loading || allowed === null) return <TechvinexLoader />;
  if (!user || !allowed) return <Navigate to="/benchmark/login" replace />;
  return <>{children}</>;
};

export default BenchmarkProtectedRoute;
