import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import JetraLoader from "@/components/JetraLoader";

const BenchmarkProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <JetraLoader />;
  if (!user) return <Navigate to="/benchmark/login" replace />;
  return <>{children}</>;
};

export default BenchmarkProtectedRoute;
