import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

// Redirects to login if user is not authenticated
export default function ProtectedRoute() {
  const { isAuthenticated, token } = useAuthStore();

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
