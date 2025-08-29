import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log("_ProtectedAdminRoute: ", {
    user,
    loading,
    isAdmin,
    _location: location.pathname,
  });

  // Show loading while checking authentication
  if (loading) {
    console.log("_ProtectedAdminRoute: Still loading...");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated and is admin
  if (!user || !isAdmin) {
    console.log(
      "_ProtectedAdminRoute: Access denied, redirecting to dashboard",
      { _user: user?.email, isAdmin }
    );
    return <Navigate to="/dashboard" state={{ _from: location }} replace />;
  }

  // User is authenticated and is admin, render the protected content
  console.log("_ProtectedAdminRoute: Access granted, rendering admin content");
  return children;
};

export default ProtectedAdminRoute;
