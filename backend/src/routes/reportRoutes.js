/**
 * Report Routes
 * PostgreSQL version
 */
const router   = require('express').Router();
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');
const { authenticate, authorize } = require('../middleware/auth');

// Admin: get all reports
router.get('/', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { status, page = 1, limit = 15 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where  = [];
    const params = [];

    if (status) {
      params.push(status);
      where.push(`r.status = $${params.length}`);
    }

    const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const { rows: total } = await pool.query(
      `SELECT COUNT(*) AS c FROM reports r ${whereStr}`,
      params
    );

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await pool.query(
      `SELECT r.*,
              q.question_text,
              CONCAT(u.first_name, ' ', u.last_name) AS reporter_name
       FROM reports r
       JOIN questions q ON q.id = r.question_id
       JOIN users u ON u.id = r.user_id
       ${whereStr}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return R.paginated(res, rows, parseInt(total[0].c), page, limit);
  } catch (err) { next(err); }
});

// Admin: update report status
router.put('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!valid.includes(status)) return R.badRequest(res, 'Invalid status');

    await pool.query(
      'UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3',
      [status, req.user.id, req.params.id]
    );
    return R.success(res, {}, 'Report updated');
  } catch (err) { next(err); }
});

module.exports = router;
