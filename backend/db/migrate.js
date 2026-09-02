/**
 * db/migrate.js
 * Runs all SQL migration files in order against the configured PostgreSQL database.
 *
 * Usage:
 *   node db/migrate.js
 *
 * The DATABASE_URL environment variable must be set before running.
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Add it to your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  console.log('\n🔧  Running PostgreSQL migrations...\n');

  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map(r => r.filename));

    // Read migration files, sorted alphabetically (001_, 002_, ...)
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let ran = 0;
    let skipped = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭   Skipping (already applied): ${file}`);
        skipped++;
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`  ▶   Applying: ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`  ✅  Applied:  ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌  Failed:   ${file}`);
        console.error(`      ${err.message}`);
        throw err;
      }
    }

    console.log(`\n✅  Migration complete — ${ran} applied, ${skipped} skipped.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('\n❌  Migration failed:', err.message);
  process.exit(1);
});
