/**
 * useAuth.js
 * Convenience hook to access AuthContext from any component.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useAuth();
 */
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return context;
}

export default useAuth;
