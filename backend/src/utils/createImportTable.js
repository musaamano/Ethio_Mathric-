/**
 * createImportTable.js
 * Creates supplemental tables not in the main migration.
 * These are also included in 001_initial_schema.sql — this script
 * is kept for backward compatibility and manual runs.
 * PostgreSQL version
 */
require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS import_logs (
        id                  BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        job_id              VARCHAR(36),
        admin_id            BIGINT       NOT NULL,
        file_name           VARCHAR(500),
        file_type           VARCHAR(20),
        file_size_kb        INTEGER,
        total_found         INTEGER      DEFAULT 0,
        total_imported      INTEGER      DEFAULT 0,
        total_duplicates    INTEGER      DEFAULT 0,
        total_errors        INTEGER      DEFAULT 0,
        total_skipped       INTEGER      DEFAULT 0,
        missing_answer      INTEGER      DEFAULT 0,
        missing_explanation INTEGER      DEFAULT 0,
        formatting_errors   INTEGER      DEFAULT 0,
        import_time_seconds NUMERIC(8,2),
        status              VARCHAR(15)  DEFAULT 'processing'
                              CHECK (status IN ('processing','completed','failed','cancelled')),
        error_message       TEXT,
        report_data         JSONB,
        started_at          TIMESTAMPTZ  DEFAULT NOW(),
        completed_at        TIMESTAMPTZ,
        CONSTRAINT fk_import_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_import_logs_admin ON import_logs(admin_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_import_logs_job   ON import_logs(job_id)');
    console.log('✅  import_logs table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id         INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        name       VARCHAR(200) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        subject    VARCHAR(100) DEFAULT 'general',
        message    TEXT         NOT NULL,
        status     VARCHAR(15)  DEFAULT 'new'
                     CHECK (status IN ('new','read','replied')),
        created_at TIMESTAMPTZ  DEFAULT NOW()
      )
    `);
    console.log('✅  contact_messages table ready');

    console.log('✅  All additional tables ready');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌  Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

run();
