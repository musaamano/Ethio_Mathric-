-- ============================================================
-- Migration 003: Simplify schema — Stream → Subject → Question
-- ============================================================
--
-- PURPOSE:
--   Remove foreign-key constraints that tie questions and results
--   to chapters and mock_exams, in preparation for dropping those
--   concepts from the active application.
--
--   This migration does NOT drop any tables or columns.
--   Data is fully preserved.
--   Tables (chapters, mock_exams, exam_questions, notes,
--   daily_quiz_log) remain in place and can be dropped in a
--   later migration after all application code is updated.
--
-- CHANGES:
--   1. Drop FK: questions.chapter_id  → chapters
--   2. Drop FK: results.chapter_id    → chapters
--   3. Drop FK: results.exam_id       → mock_exams
--   4. Drop the over-broad results.mode CHECK constraint
--      (which includes 'mock_exam','daily_quiz','chapter',
--      'topic','weak_topic') and replace it with the simplified
--      set: 'practice', 'past_year', 'random'
--      SAFE: results table has 0 rows — verified before migration.
--
-- NOT CHANGED:
--   - questions table data (12 rows preserved)
--   - questions.chapter_id column (kept, just no longer enforced)
--   - questions.topic column (kept, just no longer enforced)
--   - results.chapter_id column (kept)
--   - results.exam_id column (kept)
--   - chapters, mock_exams, notes, exam_questions tables (kept)
--   - All other FKs (users, subjects) are untouched
-- ============================================================

-- ── 1. Remove FK: questions.chapter_id → chapters ─────────
ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS fk_questions_chapter;

-- ── 2. Remove FK: results.chapter_id → chapters ───────────
ALTER TABLE results
  DROP CONSTRAINT IF EXISTS fk_results_chapter;

-- ── 3. Remove FK: results.exam_id → mock_exams ────────────
ALTER TABLE results
  DROP CONSTRAINT IF EXISTS fk_results_exam;

-- ── 4. Replace results.mode CHECK constraint ───────────────
--
-- Old allowed values (7):
--   practice, mock_exam, daily_quiz, topic, chapter, random, weak_topic
--
-- New allowed values (3):
--   practice  — student practice session by subject
--   past_year — past-year question session by subject+year
--   random    — random cross-subject practice
--
-- The old 'practice' value continues to work unchanged.
-- The results table has 0 rows so no existing data is affected.

ALTER TABLE results
  DROP CONSTRAINT IF EXISTS results_mode_check;

ALTER TABLE results
  ADD CONSTRAINT results_mode_check
    CHECK (mode IN ('practice', 'past_year', 'random'));
