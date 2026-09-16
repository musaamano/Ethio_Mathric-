/**
 * batchInserter.js
 * High-performance bulk DB inserter.
 * Uses per-batch transactions — a failure only rolls back that batch.
 * PostgreSQL version
 */
const { getClient } = require('../../config/db');
const logger = require('../../utils/logger');

const BATCH_SIZE = 100;

/**
 * Insert questions in batches of BATCH_SIZE.
 * @param {Array}    questions        Validated question objects
 * @param {number}   adminId          The admin performing the import
 * @param {Function} onBatchComplete  Callback for progress updates
 * @returns {{ inserted, failed, failedItems }}
 */
async function insertInBatches(questions, adminId, onBatchComplete, importMetadata = {}) {
  let totalInserted = 0;
  let totalFailed = 0;
  const failedItems = [];

  // DEBUG: Log insertion input
  logger.info(`[BatchInserter] Input: ${questions.length} questions to insert`);

  const batches = chunkArray(questions, BATCH_SIZE);
  logger.info(`[BatchInserter] Split into ${batches.length} batches (BATCH_SIZE=${BATCH_SIZE})`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    logger.info(`[BatchInserter] Processing batch ${batchIdx + 1}/${batches.length} with ${batch.length} questions`);
    const result = await insertBatch(batch, adminId, importMetadata);

    totalInserted += result.inserted;
    totalFailed += result.failed;
    failedItems.push(...result.failedItems);

    logger.info(`[BatchInserter] Batch ${batchIdx + 1} result: inserted=${result.inserted}, failed=${result.failed}`);

    if (onBatchComplete) {
      onBatchComplete({
        batchIndex: batchIdx + 1,
        totalBatches: batches.length,
        batchInserted: result.inserted,
        batchFailed: result.failed,
        totalInserted,
        totalFailed,
      });
    }
  }

  logger.info(`[BatchInserter] Final result: inserted=${totalInserted}, totalFailed=${totalFailed}`);
  return { inserted: totalInserted, failed: totalFailed, failedItems };
}

/**
 * Insert a single batch inside a DB transaction.
 *
 * Each row is wrapped in a SAVEPOINT so a single INSERT failure
 * only rolls back that one row — the transaction stays live for
 * every subsequent question in the same batch.
 *
 * Without SAVEPOINTs: Q1 fails → PostgreSQL marks the connection
 * as ABORTED → every subsequent query in the batch fails with
 * "current transaction is aborted" → 1 bad question kills 99 good ones.
 *
 * With SAVEPOINTs: Q1 fails → ROLLBACK TO SAVEPOINT → transaction
 * remains healthy → Q2-Q100 are unaffected.
 */
async function insertBatch(questions, adminId, importMetadata = {}) {
  const client = await getClient();
  let inserted = 0;
  let failed = 0;
  const failedItems = [];

  try {
    await client.query('BEGIN');

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const sp = `sp_q${idx}`;   // unique savepoint name per row
      const questionNumber = q.source_number ?? q.question_number ?? idx + 1;

      try {
        await client.query(`SAVEPOINT ${sp}`);

        // Handle duplicate replace
        if (q.duplicate?.action === 'replace' && q.duplicate.existing_id) {
          await client.query(
            'UPDATE questions SET is_active = FALSE WHERE id = $1',
            [q.duplicate.existing_id]
          );
        }

        // Insert question row — year comes from admin-selected import metadata.
        // practice → year = NULL, past_year → year = integer
        console.log('[BatchInserter] OPERATION=questions');
        console.log('[IMPORT METADATA]', {
          subject_id: q.subject_id,
          created_by: adminId,
          category: importMetadata.questionCategory,
          year: importMetadata.importYear,
        });
        let qRes;
        try {
          const { rows } = await client.query(
            `INSERT INTO questions
               (subject_id, type, question_text,
                difficulty, exam_importance, year, is_free, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING id`,
            [
              q.subject_id || null,
              q.type || 'multiple_choice',
              q.question_text,
              q.difficulty || 'medium',
              q.exam_importance || 'medium',
              q.year ?? null,   // NULL = practice, integer = past_year
              q.is_free || false,
              adminId,
            ]
          );
          qRes = rows;
          console.log('[REAL_DB_INSERT]', {
            operation: 'questions',
            questionNumber,
            questionId: qRes[0]?.id,
          });
        } catch (error) {
          console.error('===== REAL DATABASE ERROR =====');
          console.error('QUESTION_NUMBER:', questionNumber);
          console.error('OPERATION:', 'questions');
          console.error('QUESTION_ID:', null);
          console.error('ERROR_NAME:', error?.name);
          console.error('ERROR_MESSAGE:', error?.message);
          console.error('ERROR_CODE:', error?.code);
          console.error('ERROR_DETAIL:', error?.detail);
          console.error('ERROR_HINT:', error?.hint);
          console.error('ERROR_CONSTRAINT:', error?.constraint);
          console.error('ERROR_TABLE:', error?.table);
          console.error('ERROR_COLUMN:', error?.column);
          console.error('FULL_ERROR:', error);
          console.error('================================');
          throw error;
        }
        const qId = qRes[0].id;

        // Insert options — single multi-row INSERT instead of per-option loop
        const validOptions = (q.options || []).filter(o => o.text?.trim());
        if (validOptions.length > 0) {
          const vals = [];
          const params = [];
          let p = 1;
          for (let i = 0; i < validOptions.length; i++) {
            const opt = validOptions[i];
            vals.push(`($${p},$${p + 1},$${p + 2},$${p + 3},$${p + 4})`);
            params.push(qId, opt.label, opt.text, opt.label === q.correct_option, i);
            p += 5;
          }
          console.log('[OPTIONS_BEFORE_INSERT]');
          console.log(`QUESTION_NUMBER=${questionNumber}`);
          console.log(`OPTIONS=${JSON.stringify(validOptions)}`);
          console.log('[BatchInserter] OPERATION=options');
          try {
            const optionsResult = await client.query(
              `INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES ${vals.join(',')}`,
              params
            );
            console.log('[REAL_DB_INSERT]', {
              operation: 'options',
              questionNumber,
              questionId: qId,
              options: validOptions,
              result: optionsResult,
            });
          } catch (err) {
            console.error('===== REAL DATABASE ERROR =====');
            console.error('QUESTION_NUMBER:', questionNumber);
            console.error('OPERATION:', 'options');
            console.error('QUESTION_ID:', qId);
            console.error('ERROR_NAME:', err?.name);
            console.error('ERROR_MESSAGE:', err?.message);
            console.error('ERROR_CODE:', err?.code);
            console.error('ERROR_DETAIL:', err?.detail);
            console.error('ERROR_HINT:', err?.hint);
            console.error('ERROR_CONSTRAINT:', err?.constraint);
            console.error('ERROR_TABLE:', err?.table);
            console.error('ERROR_COLUMN:', err?.column);
            console.error('FULL_ERROR:', err);
            console.error('================================');
            throw err;
          }
        }

        // Insert explanation — only use what the document supplied.
        // Never invent explanations; insert an empty row when none provided.
        const expl = q.has_explanation && q.explanation ? q.explanation : null;
        console.log('[BatchInserter] OPERATION=explanations');
        try {
          const explanationsResult = await client.query(
            `INSERT INTO explanations
               (question_id, why_correct, why_a_wrong, why_b_wrong,
                why_c_wrong, why_d_wrong, memory_trick, common_mistake, reference)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              qId,
              expl?.why_correct || '',
              expl?.why_a_wrong || null,
              expl?.why_b_wrong || null,
              expl?.why_c_wrong || null,
              expl?.why_d_wrong || null,
              expl?.memory_trick || null,
              expl?.common_mistake || null,
              expl?.reference || null,
            ]
          );
          console.log('[REAL_DB_INSERT]', {
            operation: 'explanations',
            questionNumber,
            questionId: qId,
            result: explanationsResult,
          });
        } catch (err) {
          console.error('===== REAL DATABASE ERROR =====');
          console.error('QUESTION_NUMBER:', questionNumber);
          console.error('OPERATION:', 'explanations');
          console.error('QUESTION_ID:', qId);
          console.error('ERROR_NAME:', err?.name);
          console.error('ERROR_MESSAGE:', err?.message);
          console.error('ERROR_CODE:', err?.code);
          console.error('ERROR_DETAIL:', err?.detail);
          console.error('ERROR_HINT:', err?.hint);
          console.error('ERROR_CONSTRAINT:', err?.constraint);
          console.error('ERROR_TABLE:', err?.table);
          console.error('ERROR_COLUMN:', err?.column);
          console.error('FULL_ERROR:', err);
          console.error('================================');
          throw err;
        }

        await client.query(`RELEASE SAVEPOINT ${sp}`);
        inserted++;

      } catch (rowErr) {
        // Roll back only this row — transaction stays open for the rest
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`).catch(() => { });
        failed++;
        failedItems.push({
          question: q.question_text?.slice(0, 80),
          reason: rowErr.message,
        });
        logger.warn(`[BatchInserter] Row failed (rolled back to savepoint): ${rowErr.message}`);
      }
    }

    await client.query('COMMIT');
  } catch (batchErr) {
    await client.query('ROLLBACK').catch(() => { });
    logger.error(`[BatchInserter] Batch transaction rolled back: ${batchErr.message}`);
    // Mark any not-yet-counted questions as failed
    const alreadyCounted = inserted + failed;
    const remainder = questions.slice(alreadyCounted);
    failed += remainder.length;
    remainder.forEach(q => failedItems.push({
      question: q.question_text?.slice(0, 80),
      reason: `Batch error: ${batchErr.message}`,
    }));
  } finally {
    client.release();
  }

  return {
    inserted,
    failed,
    failedItems,
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

module.exports = { insertInBatches };
