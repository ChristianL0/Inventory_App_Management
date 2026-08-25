import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageSpinner } from "@/components/ui/Spinner";

/** Gates authenticated routes. Pass adminOnly to also require the admin role. */
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { session, role, loading } = useAuth();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (adminOnly && role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
