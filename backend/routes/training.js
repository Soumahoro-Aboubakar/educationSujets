const express = require('express');
const {
  getTrainingContests,
  getTrainingQuestions,
  answerTrainingQuestion,
  createTrainingQuestion,
} = require('../controllers/trainingController');
const { protect, authorize } = require('../middleware/auth');
const limits = require('../middleware/rateLimit');

const router = express.Router();

router.get('/contests', getTrainingContests);
router.get('/questions', getTrainingQuestions);
router.post('/questions/:id/answer', limits.publicWrite, answerTrainingQuestion);
router.post('/questions', protect, authorize('admin'), createTrainingQuestion);

module.exports = router;
