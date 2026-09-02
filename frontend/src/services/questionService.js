/**
 * questionService.js
 * All question-related API calls — practice, submit, bookmarks, reports.
 */
import api from './api';

const questionService = {

  // ── Get questions list (admin) ──────────────────────────
  // params: { subject_id, difficulty, type, search, page, limit, category, year }
  // category: 'practice' → year IS NULL, 'past_year' → year IS NOT NULL
  // year: specific year number (e.g. 2025)
  getQuestions: async (params = {}) => {
    const { data } = await api.get('/questions', { params });
    return data; // { data: [...], pagination: {...} }
  },

  // ── Get single question with explanation ────────────────
  getQuestion: async (id) => {
    const { data } = await api.get(`/questions/${id}`);
    return data.data;
  },

  // ── Get practice questions ──────────────────────────────
  // params: { subject_id, year, mode, count }
  getPracticeQuestions: async (params = {}) => {
    const { data } = await api.get('/questions/practice', { params });
    return data.data;
  },

  // ── Submit practice answers ─────────────────────────────
  // payload: { answers: [{question_id, selected_option}], subject_id, mode, time_taken_secs }
  submitAnswers: async (payload) => {
    const { data } = await api.post('/questions/submit', payload);
    return data.data;
  },

  // ── Bookmark / unbookmark a question ───────────────────
  toggleBookmark: async (question_id) => {
    const { data } = await api.post('/questions/bookmark', { question_id });
    return data.data; // { bookmarked: true/false }
  },

  // ── Get all bookmarks for current user ──────────────────
  getBookmarks: async (params = {}) => {
    const { data } = await api.get('/questions/bookmarks', { params });
    return data;
  },

  // ── Report a question ───────────────────────────────────
  reportQuestion: async (payload) => {
    // payload: { question_id, reason, description? }
    const { data } = await api.post('/questions/report', payload);
    return data;
  },

  // ── Admin: create question ──────────────────────────────
  createQuestion: async (formData) => {
    // formData is FormData (includes optional image file)
    const { data } = await api.post('/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  // ── Admin: update question ──────────────────────────────
  updateQuestion: async (id, payload) => {
    const { data } = await api.put(`/questions/${id}`, payload);
    return data;
  },

  // ── Admin: delete question ──────────────────────────────
  deleteQuestion: async (id) => {
    const { data } = await api.delete(`/questions/${id}`);
    return data;
  },

  // ── Get available past-year years ──────────────────────
  // params: { subject_ids?: '1,2,3,4,5,6' } — comma-separated subject IDs
  getAvailableYears: async (params = {}) => {
    const { data } = await api.get('/questions/years', { params });
    return data.data; // number[]
  },

  // ── Admin: import from Excel/CSV ────────────────────────
  importQuestions: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/questions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};

export default questionService;
