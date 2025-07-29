// ProtectedRoute.tsx - Component to protect routes
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuthStatus } = useAuth();
  const location = useLocation();

  // Double-check authentication status
  const isAuth = checkAuthStatus();

  if (!isAuth && !isAuthenticated) {
    // Redirect to login page, saving the attempted location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
