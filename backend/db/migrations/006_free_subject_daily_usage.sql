-- ============================================================
-- Migration 006: Free student daily subject usage tracking
-- ============================================================
-- Tracks how many submitted answers each free student has used in a
-- subject for the current calendar day. Counts are shared across
-- Practice and Past Year for the same subject.

CREATE TABLE IF NOT EXISTS free_subject_daily_usage (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL,
  subject_id   INT NOT NULL,
  usage_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count SMALLINT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subject_id, usage_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_free_subject_daily_usage_user_date
  ON free_subject_daily_usage (user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_free_subject_daily_usage_subject_date
  ON free_subject_daily_usage (subject_id, usage_date);
