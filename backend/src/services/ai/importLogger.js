/**
 * importLogger.js
 * Logs every import job to the database for full audit trail.
 * PostgreSQL version
 */
const { pool } = require('../../config/db');
const logger   = require('../../utils/logger');

// Ensure import_logs table exists — deferred to give pool time to connect
setTimeout(async () => {
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
    logger.info('[ImportLogger] ✓ import_logs table ready');
  } catch (err) {
    // Table likely already exists — silently ignore
    logger.debug('[ImportLogger] import_logs table check:', err.message);
  }
}, 2000);

/**
 * Create a new import log entry.
 * @param {number} adminId
 * @param {string} fileName
 * @param {string} fileType
 * @param {number} fileSizeKb
 * @param {string} [jobId]
 * @returns {Promise<number>} new row id
 */
async function createLog(adminId, fileName, fileType, fileSizeKb, jobId = null) {
  const { rows } = await pool.query(
    `INSERT INTO import_logs (admin_id, file_name, file_type, file_size_kb, job_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [adminId, fileName, fileType, fileSizeKb, jobId]
  );
  return rows[0].id;
}

/**
 * Update import log fields.
 * Accepts any subset of import_logs columns.
 */
async function updateLog(logId, updates) {
  if (!logId || !Object.keys(updates).length) return;

  let paramIdx = 1;
  const setClauses = [];
  const values     = [];

  for (const [key, val] of Object.entries(updates)) {
    setClauses.push(`${key} = $${paramIdx++}`);
    values.push(val);
  }

  values.push(logId);
  await pool.query(
    `UPDATE import_logs SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
    values
  );
}

/**
 * Get paginated import logs for an admin.
 */
async function getLogs(adminId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const { rows: total } = await pool.query(
    'SELECT COUNT(*) AS c FROM import_logs WHERE admin_id = $1',
    [adminId]
  );

  const { rows } = await pool.query(
    `SELECT id, job_id, file_name, file_type, file_size_kb,
            total_found, total_imported, total_duplicates, total_errors,
            total_skipped, missing_answer, missing_explanation, formatting_errors,
            import_time_seconds, status, started_at, completed_at
     FROM import_logs
     WHERE admin_id = $1
     ORDER BY started_at DESC
     LIMIT $2 OFFSET $3`,
    [adminId, limit, offset]
  );

  return { rows, total: parseInt(total[0].c) };
}

/**
 * Get a log by its job_id (used by bulk pipeline).
 */
async function getLogByJobId(jobId) {
  const { rows } = await pool.query(
    'SELECT * FROM import_logs WHERE job_id = $1 LIMIT 1',
    [jobId]
  );
  return rows[0] || null;
}

module.exports = { createLog, updateLog, getLogs, getLogByJobId };
