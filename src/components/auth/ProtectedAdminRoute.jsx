import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user is authenticated and is the admin
  if (!user || user.email !== "avansardar@outlook.com") {
    // Redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and is admin, render the protected content
  return children;
};

export default ProtectedAdminRoute;
