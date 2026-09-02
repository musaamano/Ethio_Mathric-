/**
 * api.js
 * Central Axios instance — JWT attach, silent refresh, global error handling.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Main instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

// ── Token helpers ──────────────────────────────────────────
const readStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

let inMemoryToken = readStoredToken();

export const getAccessToken = () => {
  if (!inMemoryToken) {
    const stored = readStoredToken();
    if (stored) inMemoryToken = stored;
  }
  return inMemoryToken;
};

export const setAccessToken = (t) => {
  inMemoryToken = t || null;
  if (typeof window !== 'undefined') {
    if (t) localStorage.setItem('accessToken', t);
    else localStorage.removeItem('accessToken');
  }
};

export const clearTokens = () => {
  inMemoryToken = null;
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
};

// ── Request interceptor: attach Bearer token ───────────────
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: silent token refresh on 401 ──────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Network error — no response at all
    if (!error.response) {
      return Promise.reject(
        new Error('Network error — please check your internet connection.')
      );
    }

    const { status } = error.response;

    // 401 — try silent token refresh
    if (status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data?.data?.accessToken;

        if (!newToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        setAccessToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();

        // Avoid redirect storms during initial session restore or when the user is already logged out.
        if (!original.url?.includes('/auth/refresh') && !original.url?.includes('/users/profile')) {
          const currentPath = window.location.pathname;
          if (currentPath !== '/login') {
            window.location.href = '/login';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 — forbidden, don't retry
    if (status === 403) {
      return Promise.reject(error);
    }

    // 429 — rate limited
    if (status === 429) {
      error.message = 'Too many requests. Please wait a moment and try again.';
      return Promise.reject(error);
    }

    // 500+ — server error
    if (status >= 500) {
      error.message = 'Server error. Please try again later.';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
