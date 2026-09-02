/**
 * AdminRoute.jsx
 * Protects admin-only routes.
 * Redirects non-admins to /dashboard (students) or /login (unauthenticated).
 *
 * Usage in App.jsx:
 *   <Route path="/admin" element={
 *     <AdminRoute>
 *       <AdminDashboard />
 *     </AdminRoute>
 *   } />
 *
 *   // Super-admin only:
 *   <Route path="/admin/settings" element={
 *     <AdminRoute superAdminOnly>
 *       <AdminSettings />
 *     </AdminRoute>
 *   } />
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children, superAdminOnly = false }) {
  const { isAuthenticated, isAdmin, isSuperAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner variant="page" text="Checking permissions..." />;
  }

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Super-admin-only route — regular admin gets redirected to admin dashboard
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
