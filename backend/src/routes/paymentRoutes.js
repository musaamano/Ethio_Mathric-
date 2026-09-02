/**
 * Payment Routes
 * Phase 6: Added express-validator + tighter rate limit on /initiate
 */
const router   = require('express').Router();
const ctrl     = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { body }   = require('express-validator');
const validate   = require('../middleware/validate');
const rateLimit  = require('express-rate-limit');

// ── Tighter rate limit on payment initiation (Priority 6 / IMP-C3) ──
// Max 10 payment initiations per 15 minutes per IP.
// Prevents spamming the DB with orphaned pending subscriptions.
const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many payment attempts. Please wait and try again.' },
});

// ── Validation rules for POST /initiate ─────────────────────
const validateInitiate = [
  body('plan_id')
    .exists().withMessage('plan_id is required')
    .isInt({ min: 1 }).withMessage('plan_id must be a positive integer')
    .toInt(),
  body('gateway')
    .optional()
    .isIn(['chapa', 'telebirr', 'santimpay'])
    .withMessage('gateway must be one of: chapa, telebirr, santimpay'),
  validate,
];

// ── Public ───────────────────────────────────────────────────
router.get('/plans',           ctrl.getPlans);

// ── Authenticated student ────────────────────────────────────
router.get('/my-subscription', authenticate, ctrl.getMySubscription);
router.post('/initiate',
  authenticate,
  paymentInitiateLimiter,
  validateInitiate,
  ctrl.initiatePayment
);

// ── Webhook (no auth — verified by HMAC signature) ───────────
router.post('/chapa/callback', ctrl.chapaCallback);

// ── Admin ────────────────────────────────────────────────────
router.get('/',             authenticate, authorize('admin', 'super_admin'), ctrl.getAllPayments);
router.post('/:id/approve', authenticate, authorize('admin', 'super_admin'), ctrl.approvePayment);

module.exports = router;
