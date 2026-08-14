const Document = require('../models/Document');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

const AVAILABLE_SUBJECTS_FILTER = {
  status: 'approved',
  isDeleted: { $ne: true },
  documentType: { $ne: 'corrige' },
};

const getDocumentOptions = async (field, collection) => Document.aggregate([
  { $match: { ...AVAILABLE_SUBJECTS_FILTER, [field]: { $ne: null } } },
  { $group: { _id: `$${field}`, documentCount: { $sum: 1 } } },
  {
    $lookup: {
      from: collection,
      localField: '_id',
      foreignField: '_id',
      as: 'entity',
    },
  },
  { $unwind: '$entity' },
  {
    $project: {
      _id: '$entity._id',
      name: '$entity.name',
      abbreviation: { $ifNull: ['$entity.abbreviation', ''] },
      documentCount: 1,
    },
  },
  { $sort: { name: 1 } },
]);

/**
 * Options for the initial orientation. Every option is backed by actual public
 * content, so no empty institution or contest can be selected.
 */
exports.getOrientationOptions = asyncHandler(async (_req, res) => {
  const [universities, subjectContests, trainingContests] = await Promise.all([
    getDocumentOptions('university', 'universities'),
    getDocumentOptions('category', 'categories'),
    // Contest types backed by actual documents
    getDocumentOptions('contestType', 'contesttypes'),
  ]);

  sendSuccess(res, { data: { universities, subjectContests, trainingContests } });
});
