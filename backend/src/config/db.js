/**
 * PostgreSQL Database Connection Pool
 * Uses the 'pg' driver with DATABASE_URL (Supabase / Render compatible)
 */
const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  console.error('    Add it to your .env file:');
  console.error('    DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },  // Always required for Supabase pooler
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log pool errors so they don't crash silently
pool.on('error', (err) => {
  // Avoid logging the full connection string which may contain the password
  console.error('❌  PostgreSQL pool error:', err.message);
});

/**
 * Test the connection on startup.
 * Exits the process if the database is unreachable.
 */
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query('SELECT current_database() AS db, version()');
    console.log(`✅  PostgreSQL connected — database: ${rows[0].db}`);
  } catch (err) {
    console.error('❌  PostgreSQL connection failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};

/**
 * Convenience wrapper: run a query against the pool.
 * Returns { rows, rowCount } — same as pg's pool.query().
 *
 * Usage:
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 * Always release() in a finally block.
 *
 * Usage:
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     ...
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *   } finally {
 *     client.release();
 *   }
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient, testConnection };
