import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import TechvinexLoader from "@/components/TechvinexLoader";

const BenchmarkProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <TechvinexLoader />;
  if (!user) return <Navigate to="/benchmark/login" replace />;
  return <>{children}</>;
};

export default BenchmarkProtectedRoute;
