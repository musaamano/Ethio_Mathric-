/**
 * PM2 Ecosystem Config — Production deployment
 * Run with: pm2 start ecosystem.config.js
 *
 * IMPORTANT: instances MUST be 1 (not 'max') because jobStore is in-memory.
 * In cluster mode each worker has its own jobStore Map. A job created on
 * worker A is invisible to worker B, so the SSE /bulk/progress/:id request
 * may hit a different worker and return 404 → EventSource onerror fires →
 * frontend shows "Connection to import server lost."
 *
 * To scale horizontally in future, replace jobStore with Redis pub/sub.
 */
module.exports = {
  apps: [
    {
      name:         'ethio-matric-api',
      script:       'src/server.js',
      instances:    1,             // MUST stay 1 — jobStore is in-memory
      exec_mode:    'fork',        // fork (not cluster) matches instances:1
      env: {
        NODE_ENV: 'development',
        PORT:     5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     5000,
      },
      // Auto-restart on crash
      autorestart:  true,
      watch:        false,
      max_memory_restart: '512M',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file:  'logs/pm2-error.log',
      out_file:    'logs/pm2-out.log',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
