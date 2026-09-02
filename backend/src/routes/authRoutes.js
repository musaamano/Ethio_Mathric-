const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
  .matches(/[0-9]/).withMessage('Must contain a number');

router.post('/register',
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  passwordRules,
  validate,
  ctrl.register
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  ctrl.login
);

router.post('/logout', ctrl.logout);
router.post('/refresh', ctrl.refreshToken);

router.post('/forgot-password',
  body('email').isEmail().normalizeEmail(),
  validate,
  ctrl.forgotPassword
);

router.post('/reset-password',
  body('token').notEmpty(),
  passwordRules,
  validate,
  ctrl.resetPassword
);

router.get('/verify-email/:token', ctrl.verifyEmail);

router.post('/resend-verification',
  body('email').isEmail().normalizeEmail(),
  validate,
  ctrl.resendVerification
);

router.get('/sessions', authenticate, ctrl.getSessions);

module.exports = router;
