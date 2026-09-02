/**
 * paymentService.js
 * Subscription plans, payment initiation, subscription status.
 */
import api from './api';

const paymentService = {

  // ── Get all subscription plans ──────────────────────────
  getPlans: async () => {
    const { data } = await api.get('/payments/plans');
    return data.data;
  },

  // ── Get current user's active subscription ──────────────
  getMySubscription: async () => {
    const { data } = await api.get('/payments/my-subscription');
    return data.data; // null if no active subscription
  },

  // ── Initiate payment ────────────────────────────────────
  // payload: { plan_id, gateway: 'chapa' | 'telebirr' | 'santimpay' }
  initiatePayment: async (payload) => {
    const { data } = await api.post('/payments/initiate', payload);
    return data.data; // { checkout_url, tx_ref, amount, gateway, instructions }
  },

  // ── Admin: get all payments ─────────────────────────────
  // params: { status?, gateway?, page, limit }
  getAllPayments: async (params = {}) => {
    const { data } = await api.get('/payments', { params });
    return data;
  },

  // ── Admin: approve a manual payment ────────────────────
  approvePayment: async (paymentId) => {
    const { data } = await api.post(`/payments/${paymentId}/approve`);
    return data;
  },
};

export default paymentService;
