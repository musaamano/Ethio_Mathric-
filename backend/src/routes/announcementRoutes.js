/**
 * Announcement Routes
 * PostgreSQL version
 */
const router   = require('express').Router();
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');
const { authenticate, authorize } = require('../middleware/auth');

// Public/student: get active announcements
router.get('/', async (req, res, next) => {
  try {
    const role = req.user?.role || 'all';
    const { rows } = await pool.query(
      `SELECT * FROM announcements
       WHERE is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (target_role = 'all' OR target_role = $1)
       ORDER BY published_at DESC
       LIMIT 20`,
      [role]
    );
    return R.success(res, rows);
  } catch (err) { next(err); }
});

// Admin: create announcement
router.post('/', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { title, content, type, target_role, expires_at } = req.body;
    const { rows: r } = await pool.query(
      'INSERT INTO announcements (title, content, type, target_role, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
      [title, content, type || 'info', target_role || 'all', expires_at || null, req.user.id]
    );
    return R.created(res, { id: r[0].id }, 'Announcement created');
  } catch (err) { next(err); }
});

// Admin: update announcement
router.put('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { title, content, type, target_role, is_active, expires_at } = req.body;
    await pool.query(
      'UPDATE announcements SET title=$1, content=$2, type=$3, target_role=$4, is_active=$5, expires_at=$6 WHERE id=$7',
      [title, content, type, target_role, is_active !== false, expires_at || null, req.params.id]
    );
    return R.success(res, {}, 'Announcement updated');
  } catch (err) { next(err); }
});

// Admin: delete announcement (soft)
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    await pool.query('UPDATE announcements SET is_active = FALSE WHERE id = $1', [req.params.id]);
    return R.success(res, {}, 'Announcement removed');
  } catch (err) { next(err); }
});

module.exports = router;
