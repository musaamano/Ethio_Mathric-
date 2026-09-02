/**
 * setupDb.js — Runs PostgreSQL migrations then seeds data.
 * Run: node src/utils/setupDb.js
 *
 * Requires DATABASE_URL in .env
 */
require('dotenv').config();
const path = require('path');

async function setup() {
  console.log('\n🔧  Setting up Ethio Matric Academy PostgreSQL database...\n');

  // Step 1: Run migrations
  console.log('📦  Running migrations...\n');
  try {
    require(path.join(__dirname, '../../db/migrate.js'));
  } catch (err) {
    console.error('❌  Migration step failed:', err.message);
    process.exit(1);
  }

  // Step 2: Migrations are async, so wait briefly then run seeder
  // (migrate.js calls process.exit on error, so if we reach here it succeeded)
  setTimeout(() => {
    console.log('\n🌱  Running seeder...\n');
    try {
      require('./seeder');
    } catch (err) {
      console.error('❌  Seeder step failed:', err.message);
      process.exit(1);
    }
  }, 3000);
}

setup();
