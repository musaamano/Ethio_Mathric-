/**
 * Question Routes
 * System: Stream → Subject → Question
 * chapter/topic/mock-exam modes removed.
 */
const router   = require('express').Router();
const ctrl     = require('../controllers/questionController');
const { authenticate, authorize, requireSubscription } = require('../middleware/auth');
const upload   = require('../middleware/upload');
const multer   = require('multer');
const path     = require('path');

const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename:    (req, file, cb) => cb(null, `import_${Date.now()}_${file.originalname}`),
});
const uploadExcel = multer({ storage: excelStorage });

// Student routes
router.get('/practice',  authenticate, requireSubscription, ctrl.getPracticeQuestions);
router.get('/years',     authenticate, ctrl.getAvailableYears);
router.post('/submit',   authenticate, ctrl.submitAnswers);
router.get('/bookmarks', authenticate, ctrl.getBookmarks);
router.post('/bookmark', authenticate, ctrl.toggleBookmark);
router.post('/report',   authenticate, ctrl.reportQuestion);

// Admin routes
router.get('/',    authenticate, authorize('admin','super_admin'), ctrl.getQuestions);
router.post('/',   authenticate, authorize('admin','super_admin'), upload.single('image'), ctrl.createQuestion);
router.post('/import', authenticate, authorize('admin','super_admin'), uploadExcel.single('file'), ctrl.importQuestions);
router.get('/:id',     authenticate, authorize('admin','super_admin'), ctrl.getQuestion);
router.put('/:id',     authenticate, authorize('admin','super_admin'), ctrl.updateQuestion);
router.delete('/:id',  authenticate, authorize('admin','super_admin'), ctrl.deleteQuestion);

module.exports = router;
