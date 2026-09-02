/**
 * AuthContext.jsx
 * Global authentication state — login, logout, session restore, role helpers.
 */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';
import { setAccessToken, clearTokens, getAccessToken } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ────────────────────────────
  // React 18 StrictMode deliberately double-invokes effects in development.
  // Without a cancel flag, two simultaneous refresh requests fire:
  //   1st succeeds → DB rotates the token
  //   2nd arrives with the now-stale token → 401 "Session expired" → clearTokens()
  // The `cancelled` ref prevents the second invocation from overwriting state.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        // Try to get a new access token silently using the HttpOnly refresh token cookie
        const token = await authService.refreshToken();
        if (cancelled) return;          // StrictMode cleanup fired — discard result
        setAccessToken(token);
        localStorage.setItem('accessToken', token);

        // Fetch fresh profile
        const profile = await userService.getProfile();
        if (cancelled) return;
        setUser(profile);
        localStorage.setItem('user', JSON.stringify(profile));
      } catch {
        if (cancelled) return;          // Don't clear tokens from a discarded run
        // Token expired / invalid — silent fail, redirect handled by PrivateRoute
        clearTokens();
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restore();

    // Cleanup: mark this run as cancelled so an in-flight async chain
    // does not mutate state after the component remounts (StrictMode, HMR).
    return () => { cancelled = true; };
  }, []);

  // ── Login ───────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const { accessToken, user: userData } = response.data;
    setAccessToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    setUser(userData);
    return userData;
  }, []);

  // ── Logout ──────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  // ── Refresh user data (e.g. after profile update) ───────
  const updateUser = useCallback(async () => {
    try {
      const profile = await userService.getProfile();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      return profile;
    } catch { return null; }
  }, []);

  // ── Role helpers ─────────────────────────────────────────
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      isAuthenticated: !!user,
      isStudent, isAdmin, isSuperAdmin,
      login, logout, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
