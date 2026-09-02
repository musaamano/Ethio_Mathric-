/**
 * userService.js
 * User profile, password, admin user management.
 */
import api from './api';

const userService = {

  // ── Get my profile ──────────────────────────────────────
  getProfile: async () => {
    const { data } = await api.get('/users/profile');
    return data.data;
  },

  // ── Update profile ──────────────────────────────────────
  // payload: FormData (includes optional avatar file)
  updateProfile: async (formData) => {
    const { data } = await api.put('/users/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ── Change password ─────────────────────────────────────
  changePassword: async (current_password, new_password) => {
    const { data } = await api.put('/users/change-password', {
      current_password,
      new_password,
    });
    return data;
  },

  // ── Admin: get all users ────────────────────────────────
  getAllUsers: async (params = {}) => {
    const { data } = await api.get('/users', { params });
    return data;
  },

  // ── Admin: toggle user active status ───────────────────
  toggleUserStatus: async (userId) => {
    const { data } = await api.put(`/users/${userId}/status`);
    return data;
  },

  // ── Admin: force logout a user ──────────────────────────
  forceLogout: async (userId) => {
    const { data } = await api.post(`/users/${userId}/force-logout`);
    return data;
  },

  // ── Super Admin: change user role ──────────────────────
  changeUserRole: async (userId, role_id) => {
    const { data } = await api.put(`/users/${userId}/role`, { role_id });
    return data;
  },
};

export default userService;
