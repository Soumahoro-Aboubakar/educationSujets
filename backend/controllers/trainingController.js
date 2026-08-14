const mongoose = require('mongoose');
const TrainingQuestion = require('../models/TrainingQuestion');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const publicQuestion = (question) => ({
  _id: question._id,
  question: question.question,
  options: question.options,
  position: question.position,
});

exports.getTrainingContests = asyncHandler(async (_req, res) => {
  const contests = await TrainingQuestion.aggregate([
    { $match: { active: true, category: { $ne: null } } },
    { $group: { _id: '$category', questionCount: { $sum: 1 } } },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category',
      },
    },
    { $unwind: '$category' },
    { $project: { _id: '$category._id', name: '$category.name', questionCount: 1 } },
    { $sort: { name: 1 } },
  ]);

  sendSuccess(res, { data: contests });
});

exports.getTrainingQuestions = asyncHandler(async (req, res) => {
  const { contest } = req.query;
  if (!isObjectId(contest)) {
    throw new AppError('Le concours sélectionné est invalide', 400);
  }

  const questions = await TrainingQuestion.find({ category: contest, active: true })
    .sort({ position: 1, createdAt: 1 })
    .select('question options position');

  sendSuccess(res, { data: questions.map(publicQuestion) });
});

exports.answerTrainingQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const selectedIndex = Number(req.body?.selectedIndex);

  if (!isObjectId(id)) {
    throw new AppError('Question introuvable', 404);
  }

  const question = await TrainingQuestion.findOne({ _id: id, active: true });
  if (!question) {
    throw new AppError('Question introuvable', 404);
  }

  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) {
    throw new AppError('La réponse sélectionnée est invalide', 400);
  }

  sendSuccess(res, {
    data: {
      isCorrect: question.correctIndex === selectedIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation || '',
    },
  });
});

exports.createTrainingQuestion = asyncHandler(async (req, res) => {
  const { category, question, options, correctIndex, explanation, position, active } = req.body;

  if (!isObjectId(category)) {
    throw new AppError('Le concours est invalide', 400);
  }

  const createdQuestion = await TrainingQuestion.create({
    category,
    question,
    options,
    correctIndex,
    explanation,
    position,
    active,
  });

  sendSuccess(res, {
    statusCode: 201,
    message: 'Question d’entraînement créée',
    data: publicQuestion(createdQuestion),
  });
});
