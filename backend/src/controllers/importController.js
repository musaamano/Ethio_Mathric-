/**
 * importController.js
 * AI-powered question import workflow (preview/save flow)
 * PostgreSQL version
 */
const { extractText }             = require('../services/ai/fileParser');
const { parseQuestionsFromText, parseQuestionsFromRows, validateQuestion } = require('../services/ai/questionExtractor');
const { detectDuplicates }        = require('../services/ai/duplicateDetector');
const { generateExplanation }     = require('../services/ai/aiEnhancer');
const { createLog, updateLog, getLogs } = require('../services/ai/importLogger');
const { pool }                    = require('../config/db');
const R                           = require('../utils/apiResponse');
const logger                      = require('../utils/logger');
const path                        = require('path');
const fs                          = require('fs');

// ─────────────────────────────────────────────────────────────
// STEP 1: UPLOAD & ANALYSE — returns questions for preview
// POST /api/import/analyse
// ─────────────────────────────────────────────────────────────
const analyseFile = async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'No file uploaded');

    const { subject_id, question_category, year: rawYear } = req.body;

    // ── Validate admin-selected metadata (same rules as bulk start) ──
    if (!subject_id) {
      return R.badRequest(res, 'subject_id is required.');
    }
    const subjectIdInt = parseInt(subject_id);
    if (isNaN(subjectIdInt) || subjectIdInt < 1) return R.badRequest(res, 'Invalid subject_id.');
    const { rows: subjectRows } = await pool.query(
      'SELECT id, name FROM subjects WHERE id = $1 AND is_active = TRUE', [subjectIdInt]
    );
    if (!subjectRows.length) return R.badRequest(res, `Subject ${subjectIdInt} not found.`);

    if (!question_category || !['practice', 'past_year'].includes(question_category)) {
      return R.badRequest(res, 'question_category must be "practice" or "past_year".');
    }

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

    const { buffer, originalname, size } = req.file;
    const ext = path.extname(originalname).toLowerCase().replace('.', '');

    const importLogId = await createLog(req.user.id, originalname, ext, Math.round(size / 1024));
    logger.info(`Import started: ${originalname} by admin ${req.user.id} — subject:${subjectIdInt} category:${question_category} year:${importYear}`);

    let extracted;
    try {
      extracted = await extractText(buffer, originalname);
    } catch (parseErr) {
      await updateLog(importLogId, { status: 'failed', error_message: parseErr.message, completed_at: new Date() });
      return R.badRequest(res, `Could not read file: ${parseErr.message}`);
    }

    let rawQuestions = [];
    if (extracted.rows && extracted.rows.length > 0) {
      rawQuestions = parseQuestionsFromRows(extracted.rows);
    } else {
      rawQuestions = parseQuestionsFromText(extracted.text);
    }

    if (rawQuestions.length === 0) {
      await updateLog(importLogId, { status: 'failed', error_message: 'No questions found', completed_at: new Date() });
      return R.badRequest(res, 'No questions could be extracted from this file. Check the format matches the template.');
    }

    // Admin-selected metadata is authoritative — stamp every question
    rawQuestions = rawQuestions.map(q => ({
      ...q,
      subject_id: subjectIdInt,
      year:       importYear ?? null,
    }));

    const withDuplicates = await detectDuplicates(rawQuestions);
    const withValidation = withDuplicates.map(q => ({
      ...q,
      errors: validateQuestion(q),
    }));

    // Load subjects list for the UI selector (still useful in the preview)
    const { rows: subjects } = await pool.query(
      'SELECT id, name, slug FROM subjects WHERE is_active = TRUE'
    );

    const summary = {
      import_log_id:       importLogId,
      file_name:           originalname,
      file_type:           ext,
      total_found:         withValidation.length,
      valid:               withValidation.filter(q => q.errors.length === 0 && !q.duplicate).length,
      with_errors:         withValidation.filter(q => q.errors.length > 0).length,
      duplicates:          withValidation.filter(q => q.duplicate).length,
      missing_explanation: withValidation.filter(q => !q.has_explanation).length,
      // Report what was applied
      subject_name:        subjectRows[0].name,
      question_category,
      import_year:         importYear,
    };

    await updateLog(importLogId, { total_found: summary.total_found });

    return R.success(res, {
      summary,
      questions: withValidation,
      subjects,
    }, `Found ${summary.total_found} questions. Review before importing.`);

  } catch (err) {
    logger.error('Import analyse error:', err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// STEP 2: ENHANCE — Generate AI explanations
// POST /api/import/enhance
// ─────────────────────────────────────────────────────────────
const enhanceQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!questions?.length) return R.badRequest(res, 'No questions provided');

    const enhanced = await Promise.all(
      questions.slice(0, 50).map(async (q) => {
        if (q.has_explanation) return q;
        const explanation = await generateExplanation(q);
        return { ...q, explanation, has_explanation: true };
      })
    );

    return R.success(res, { questions: enhanced }, 'Explanations generated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// STEP 3: FINAL IMPORT — Save approved questions to DB
// POST /api/import/save
// ─────────────────────────────────────────────────────────────
const saveQuestions = async (req, res, next) => {
  const { questions, import_log_id } = req.body;
  if (!questions?.length) return R.badRequest(res, 'No questions to save');

  let imported = 0, failed = 0, skipped = 0;
  const errors = [];

  // Acquire a single client so all inserts share one connection.
  // We use per-question try/catch inside the loop (not a single wrapping
  // transaction) so one bad question never blocks the rest. For the
  // interactive /save flow this is the right trade-off — preview → save
  // means the admin already reviewed the questions.
  const { getClient } = require('../config/db');
  const client = await getClient();

  try {
    for (const q of questions) {
      if (q.skip || (q.errors?.length > 0 && q.force_skip)) { skipped++; continue; }

      // Guard: reject before hitting the DB NOT NULL constraint
      if (!q.subject_id) {
        failed++;
        errors.push({ question: q.question_text?.slice(0, 60), error: 'Missing subject_id — assign a subject before saving' });
        continue;
      }

      if (q.duplicate) {
        if (q.duplicate.action === 'skip') { skipped++; continue; }
        if (q.duplicate.action === 'replace') {
          await client.query(
            'UPDATE questions SET is_active = FALSE WHERE id = $1',
            [q.duplicate.existing_id]
          );
        }
      }

      try {
        await client.query('BEGIN');

        const { rows: qResult } = await client.query(
          `INSERT INTO questions
             (subject_id, type, question_text,
              difficulty, exam_importance, year, is_free, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id`,
          [
            q.subject_id      || null,
            q.type            || 'multiple_choice',
            q.question_text,
            q.difficulty      || 'medium',
            q.exam_importance || 'medium',
            q.year            ?? null,   // NULL = practice, integer = past_year
            q.is_free         || false,
            req.user.id,
          ]
        );
        const qId = qResult[0].id;

        // Bulk INSERT options — one query instead of per-option loop
        const validOpts = (q.options || []).filter(o => o.text);
        if (validOpts.length > 0) {
          const vals = []; const params = []; let p = 1;
          for (let i = 0; i < validOpts.length; i++) {
            const opt = validOpts[i];
            vals.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4})`);
            params.push(qId, opt.label, opt.text, opt.label === q.correct_option, i);
            p += 5;
          }
          await client.query(
            `INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES ${vals.join(',')}`,
            params
          );
        }

        // Only use explanation supplied in the document — never invent one.
        const expl = q.has_explanation && q.explanation ? q.explanation : null;
        await client.query(
          `INSERT INTO explanations
             (question_id, why_correct, why_a_wrong, why_b_wrong,
              why_c_wrong, why_d_wrong, memory_trick, common_mistake, reference)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            qId,
            expl?.why_correct    || '',
            expl?.why_a_wrong    || null,
            expl?.why_b_wrong    || null,
            expl?.why_c_wrong    || null,
            expl?.why_d_wrong    || null,
            expl?.memory_trick   || null,
            expl?.common_mistake || null,
            expl?.reference      || null,
          ]
        );

        await client.query('COMMIT');
        imported++;
      } catch (insertErr) {
        await client.query('ROLLBACK').catch(() => {});
        failed++;
        errors.push({ question: q.question_text?.slice(0, 60), error: insertErr.message });
        logger.warn(`Failed to import question: ${insertErr.message}`);
      }
    }
  } finally {
    client.release();
  }

  if (import_log_id) {
    await updateLog(import_log_id, {
      total_imported:   imported,
      total_errors:     failed,
      total_skipped:    skipped,
      total_duplicates: questions.filter(q => q.duplicate).length,
      status:           'completed',
      completed_at:     new Date(),
      report_data:      JSON.stringify({ imported, failed, skipped, errors }),
    }).catch(() => {});
  }

  return R.success(res, {
    imported, failed, skipped,
    total:  questions.length,
    errors: errors.slice(0, 20),
  }, `Import complete. ${imported} questions added successfully.`);
};

// ─────────────────────────────────────────────────────────────
// GET IMPORT HISTORY
// ─────────────────────────────────────────────────────────────
const getImportLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { rows, total } = await getLogs(req.user.id, parseInt(page), parseInt(limit));
    return R.paginated(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────
// DOWNLOAD IMPORT REPORT
// ─────────────────────────────────────────────────────────────
const downloadReport = async (req, res, next) => {
  try {
    const { rows: logs } = await pool.query(
      'SELECT * FROM import_logs WHERE id = $1 AND admin_id = $2',
      [req.params.logId, req.user.id]
    );
    if (!logs.length) return R.notFound(res, 'Report not found');
    return R.success(res, logs[0]);
  } catch (err) { next(err); }
};

module.exports = { analyseFile, enhanceQuestions, saveQuestions, getImportLogs, downloadReport };
