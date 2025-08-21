import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ADMIN_EMAIL = "avansardar@outlook.com";

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log("ProtectedAdminRoute:", {
    user,
    loading,
    location: location.pathname,
  });

  // Show loading while checking authentication
  if (loading) {
    console.log("ProtectedAdminRoute: Still loading...");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated and is the admin
  if (!user || user.email !== ADMIN_EMAIL) {
    console.log(
      "ProtectedAdminRoute: Access denied, redirecting to dashboard",
      { user: user?.email, required: ADMIN_EMAIL }
    );
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }

  // User is authenticated and is admin, render the protected content
  console.log("ProtectedAdminRoute: Access granted, rendering admin content");
  return children;
};

export default ProtectedAdminRoute;
