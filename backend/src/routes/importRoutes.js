/**
 * importRoutes.js
 * AI-powered question import endpoints.
 * All routes require admin or super_admin role.
 */
const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl     = require('../controllers/importController');
const bulkCtrl = require('../controllers/bulkImportController');

// ── Multer: accept files in memory (no disk write needed for analysis) ──
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.doc', '.dotx', '.txt', '.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Allowed: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max for bulk banks
});

const adminOnly = [authenticate, authorize('admin', 'super_admin')];

// ── Routes ────────────────────────────────────────────────────
// Step 1: Upload file, extract & analyse questions (returns preview)
router.post('/analyse',
  ...adminOnly,
  upload.single('file'),
  ctrl.analyseFile
);

// Step 2: Generate AI explanations for questions missing them
router.post('/enhance',
  ...adminOnly,
  ctrl.enhanceQuestions
);

// Step 3: Final save to database
router.post('/save',
  ...adminOnly,
  ctrl.saveQuestions
);

// Get import history logs
router.get('/logs',
  ...adminOnly,
  ctrl.getImportLogs
);

// Download specific import report
router.get('/report/:logId',
  ...adminOnly,
  ctrl.downloadReport
);

// ── Bulk Import Routes ────────────────────────────────────────
// Start a background bulk import job (returns jobId immediately)
router.post('/bulk/start',
  ...adminOnly,
  upload.single('file'),
  bulkCtrl.startBulkImport
);

// SSE stream: real-time progress for a bulk job
router.get('/bulk/progress/:jobId',
  ...adminOnly,
  bulkCtrl.getProgress
);

// Fetch final result/report for a completed job
router.get('/bulk/result/:jobId',
  ...adminOnly,
  bulkCtrl.getResult
);

// Cancel a running or queued job
router.post('/bulk/cancel/:jobId',
  ...adminOnly,
  bulkCtrl.cancelJob
);

module.exports = router;
