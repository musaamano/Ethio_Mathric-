/**
 * bulkImportController.js
 * Background bulk import pipeline with SSE progress streaming.
 * PostgreSQL version
 *
 * Routes:
 *   POST /api/import/bulk/start          → start job
 *   GET  /api/import/bulk/progress/:id   → SSE stream
 *   GET  /api/import/bulk/result/:id     → fetch final report
 *   POST /api/import/bulk/cancel/:id     → cancel job
 */
const path = require('path');
const fs   = require('fs');

const { extractText }       = require('../services/ai/fileParser');
const { parseQuestionsFromText, parseQuestionsFromRows, validateQuestion } = require('../services/ai/questionExtractor');
const { detectDuplicates }  = require('../services/ai/duplicateDetector');
const { insertInBatches }   = require('../services/ai/batchInserter');
const { createLog, updateLog } = require('../services/ai/importLogger');
const jobStore              = require('../services/ai/jobStore');
const { pool }              = require('../config/db');
const R                     = require('../utils/apiResponse');
const logger                = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// POST /api/import/bulk/start
// ─────────────────────────────────────────────────────────────
const startBulkImport = async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'No file uploaded');

    const { subject_id, question_category, year: rawYear } = req.body;

    // ── Validate subject_id (required) ───────────────────────
    if (!subject_id) {
      return R.badRequest(res, 'subject_id is required. Select a subject before importing.');
    }
    const subjectIdInt = parseInt(subject_id);
    if (isNaN(subjectIdInt) || subjectIdInt < 1) {
      return R.badRequest(res, 'Invalid subject_id.');
    }
    const { rows: subjectRows } = await pool.query(
      'SELECT id, name FROM subjects WHERE id = $1 AND is_active = TRUE',
      [subjectIdInt]
    );
    if (!subjectRows.length) {
      return R.badRequest(res, `Subject with id ${subjectIdInt} does not exist or is inactive.`);
    }
    const subjectName = subjectRows[0].name;

    // ── Validate question_category (required) ────────────────
    if (!question_category || !['practice', 'past_year'].includes(question_category)) {
      return R.badRequest(res, 'question_category must be "practice" or "past_year".');
    }

    // ── Derive the year to write to DB ───────────────────────
    let importYear = null;
    if (question_category === 'past_year') {
      const parsedYear = parseInt(rawYear);
      const currentYear = new Date().getFullYear();
      if (!rawYear || isNaN(parsedYear)) {
        return R.badRequest(res, 'year is required when question_category is "past_year".');
      }
      if (parsedYear < 1990 || parsedYear > currentYear + 2) {
        return R.badRequest(res, `year must be between 1990 and ${currentYear + 2}.`);
      }
      importYear = parsedYear;
    }
    // For practice: importYear stays null — intentional.

    const { buffer, originalname, size } = req.file;
    const ext = path.extname(originalname).toLowerCase().replace('.', '');

    const uploadDir = path.join(__dirname, '../../uploads/bulk');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, `${Date.now()}_${originalname}`);
    fs.writeFileSync(filePath, buffer);

    const jobId = jobStore.createJob({
      adminId:          req.user.id,
      fileName:         originalname,
      fileType:         ext,
      fileSizeKb:       Math.round(size / 1024),
      subjectId:        subjectIdInt,
      subjectName,
      questionCategory: question_category,
      importYear,
    });

    logger.info(
      `[BulkImport] Job ${jobId} created for ${originalname} by admin ${req.user.id} ` +
      `— subject: ${subjectName} (${subjectIdInt}), category: ${question_category}, year: ${importYear ?? 'NULL'}`
    );

    R.success(res, { jobId, status: 'queued' }, 'Bulk import job queued. Connect to SSE for progress.');

    setImmediate(() => runBulkPipeline(
      jobId, filePath, originalname, req.user.id,
      subjectIdInt, question_category, importYear
    ));

  } catch (err) {
    logger.error('[BulkImport] startBulkImport error:', err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// Background Pipeline
// ─────────────────────────────────────────────────────────────
async function runBulkPipeline(
  jobId, filePath, originalname, adminId,
  subjectId, questionCategory, importYear
) {
  const startTime = Date.now();
  let importLogId = null;

  const emit      = (patch) => jobStore.updateJob(jobId, patch);
  const cancelled = ()      => jobStore.isCancelled(jobId);

  try {
    emit({ status: 'running', phase: 'analysing', progress: 2 });

    const ext      = path.extname(originalname).toLowerCase().replace('.', '');
    const fileStat = fs.statSync(filePath);
    importLogId    = await createLog(adminId, originalname, ext, Math.round(fileStat.size / 1024), jobId);
    emit({ importLogId, progress: 5 });

    if (cancelled()) return cleanupFile(filePath);

    // PHASE 1: Extract
    emit({ phase: 'extracting', progress: 10 });
    let extracted;
    try {
      const buffer = fs.readFileSync(filePath);
      extracted = await extractText(buffer, originalname);
    } catch (parseErr) {
      await updateLog(importLogId, { status: 'failed', error_message: parseErr.message, completed_at: new Date() }).catch(() => {});
      emit({ status: 'failed', phase: 'failed', error: `Could not read file: ${parseErr.message}` });
      return cleanupFile(filePath);
    }
    emit({ progress: 20 });

    if (cancelled()) return cleanupFile(filePath);

    // PHASE 2: Parse
    emit({ phase: 'extracting', progress: 25 });
    let rawQuestions = [];
    if (extracted.rows?.length > 0) {
      rawQuestions = parseQuestionsFromRows(extracted.rows);
    } else {
      rawQuestions = parseQuestionsFromText(extracted.text);
    }

    if (rawQuestions.length === 0) {
      await updateLog(importLogId, { status: 'failed', error_message: 'No questions found', completed_at: new Date() }).catch(() => {});
      emit({ status: 'failed', phase: 'failed', error: 'No questions could be extracted.' });
      return cleanupFile(filePath);
    }

    emit({ total: rawQuestions.length, progress: 35 });
    await updateLog(importLogId, { total_found: rawQuestions.length });

    // ── Admin-selected metadata is authoritative ─────────────
    // subject_id and year come from the admin's import form.
    // The document content must NOT override them.
    // question_category = 'practice'  → year = NULL
    // question_category = 'past_year' → year = importYear
    rawQuestions = rawQuestions.map(q => ({
      ...q,
      subject_id: subjectId,             // always override — admin selection is final
      year:       importYear ?? null,    // NULL for practice, integer for past_year
    }));

    if (cancelled()) return cleanupFile(filePath);

    // PHASE 3: Duplicate detection
    emit({ phase: 'deduplicating', progress: 40 });
    const withDuplicates = await detectDuplicates(rawQuestions);
    emit({ progress: 60 });

    if (cancelled()) return cleanupFile(filePath);

    // PHASE 4: Validate
    let missingAnswer = 0, missingExplanation = 0, formattingErrors = 0;
    const toImport = [];
    const skipped  = [];

    for (const q of withDuplicates) {
      const errors = validateQuestion(q);
      q.errors = errors;
      if (q.duplicate?.action === 'skip') { skipped.push(q); continue; }

      // Guard: subject_id is NOT NULL in DB. Without this check one bad row
      // was poisoning the entire batch transaction (33 cascade failures).
      // Reject early with a clear reason instead of letting Postgres throw.
      if (!q.subject_id) {
        q.errors = [...errors, 'Missing subject — select a subject before importing or add a subject_id column to your file'];
        skipped.push(q);
        continue;
      }

      if (!q.correct_option)    missingAnswer++;
      if (!q.has_explanation)   missingExplanation++;
      if (errors.length > 0)    formattingErrors++;
      toImport.push(q);
    }

    const duplicateCount = withDuplicates.filter(q => q.duplicate).length;
    emit({ duplicates: duplicateCount, skipped: skipped.length, missingAnswer, missingExplanation, formattingErrors, progress: 65 });

    // PHASE 5: Batch insert
    emit({ phase: 'saving', progress: 70 });

    const { inserted, failed, failedItems } = await insertInBatches(
      toImport,
      adminId,
      (batchResult) => {
        if (cancelled()) return;
        const batchProgress = 70 + Math.round((batchResult.batchIndex / batchResult.totalBatches) * 28);
        emit({ progress: batchProgress, imported: batchResult.totalInserted, failed: batchResult.totalFailed });
      }
    );

    if (cancelled()) return cleanupFile(filePath);

    // PHASE 6: Finalise
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const job = jobStore.getJob(jobId);
    const finalResult = {
      total: rawQuestions.length,
      imported: inserted,
      failed,
      duplicates: duplicateCount,
      skipped: skipped.length,
      missingAnswer,
      missingExplanation,
      formattingErrors,
      failedItems:      failedItems.slice(0, 50),
      importTimeSec:    parseFloat(elapsedSec),
      // Import metadata for the report
      subjectName:      job?.subjectName || '',
      questionCategory: questionCategory,
      importYear:       importYear,
    };

    await updateLog(importLogId, {
      total_imported:   inserted,
      total_errors:     failed,
      total_skipped:    skipped.length,
      total_duplicates: duplicateCount,
      status:           'completed',
      completed_at:     new Date(),
      report_data:      JSON.stringify(finalResult),
    }).catch(() => {});

    emit({ status: 'completed', phase: 'done', progress: 100, result: finalResult });
    logger.info(`[BulkImport] Job ${jobId} completed: ${inserted} imported, ${failed} failed in ${elapsedSec}s`);

  } catch (err) {
    logger.error(`[BulkImport] Job ${jobId} pipeline error:`, err);
    if (importLogId) {
      await updateLog(importLogId, { status: 'failed', error_message: err.message, completed_at: new Date() }).catch(() => {});
    }
    emit({ status: 'failed', phase: 'failed', error: err.message });
  } finally {
    cleanupFile(filePath);
  }
}

function cleanupFile(filePath) {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────
// GET /api/import/bulk/progress/:jobId — SSE stream
// ─────────────────────────────────────────────────────────────
const getProgress = (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobStore.getJob(jobId);

    if (!job) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.adminId !== req.user.id && req.user.role_id !== 3) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.flushHeaders();

    // Disable Node's default socket inactivity timeout for this SSE connection.
    // By default Node closes idle sockets after 5 seconds in some environments,
    // which would kill a long-running import stream before it completes.
    res.socket?.setTimeout(0);
    res.socket?.setKeepAlive(true, 10000);

    // Reduce heartbeat to 10s (was 15s) so proxies/load-balancers don't
    // close the connection thinking it's idle.
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
    }, 10000);

    res.on('close', () => {
      clearInterval(heartbeat);
      jobStore.removeSSEClient(jobId, res);
    });

    jobStore.addSSEClient(jobId, res);
  } catch (err) {
    logger.error('[BulkImport] getProgress error:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ success: false, message: err.message });
    }
    res.end();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/import/bulk/result/:jobId
// ─────────────────────────────────────────────────────────────
const getResult = (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.getJob(jobId);
  if (!job)                     return R.notFound(res, 'Job not found');
  if (job.adminId !== req.user.id) return R.forbidden(res, 'Forbidden');
  if (job.status !== 'completed')  return R.badRequest(res, `Job is ${job.status}, not yet completed`);
  return R.success(res, job.result);
};

// ─────────────────────────────────────────────────────────────
// POST /api/import/bulk/cancel/:jobId
// ─────────────────────────────────────────────────────────────
const cancelJob = (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.getJob(jobId);
  if (!job)                        return R.notFound(res, 'Job not found');
  if (job.adminId !== req.user.id) return R.forbidden(res, 'Forbidden');
  jobStore.cancelJob(jobId);
  logger.info(`[BulkImport] Job ${jobId} cancelled by admin ${req.user.id}`);
  return R.success(res, { jobId, status: 'cancelled' });
};

module.exports = { startBulkImport, getProgress, getResult, cancelJob };
