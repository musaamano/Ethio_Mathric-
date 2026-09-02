-- ============================================================
-- Migration 004: Drop obsolete tables and columns
-- System: Stream → Subject → Question
-- ============================================================
--
-- Pre-conditions verified before this migration:
--   • questions.chapter_id FK already removed (migration 003) ✅
--   • results.chapter_id FK already removed (migration 003) ✅
--   • results.exam_id FK already removed (migration 003) ✅
--   • No views reference any target tables or columns ✅
--   • No triggers or functions reference target tables ✅
--   • notes → chapters: CASCADE (notes drops with chapters) ✅
--   • exam_questions → mock_exams: CASCADE (exam_questions drops with mock_exams) ✅
--   • Row counts: chapters=16, mock_exams=2, exam_questions=10, notes=0, daily_quiz_log=0
--   • questions.chapter_id and questions.topic: application no longer reads/writes them ✅
--   • results.chapter_id and results.exam_id: results table has 0 rows ✅
--
-- All operations are inside BEGIN/COMMIT.
-- If any statement fails the entire migration rolls back cleanly.
-- ============================================================

BEGIN;

-- ── Step 1: Drop indexes on columns being removed ───────────
-- Must be dropped before dropping the columns they index.
DROP INDEX IF EXISTS idx_questions_chapter;
DROP INDEX IF EXISTS idx_results_exam;

-- ── Step 2: Drop columns from questions ─────────────────────
ALTER TABLE questions DROP COLUMN IF EXISTS chapter_id;
ALTER TABLE questions DROP COLUMN IF EXISTS topic;

-- ── Step 3: Drop columns from results ───────────────────────
ALTER TABLE results DROP COLUMN IF EXISTS chapter_id;
ALTER TABLE results DROP COLUMN IF EXISTS exam_id;

-- ── Step 4: Drop obsolete tables ────────────────────────────
-- Order matters: child tables (or tables with CASCADE) first.
-- notes has FK → chapters (CASCADE) — drop notes first to be explicit
DROP TABLE IF EXISTS notes          CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS mock_exams     CASCADE;
DROP TABLE IF EXISTS chapters       CASCADE;
DROP TABLE IF EXISTS daily_quiz_log CASCADE;

COMMIT;
