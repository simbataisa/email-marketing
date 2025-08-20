/**
 * Protected Route component
 * Redirects to login if user is not authenticated
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CircularProgress, Box } from '@mui/material';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, token, isLoading, getCurrentUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // If we have a token but no user, try to get current user
    if (token && !user && !isLoading) {
      getCurrentUser();
    }
  }, [token, user, isLoading, getCurrentUser]);

  // Show loading spinner while checking authentication
  if (isLoading || (token && !user)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin requirement
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}