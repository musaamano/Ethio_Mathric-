/**
 * analyticsService.js
 * Student progress, leaderboard, history, admin analytics.
 */
import api from './api';

const analyticsService = {

  // ── Student: full dashboard overview ───────────────────
  getStudentOverview: async () => {
    const { data } = await api.get('/analytics/overview');
    return data.data;
    // Returns: { overview, subjectStats, weeklyProgress, monthlyProgress, streak, bookmarks }
  },

  // ── Student: exam / practice history ───────────────────
  // params: { page, limit }
  getHistory: async (params = {}) => {
    const { data } = await api.get('/analytics/history', { params });
    return data;
  },

  // ── Leaderboard ─────────────────────────────────────────
  // params: { period: 'daily'|'weekly'|'monthly'|'all', stream?, limit }
  getLeaderboard: async (params = {}) => {
    const { data } = await api.get('/analytics/leaderboard', { params });
    return data.data;
  },

  // ── Admin: site-wide analytics ──────────────────────────
  getAdminAnalytics: async () => {
    const { data } = await api.get('/analytics/admin');
    return data.data;
    // Returns: { users, questions, revenue, subscriptions, signupsLast7 }
  },
};

export default analyticsService;
