/**
 * System Settings Routes
 * PostgreSQL version
 */
const router   = require('express').Router();
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');
const { authenticate, authorize } = require('../middleware/auth');

// Get all settings (admin)
router.get('/', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM system_settings ORDER BY id');
    return R.success(res, rows);
  } catch (err) { next(err); }
});

// Update a setting (super_admin only)
router.put('/:key', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { value } = req.body;
    await pool.query(
      'UPDATE system_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3',
      [value, req.user.id, req.params.key]
    );
    return R.success(res, {}, 'Setting updated');
  } catch (err) { next(err); }
});

module.exports = router;
