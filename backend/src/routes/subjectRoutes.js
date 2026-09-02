const router = require('express').Router();
const ctrl   = require('../controllers/subjectController');
const { authenticate, authorize } = require('../middleware/auth');

// Public
router.get('/streams',      ctrl.getStreams);
router.get('/',             ctrl.getSubjects);
router.get('/:slug',        ctrl.getSubject);

// Admin only
router.post('/',         authenticate, authorize('admin','super_admin'), ctrl.createSubject);
router.put('/:id',       authenticate, authorize('admin','super_admin'), ctrl.updateSubject);
router.delete('/:id',    authenticate, authorize('admin','super_admin'), ctrl.deleteSubject);

module.exports = router;
