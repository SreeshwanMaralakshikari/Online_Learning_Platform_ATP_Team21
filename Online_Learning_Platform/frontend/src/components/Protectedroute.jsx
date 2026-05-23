import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="app-loader" />
          <span className="text-sm font-bold tracking-[0.18em] text-blue-700">
            authenticating...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === "STUDENT"
        ? "/student/dashboard"
        : user.role === "INSTRUCTOR"
        ? "/instructor/dashboard"
        : "/admin/dashboard";

    return <Navigate to={fallback} replace />;
  }

  return children ?? <Outlet />;
}
