const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ── Student self ──────────────────────────────
router.get('/profile',         authenticate,                              ctrl.getProfile);
router.patch('/access-type',   authenticate,                              ctrl.updateAccessType);
router.put('/profile',         authenticate, upload.single('avatar'),     ctrl.updateProfile);
router.put('/change-password', authenticate,                              ctrl.changePassword);

// ── Admin (admin + super_admin) ───────────────
router.get('/',                authenticate, authorize('admin', 'super_admin'), ctrl.getAllUsers);
router.get('/export',          authenticate, authorize('admin', 'super_admin'), ctrl.exportUsers);
router.put('/:id/status',      authenticate, authorize('admin', 'super_admin'), ctrl.toggleUserStatus);
router.post('/:id/force-logout', authenticate, authorize('admin', 'super_admin'), ctrl.forceLogout);

// ── Super Admin only ──────────────────────────
router.put('/:id/role',               authenticate, authorize('super_admin'),              ctrl.changeUserRole);
router.delete('/:id',                 authenticate, authorize('super_admin'),              ctrl.deleteUser);
router.put('/:id/email-verification', authenticate, authorize('super_admin'),              ctrl.updateEmailVerification);

// ── Admin + Super Admin ───────────────────────
router.get('/:id/activity',           authenticate, authorize('admin', 'super_admin'),    ctrl.getUserActivity);

module.exports = router;
