/**
 * importService.js — AI Import System API calls
 * Supports both the legacy sync flow and the new bulk background flow.
 */
import api, { getAccessToken } from './api';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/$/, '')}/api`;

const importService = {
  // ── Legacy sync flow (≤ ~200 questions) ──────────────────────

  // Step 1: Upload file and get analysis/preview
  analyseFile: async (file, subjectId = null, onUploadProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (subjectId) formData.append('subject_id', subjectId);
    const { data } = await api.post('/import/analyse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 300000, // 5 min for large files
    });
    return data.data;
  },

  // Step 2: Generate AI explanations for questions missing them
  enhanceQuestions: async (questions) => {
    const { data } = await api.post('/import/enhance', { questions }, { timeout: 180000 });
    return data.data.questions;
  },

  // Step 3: Final import (legacy single-transaction)
  saveQuestions: async (questions, importLogId) => {
    const { data } = await api.post('/import/save', {
      questions,
      import_log_id: importLogId,
    }, { timeout: 600000 }); // 10 min for large batches
    return data.data;
  },

  // ── Bulk background flow (1,000+ questions) ──────────────────

  /**
   * Start a background bulk import job.
   * Returns { jobId, status: 'queued' } immediately.
   * @param {File}   file
   * @param {string} subjectId         — required, integer string
   * @param {string} questionCategory  — 'practice' | 'past_year'
   * @param {string|null} year         — required when questionCategory = 'past_year'
   * @param {Function} onUploadProgress
   */
  startBulkImport: async (file, subjectId, questionCategory, year = null, onUploadProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', subjectId);
    formData.append('question_category', questionCategory);
    if (year) formData.append('year', year);
    const { data } = await api.post('/import/bulk/start', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 120000,
    });
    return data.data; // { jobId, status }
  },

  /**
   * Subscribe to SSE progress stream for a bulk job.
   * Calls onEvent(jobState) on every update.
   * Calls onDone(finalResult) when status === 'completed'.
   * Calls onError(message) on failure.
   * Returns a cleanup function to close the SSE connection.
   *
   * Robustness:
   * - EventSource.onerror fires for transient network hiccups AND for auth
   *   failures. We give a 5-second grace period before treating it as fatal.
   * - If the SSE stream drops after the job has started, we fall back to
   *   polling GET /bulk/result/:id every 3 seconds so the admin still gets
   *   the final report even if the SSE connection was lost mid-way.
   */
  subscribeToProgress: (jobId, onEvent, onDone, onError) => {
    const token = getAccessToken();
    const url = `${BASE_URL}/import/bulk/progress/${jobId}?token=${encodeURIComponent(token || '')}`;
    const es = new EventSource(url, { withCredentials: true });

    let settled = false;
    let errorTimer = null;          // grace-period timer
    let pollInterval = null;        // polling fallback interval
    const RECONNECT_GRACE_MS = 5000; // wait 5s before treating onerror as fatal
    const POLL_INTERVAL_MS   = 3000; // poll every 3s as fallback

    const cleanup = () => {
      settled = true;
      clearTimeout(errorTimer);
      clearInterval(pollInterval);
      try { es.close(); } catch { /* ignore */ }
    };

    // ── Polling fallback ────────────────────────────────────
    // If SSE drops but the job is still running server-side, poll
    // the result endpoint until it returns completed or failed.
    const startPolling = () => {
      if (pollInterval) return; // already polling
      pollInterval = setInterval(async () => {
        if (settled) { clearInterval(pollInterval); return; }
        try {
          const result = await importService.getBulkResult(jobId);
          if (result) {
            clearInterval(pollInterval);
            if (!settled) {
              settled = true;
              onDone(result);
            }
          }
        } catch {
          // Job not finished yet — keep polling (404 = not completed)
        }
      }, POLL_INTERVAL_MS);
    };

    const finishWithError = (message) => {
      if (settled) return;
      cleanup();
      onError(message);
    };

    es.onmessage = (e) => {
      // Any message means the connection is alive — cancel any pending error timer
      clearTimeout(errorTimer);
      errorTimer = null;

      try {
        const state = JSON.parse(e.data);
        onEvent(state);

        if (state.status === 'completed') {
          if (!settled) {
            cleanup();
            onDone(state.result);
          }
        } else if (state.status === 'failed') {
          finishWithError(state.error || 'Import failed');
        } else if (state.status === 'cancelled') {
          finishWithError('Import was cancelled');
        }
      } catch {
        // Ignore transient parse issues (heartbeat comments arrive as empty data)
      }
    };

    es.onerror = () => {
      // onerror fires on reconnect attempts and transient blips — do NOT
      // treat the very first error as fatal. Wait for the grace period.
      // If we receive a message before the timer fires, we cancel the timer.
      if (settled) return;

      if (!errorTimer) {
        errorTimer = setTimeout(() => {
          errorTimer = null;
          if (settled) return;

          // SSE is genuinely dead. Switch to polling so the admin
          // still sees the result when the job finishes server-side.
          es.close();
          onEvent({ status: 'running', phase: 'processing', progress: -1,
            _notice: 'Live connection lost — polling for result...' });
          startPolling();

          // Give polling 3 minutes before declaring a hard failure
          setTimeout(() => {
            if (!settled) {
              clearInterval(pollInterval);
              finishWithError(
                'Connection to import server lost. Refresh to check status.'
              );
            }
          }, 3 * 60 * 1000);
        }, RECONNECT_GRACE_MS);
      }
    };

    return cleanup;
  },

  /**
   * Fetch the final result of a completed bulk job.
   */
  getBulkResult: async (jobId) => {
    const { data } = await api.get(`/import/bulk/result/${jobId}`);
    return data.data;
  },

  /**
   * Cancel a running or queued bulk job.
   */
  cancelBulkJob: async (jobId) => {
    const { data } = await api.post(`/import/bulk/cancel/${jobId}`);
    return data.data;
  },

  // ── Shared ────────────────────────────────────────────────────

  getLogs: async (params = {}) => {
    const { data } = await api.get('/import/logs', { params });
    return data;
  },

  getReport: async (logId) => {
    const { data } = await api.get(`/import/report/${logId}`);
    return data.data;
  },
};

export default importService;
