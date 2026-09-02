/**
 * PrivateRoute.jsx
 * Protects student routes — redirects to /login if not authenticated.
 * Shows a loading screen while auth is being checked.
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={
 *     <PrivateRoute>
 *       <DashboardHome />
 *     </PrivateRoute>
 *   } />
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Still checking localStorage / token validity
  if (isLoading) {
    return <LoadingSpinner variant="page" text="Checking your session..." />;
  }

  // Not logged in — redirect to login, preserving the intended URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
