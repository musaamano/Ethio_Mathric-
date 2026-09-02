/**
 * Analytics Routes
 * /topics endpoint removed — topic analytics no longer active.
 */
const router = require('express').Router();
const ctrl   = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/overview',     authenticate, ctrl.getStudentOverview);
router.get('/history',      authenticate, ctrl.getHistory);
router.get('/leaderboard',  ctrl.getLeaderboard);
router.get('/admin',        authenticate, authorize('admin','super_admin'), ctrl.getAdminAnalytics);

module.exports = router;
