import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import JetraLoader from "@/components/JetraLoader";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) return <JetraLoader />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
