const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Student self
router.get('/profile',          authenticate, ctrl.getProfile);
router.put('/profile',          authenticate, upload.single('avatar'), ctrl.updateProfile);
router.put('/change-password',  authenticate, ctrl.changePassword);

// Admin
router.get('/',                 authenticate, authorize('admin','super_admin'), ctrl.getAllUsers);
router.put('/:id/status',       authenticate, authorize('admin','super_admin'), ctrl.toggleUserStatus);
router.post('/:id/force-logout',authenticate, authorize('admin','super_admin'), ctrl.forceLogout);
router.put('/:id/role',         authenticate, authorize('super_admin'), ctrl.changeUserRole);

module.exports = router;
