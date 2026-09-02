/**
 * authService.js
 * All authentication API calls — register, login, logout,
 * forgot/reset password, email verification, session management.
 */
import api from './api';

const authService = {
  // ── Register new student ────────────────────────────────
  register: async (payload) => {
    // payload: { first_name, last_name, email, password, phone?, stream?, school?, region? }
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  // ── Login ───────────────────────────────────────────────
  login: async (payload) => {
    // payload: { email, password, device_id?, remember_me? }
    const { data } = await api.post('/auth/login', payload);
    return data; // { accessToken, user: { id, first_name, ... , role } }
  },

  // ── Logout ──────────────────────────────────────────────
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // ignore — still clear local state
    }
  },

  // ── Refresh access token (called automatically by interceptor) ──
  refreshToken: async () => {
    const { data } = await api.post('/auth/refresh');
    return data.data.accessToken;
  },

  // ── Forgot password ─────────────────────────────────────
  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  // ── Reset password with token ───────────────────────────
  resetPassword: async (token, password) => {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  },

  // ── Verify email ────────────────────────────────────────
  verifyEmail: async (token) => {
    const { data } = await api.get(`/auth/verify-email/${token}`);
    return data;
  },

  // ── Get active sessions for current user ────────────────
  getSessions: async () => {
    const { data } = await api.get('/auth/sessions');
    return data.data;
  },

  // ── Resend verification email ───────────────────────────
  resendVerification: async (email) => {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  },
};

export default authService;
