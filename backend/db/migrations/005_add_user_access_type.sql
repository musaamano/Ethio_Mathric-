-- ============================================================
-- Migration 005: Add persistent student access selection
-- ============================================================
-- Existing verified users remain functional as free users.
-- Premium access continues to come only from active subscriptions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) NOT NULL DEFAULT 'not_selected'
  CHECK (access_type IN ('not_selected', 'free'));

UPDATE users
SET access_type = 'free'
WHERE is_email_verified = TRUE
  AND access_type = 'not_selected';

CREATE INDEX IF NOT EXISTS idx_users_access_type ON users(access_type);
