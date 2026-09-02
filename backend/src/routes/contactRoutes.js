/**
 * Contact Routes — Public contact form + admin message viewer
 * PostgreSQL version
 */
const router   = require('express').Router();
const { pool } = require('../config/db');
const R        = require('../utils/apiResponse');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

// NOTE: The contact_messages table is created by the migration.
// No inline CREATE TABLE needed here.

// ── Public: submit contact message ──────────────────────────
router.post('/',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  validate,
  async (req, res, next) => {
    try {
      const { name, email, subject, message } = req.body;
      await pool.query(
        'INSERT INTO contact_messages (name, email, subject, message) VALUES ($1,$2,$3,$4)',
        [name, email, subject || 'general', message]
      );
      return R.success(res, {}, 'Message received. We will respond within 24 hours.');
    } catch (err) { next(err); }
  }
);

// ── Admin: view all contact messages ────────────────────────
router.get('/messages',
  authenticate, authorize('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const { page = 1, limit = 15 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { rows: total } = await pool.query('SELECT COUNT(*) AS c FROM contact_messages');
      const { rows }        = await pool.query(
        'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [parseInt(limit), offset]
      );
      return R.paginated(res, rows, parseInt(total[0].c), page, limit);
    } catch (err) { next(err); }
  }
);

module.exports = router;
