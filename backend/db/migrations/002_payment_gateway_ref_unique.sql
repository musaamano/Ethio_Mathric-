-- ============================================================
-- Migration 002: Add UNIQUE constraint on payments.gateway_ref
-- ============================================================
--
-- Purpose:
--   Prevents two payment rows from sharing the same Chapa tx_ref.
--   This is a database-level safety net that complements the
--   application-level SELECT FOR UPDATE SKIP LOCKED locking.
--
-- Safety:
--   NULL values are excluded from UNIQUE constraints in PostgreSQL
--   (each NULL is considered distinct), so rows with no gateway_ref
--   (e.g. manual/future gateways) are unaffected.
--
-- Pre-condition:
--   No existing duplicate non-NULL gateway_ref values exist.
--   Verified before running this migration.
-- ============================================================

ALTER TABLE payments
  ADD CONSTRAINT uq_payments_gateway_ref UNIQUE (gateway_ref);
