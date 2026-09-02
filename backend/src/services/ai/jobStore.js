/**
 * jobStore.js
 * In-memory store for background bulk import jobs.
 * Manages job state and SSE (Server-Sent Events) client subscriptions.
 * No external queue dependency — works on single-server deployments.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

// ── Job store ────────────────────────────────────────────────
// Map<jobId, JobRecord>
const jobs = new Map();

// ── SSE client registry ──────────────────────────────────────
// Map<jobId, Set<res>>  — one job can have multiple SSE listeners (tabs)
const clients = new Map();

// Auto-cleanup: remove completed/failed jobs after 1 hour
const JOB_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      if (now - job.updatedAt > JOB_TTL_MS) {
        jobs.delete(id);
        clients.delete(id);
        logger.info(`[JobStore] Cleaned up stale job ${id}`);
      }
    }
  }
}, 5 * 60 * 1000); // run every 5 minutes

// ─────────────────────────────────────────────────────────────
// Job lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * Create a new job and return its ID.
 * @param {object} meta  { adminId, fileName, fileType, fileSizeKb }
 * @returns {string} jobId (UUID v4)
 */
function createJob(meta) {
  const jobId = uuidv4();
  jobs.set(jobId, {
    jobId,
    adminId: meta.adminId,
    fileName: meta.fileName,
    fileType: meta.fileType,
    fileSizeKb: meta.fileSizeKb,
    status: 'queued',   // queued | running | completed | failed | cancelled
    phase: 'queued',   // queued | analysing | extracting | deduplicating | saving | done
    progress: 0,          // 0-100
    total: 0,
    imported: 0,
    failed: 0,
    duplicates: 0,
    skipped: 0,
    missingAnswer: 0,
    missingExplanation: 0,
    formattingErrors: 0,
    errors: [],         // [{ question, reason }]
    result: null,       // final report JSON
    importLogId: null,
    startTime: Date.now(),
    updatedAt: Date.now(),
  });
  return jobId;
}

/**
 * Update job fields and broadcast SSE event to all subscribed clients.
 * @param {string} jobId
 * @param {object} patch  Fields to merge into job record
 */
function updateJob(jobId, patch) {
  const job = jobs.get(jobId);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
  broadcastToJob(jobId, job);
}

/** Get a job record by ID */
function getJob(jobId) {
  return jobs.get(jobId) || null;
}

/** Mark a job as cancelled */
function cancelJob(jobId) {
  updateJob(jobId, { status: 'cancelled', phase: 'cancelled' });
}

/** Check if a job has been cancelled */
function isCancelled(jobId) {
  return jobs.get(jobId)?.status === 'cancelled';
}

// ─────────────────────────────────────────────────────────────
// SSE client management
// ─────────────────────────────────────────────────────────────

/**
 * Register an SSE response object for a job.
 * Sends existing job state immediately.
 * @param {string} jobId
 * @param {object} res  Express response object (SSE stream)
 */
function addSSEClient(jobId, res) {
  if (!clients.has(jobId)) clients.set(jobId, new Set());
  clients.get(jobId).add(res);

  // Send current state immediately so client doesn't wait
  const job = jobs.get(jobId);
  if (job) sendSSEEvent(res, job);

  // Remove on disconnect
  res.on('close', () => removeSSEClient(jobId, res));
}

function removeSSEClient(jobId, res) {
  const set = clients.get(jobId);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(jobId);
  }
}

/** Send SSE event to all clients subscribed to a job */
function broadcastToJob(jobId, data) {
  const set = clients.get(jobId);
  if (!set || set.size === 0) return;
  for (const res of set) {
    try {
      sendSSEEvent(res, data);
    } catch {
      set.delete(res);
    }
  }
}

/** Write a single SSE data frame */
function sendSSEEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

module.exports = {
  createJob,
  updateJob,
  getJob,
  cancelJob,
  isCancelled,
  addSSEClient,
  removeSSEClient,
};
