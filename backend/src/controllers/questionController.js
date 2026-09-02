/**
 * Question Controller
 * System: Stream → Subject → Question
 * PostgreSQL version
 */
const { pool, getClient } = require('../config/db');
const R    = require('../utils/apiResponse');
const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

// ─────────────────────────────────────────────
// HELPER: build $1,$2,... placeholders
// ─────────────────────────────────────────────
function makePlaceholders(arr, startAt = 1) {
  return arr.map((_, i) => `$${i + startAt}`).join(',');
}

// ─────────────────────────────────────────────
// HELPER: batch-load options for a list of questions
// ─────────────────────────────────────────────
async function attachOptions(questions) {
  if (!questions.length) return;
  const ids = questions.map(q => q.id);
  const placeholders = makePlaceholders(ids);
  const { rows: allOpts } = await pool.query(
    `SELECT * FROM options WHERE question_id IN (${placeholders}) ORDER BY question_id, sort_order`,
    ids
  );
  const optsMap = {};
  allOpts.forEach(o => {
    if (!optsMap[o.question_id]) optsMap[o.question_id] = [];
    optsMap[o.question_id].push(o);
  });
  questions.forEach(q => { q.options = optsMap[q.id] || []; });
}

// ─────────────────────────────────────────────
// GET QUESTIONS (admin — with filters & pagination)
// ─────────────────────────────────────────────
const getQuestions = async (req, res, next) => {
  try {
    const {
      subject_id, difficulty, type,
      search, page = 1, limit = 20, is_free,
      category, year,
    } = req.query;

    const where  = ['q.is_active = TRUE'];
    const params = [];

    if (subject_id) { params.push(subject_id);     where.push(`q.subject_id = $${params.length}`); }
    if (difficulty) { params.push(difficulty);     where.push(`q.difficulty = $${params.length}`); }
    if (type)       { params.push(type);           where.push(`q.type = $${params.length}`); }
    if (is_free !== undefined) {
      params.push(is_free === 'true');
      where.push(`q.is_free = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      where.push(`q.question_text ILIKE $${params.length}`);
    }
    // category filter: 'practice' → year IS NULL, 'past_year' → year IS NOT NULL
    if (category === 'practice')  where.push('q.year IS NULL');
    if (category === 'past_year') where.push('q.year IS NOT NULL');
    // specific year filter (narrows past_year further)
    if (year) {
      const parsedYear = parseInt(year);
      if (!isNaN(parsedYear)) {
        params.push(parsedYear);
        where.push(`q.year = $${params.length}`);
      }
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const offset      = (parseInt(page) - 1) * parseInt(limit);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`, params
    );
    const total = parseInt(countRows[0].total);

    params.push(parseInt(limit));
    params.push(offset);

    const { rows: questions } = await pool.query(
      `SELECT q.*, s.name AS subject_name
       FROM questions q
       LEFT JOIN subjects s ON s.id = q.subject_id
       ${whereClause}
       ORDER BY q.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    await attachOptions(questions);
    return R.paginated(res, questions, total, page, limit);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// GET SINGLE QUESTION WITH EXPLANATION (admin)
// ─────────────────────────────────────────────
const getQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: questions } = await pool.query(
      `SELECT q.*, s.name AS subject_name
       FROM questions q
       LEFT JOIN subjects s ON s.id = q.subject_id
       WHERE q.id = $1 AND q.is_active = TRUE`,
      [id]
    );
    if (!questions.length) return R.notFound(res, 'Question not found');

    const question = questions[0];
    const { rows: opts } = await pool.query(
      'SELECT * FROM options WHERE question_id = $1 ORDER BY sort_order', [id]
    );
    const { rows: expl } = await pool.query(
      'SELECT * FROM explanations WHERE question_id = $1', [id]
    );

    question.options     = opts;
    question.explanation = expl[0] || null;
    return R.success(res, question);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// GET PRACTICE QUESTIONS (student)
// Modes: practice | past_year | random
// ─────────────────────────────────────────────
const getPracticeQuestions = async (req, res, next) => {
  try {
    const { subject_id, mode = 'practice' } = req.query;
    const hasSubscription = req.hasSubscription;
    const year = req.query.year ? parseInt(req.query.year) : null;

    const count = Math.min(100, Math.max(1, parseInt(req.query.count) || 10));
    if (subject_id && isNaN(parseInt(subject_id))) return R.badRequest(res, 'Invalid subject_id');

    const where  = ['q.is_active = TRUE'];
    const params = [];

    if (!hasSubscription) where.push('q.is_free = TRUE');
    if (subject_id) { params.push(parseInt(subject_id)); where.push(`q.subject_id = $${params.length}`); }
    if (year)       { params.push(year);                 where.push(`q.year = $${params.length}`); }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const { rows: countResult } = await pool.query(
      `SELECT COUNT(*) AS total FROM questions q ${whereClause}`, params
    );
    const totalCount = parseInt(countResult[0].total);

    let questions = [];
    if (totalCount > 0) {
      const safeCount = Math.min(count, totalCount);

      if (totalCount <= count) {
        const { rows } = await pool.query(
          `SELECT q.id, q.question_text, q.type, q.image_url, q.difficulty,
                  q.subject_id, q.exam_importance, q.year,
                  s.name AS subject_name
           FROM questions q
           LEFT JOIN subjects s ON s.id = q.subject_id
           ${whereClause}`,
          params
        );
        // Fisher-Yates shuffle
        for (let i = rows.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rows[i], rows[j]] = [rows[j], rows[i]];
        }
        questions = rows.slice(0, safeCount);
      } else {
        const offset = Math.floor(Math.random() * (totalCount - safeCount));
        const limitParam  = params.length + 1;
        const offsetParam = params.length + 2;
        const { rows } = await pool.query(
          `SELECT q.id, q.question_text, q.type, q.image_url, q.difficulty,
                  q.subject_id, q.exam_importance, q.year,
                  s.name AS subject_name
           FROM questions q
           LEFT JOIN subjects s ON s.id = q.subject_id
           ${whereClause}
           LIMIT $${limitParam} OFFSET $${offsetParam}`,
          [...params, safeCount, offset]
        );
        questions = rows;
      }
    }

    if (!questions.length) return R.success(res, []);

    await attachOptions(questions);

    // Batch load explanations
    const ids = questions.map(q => q.id);
    const placeholders = makePlaceholders(ids);
    const { rows: allExpls } = await pool.query(
      `SELECT question_id, why_correct, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong,
              memory_trick, common_mistake, reference
       FROM explanations WHERE question_id IN (${placeholders})`,
      ids
    );
    const explMap = {};
    allExpls.forEach(e => { explMap[e.question_id] = e; });

    questions.forEach(q => {
      q.explanation    = explMap[q.id] || null;
      const correctOpt = q.options.find(o => o.is_correct);
      q.correct_answer = correctOpt ? correctOpt.option_label.trim().toUpperCase() : null;
    });

    return R.success(res, questions);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// GET AVAILABLE PAST-YEAR YEARS
// ─────────────────────────────────────────────
const getAvailableYears = async (req, res, next) => {
  try {
    const { subject_ids } = req.query;
    const where  = ['q.is_active = TRUE', 'q.year IS NOT NULL'];
    const params = [];

    if (subject_ids) {
      const ids = subject_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        ids.forEach(id => params.push(id));
        where.push(`q.subject_id IN (${placeholders})`);
      }
    }

    const { rows } = await pool.query(
      `SELECT DISTINCT q.year FROM questions q WHERE ${where.join(' AND ')} ORDER BY q.year DESC`,
      params
    );
    return res.json({ success: true, data: rows.map(r => r.year) });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// SUBMIT PRACTICE ANSWERS
// Returns subject-level breakdown only (no chapter/topic).
// ─────────────────────────────────────────────
const submitAnswers = async (req, res, next) => {
  const client = await getClient();
  try {
    const { answers, subject_id, mode, time_taken_secs } = req.body;

    // Validate mode against the new simplified set
    const VALID_MODES = new Set(['practice', 'past_year', 'random']);
    const safeMode = VALID_MODES.has(mode) ? mode : 'practice';

    if (!Array.isArray(answers) || answers.length === 0) {
      client.release();
      return R.badRequest(res, 'answers must be a non-empty array');
    }
    const VALID_OPTIONS = new Set(['A', 'B', 'C', 'D']);

    await client.query('BEGIN');

    let correct = 0, wrong = 0, skipped = 0;
    const answerDetails = [];

    const qIds = answers.map(a => parseInt(a.question_id)).filter(id => !isNaN(id));
    if (!qIds.length) {
      await client.query('ROLLBACK');
      client.release();
      return R.badRequest(res, 'No valid question IDs provided');
    }

    const placeholders = makePlaceholders(qIds);
    const { rows: correctRows } = await client.query(
      `SELECT o.question_id, o.option_label
       FROM options o
       WHERE o.question_id IN (${placeholders}) AND o.is_correct = TRUE`,
      qIds
    );

    const correctMap = {};
    correctRows.forEach(r => { correctMap[r.question_id] = r; });

    const toUpdate = { correctIds: [], attemptedIds: [] };

    for (const ans of answers) {
      const qId = parseInt(ans.question_id);
      if (!qId || isNaN(qId)) continue;

      const selected = ans.selected_option
        ? ans.selected_option.toString().trim().toUpperCase()
        : null;

      if (selected && !VALID_OPTIONS.has(selected)) continue;

      const correctData = correctMap[qId];
      if (!correctData) continue;

      const correctLabel = correctData.option_label.trim().toUpperCase();
      const is_correct   = selected === correctLabel;

      if (!selected) skipped++;
      else if (is_correct) correct++;
      else wrong++;

      answerDetails.push({
        question_id:     qId,
        selected_option: selected,
        correct_option:  correctLabel,
        is_correct,
      });

      toUpdate.attemptedIds.push(qId);
      if (is_correct) toUpdate.correctIds.push(qId);
    }

    // Update question stats
    for (const qId of toUpdate.attemptedIds) {
      const isCorr = toUpdate.correctIds.includes(qId);
      await client.query(
        `UPDATE questions
         SET times_attempted = times_attempted + 1,
             times_correct   = times_correct + $1
         WHERE id = $2`,
        [isCorr ? 1 : 0, qId]
      );
    }

    const total     = answerDetails.length;
    const accuracy  = total > 0 ? parseFloat(((correct / total) * 100).toFixed(2)) : 0;
    const timeTaken = parseInt(time_taken_secs) || 0;

    const { rows: resultRow } = await client.query(
      `INSERT INTO results
         (user_id, subject_id, mode, total_questions, correct_answers,
          wrong_answers, skipped, score_percent, time_taken_secs,
          started_at, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW() - ($9::integer * INTERVAL '1 second'), NOW())
       RETURNING id`,
      [req.user.id, subject_id || null, safeMode,
       total, correct, wrong, skipped, accuracy, timeTaken]
    );
    const resultId = resultRow[0].id;

    if (answerDetails.length > 0) {
      const valParts = answerDetails.map((_, i) => {
        const base = i * 4;
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4})`;
      }).join(',');
      const vals = answerDetails.flatMap(a => [
        resultId, a.question_id, a.selected_option || null, a.is_correct,
      ]);
      await client.query(
        `INSERT INTO result_answers (result_id, question_id, selected_option, is_correct) VALUES ${valParts}`,
        vals
      );
    }

    await client.query('COMMIT');

    return R.success(res, {
      result_id:       resultId,
      total, correct, wrong, skipped,
      score_percent:   accuracy,
      time_taken_secs: timeTaken,
      answers:         answerDetails,
    }, 'Practice submitted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// ADMIN: CREATE QUESTION
// ─────────────────────────────────────────────
const createQuestion = async (req, res, next) => {
  try {
    const {
      subject_id, type, question_text,
      difficulty, exam_importance, year, is_free,
      options, explanation,
    } = req.body;

    const image_url = req.file ? `/uploads/questions/${req.file.filename}` : null;

    const { rows: qResult } = await pool.query(
      `INSERT INTO questions
         (subject_id, type, question_text, image_url,
          difficulty, exam_importance, year, is_free, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [subject_id, type, question_text, image_url,
       difficulty || 'medium', exam_importance || 'medium',
       year || null, is_free || false, req.user.id]
    );
    const qId = qResult[0].id;

    if (options && options.length) {
      for (const opt of options) {
        await pool.query(
          'INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES ($1,$2,$3,$4,$5)',
          [qId, opt.label, opt.text, opt.is_correct || false, opt.sort_order || 0]
        );
      }
    }

    if (explanation) {
      await pool.query(
        `INSERT INTO explanations
           (question_id, why_correct, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, memory_trick, common_mistake, reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [qId, explanation.why_correct || '',
         explanation.why_a_wrong    || null, explanation.why_b_wrong    || null,
         explanation.why_c_wrong    || null, explanation.why_d_wrong    || null,
         explanation.memory_trick   || null, explanation.common_mistake || null,
         explanation.reference      || null]
      );
    }

    return R.created(res, { id: qId }, 'Question created');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: UPDATE QUESTION
// ─────────────────────────────────────────────
const updateQuestion = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const {
      subject_id, type, question_text,
      difficulty, exam_importance, year, is_free,
      options, explanation,
    } = req.body;

    await client.query('BEGIN');

    await client.query(
      `UPDATE questions
       SET subject_id=$1, type=$2, question_text=$3,
           difficulty=$4, exam_importance=$5, year=$6, is_free=$7
       WHERE id=$8`,
      [subject_id, type, question_text,
       difficulty, exam_importance, year || null, is_free || false, id]
    );

    if (Array.isArray(options) && options.length) {
      await client.query('DELETE FROM options WHERE question_id = $1', [id]);
      for (const opt of options) {
        await client.query(
          'INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES ($1,$2,$3,$4,$5)',
          [id, opt.label, opt.text, opt.is_correct || false, opt.sort_order || 0]
        );
      }
    }

    if (explanation) {
      await client.query('DELETE FROM explanations WHERE question_id = $1', [id]);
      await client.query(
        `INSERT INTO explanations
           (question_id, why_correct, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, memory_trick, common_mistake, reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id,
         explanation.why_correct    || '',
         explanation.why_a_wrong    || null, explanation.why_b_wrong    || null,
         explanation.why_c_wrong    || null, explanation.why_d_wrong    || null,
         explanation.memory_trick   || null, explanation.common_mistake || null,
         explanation.reference      || null]
      );
    }

    await client.query('COMMIT');
    return R.success(res, {}, 'Question updated');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ADMIN: SOFT-DELETE QUESTION
const deleteQuestion = async (req, res, next) => {
  try {
    await pool.query('UPDATE questions SET is_active = FALSE WHERE id = $1', [req.params.id]);
    return R.success(res, {}, 'Question deactivated');
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// ADMIN: IMPORT FROM EXCEL/CSV
// chapter_id and topic columns ignored if present in file.
// Admin must supply subject_id, question_category, and year (if past_year).
// ─────────────────────────────────────────────
const importQuestions = async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'No file uploaded');

    // ── Validate admin-selected metadata ────────────────────
    const { subject_id, question_category, year: rawYear } = req.body;

    if (!subject_id) return R.badRequest(res, 'subject_id is required.');
    const subjectIdInt = parseInt(subject_id);
    if (isNaN(subjectIdInt) || subjectIdInt < 1) return R.badRequest(res, 'Invalid subject_id.');
    const { rows: subjectRows } = await pool.query(
      'SELECT id FROM subjects WHERE id = $1 AND is_active = TRUE', [subjectIdInt]
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

    const wb   = XLSX.readFile(req.file.path);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    let created = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        // Admin-selected values override anything in the file
        const { rows: qRes } = await pool.query(
          `INSERT INTO questions
             (subject_id, type, question_text, difficulty, year, is_free, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id`,
          [
            subjectIdInt,
            row.type || 'multiple_choice',
            row.question_text,
            row.difficulty || 'medium',
            importYear,          // NULL for practice, integer for past_year
            row.is_free || false,
            req.user.id,
          ]
        );
        const qId = qRes[0].id;

        const labels = ['A', 'B', 'C', 'D'];
        for (let li = 0; li < labels.length; li++) {
          const l = labels[li];
          const colVariants = [`option_${l}`, `option_${l.toLowerCase()}`, l, `Option ${l}`];
          const optText = colVariants.map(c => row[c]).find(v => v != null && v !== '');
          if (optText) {
            await pool.query(
              'INSERT INTO options (question_id, option_label, option_text, is_correct, sort_order) VALUES ($1,$2,$3,$4,$5)',
              [qId, l, optText, row.correct_option === l || row.correct_option?.toUpperCase() === l, li]
            );
          }
        }

        // Insert explanation if why_correct supplied
        const whyCorrect = (row.why_correct || row.explanation || '').toString().trim();
        if (whyCorrect) {
          await pool.query(
            `INSERT INTO explanations (question_id, why_correct) VALUES ($1, $2)`,
            [qId, whyCorrect]
          );
        }

        created++;
      } catch (e) {
        errors.push({ row: i + 2, error: e.message });
      }
    }

    fs.unlinkSync(req.file.path);
    return R.success(res, { created, errors }, `Imported ${created} questions`);
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────
// BOOKMARK QUESTION
// ─────────────────────────────────────────────
const toggleBookmark = async (req, res, next) => {
  try {
    const { question_id } = req.body;
    const { rows: existing } = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND question_id = $2',
      [req.user.id, question_id]
    );
    if (existing.length) {
      await pool.query('DELETE FROM bookmarks WHERE id = $1', [existing[0].id]);
      return R.success(res, { bookmarked: false }, 'Bookmark removed');
    } else {
      await pool.query(
        'INSERT INTO bookmarks (user_id, question_id) VALUES ($1,$2)',
        [req.user.id, question_id]
      );
      return R.success(res, { bookmarked: true }, 'Question bookmarked');
    }
  } catch (err) { next(err); }
};

// GET BOOKMARKS
const getBookmarks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*) AS total FROM bookmarks WHERE user_id = $1', [req.user.id]
    );
    const { rows } = await pool.query(
      `SELECT b.id AS bookmark_id, b.created_at AS bookmarked_at, q.*,
              s.name AS subject_name
       FROM bookmarks b
       JOIN questions q ON q.id = b.question_id
       LEFT JOIN subjects s ON s.id = q.subject_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );

    await attachOptions(rows);
    return R.paginated(res, rows, parseInt(countRows[0].total), page, limit);
  } catch (err) { next(err); }
};

// REPORT QUESTION
const reportQuestion = async (req, res, next) => {
  try {
    const { question_id, reason, description } = req.body;
    await pool.query(
      'INSERT INTO reports (user_id, question_id, reason, description) VALUES ($1,$2,$3,$4)',
      [req.user.id, question_id, reason, description || null]
    );
    return R.created(res, {}, 'Report submitted. Thank you for the feedback.');
  } catch (err) { next(err); }
};

module.exports = {
  getQuestions, getQuestion, getPracticeQuestions, getAvailableYears,
  submitAnswers, createQuestion, updateQuestion, deleteQuestion,
  importQuestions, toggleBookmark, getBookmarks, reportQuestion,
};
