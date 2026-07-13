const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const storageConfig = require('../config/storage');
const getStorageProvider = require('../storage');
const AppError = require('../utils/errors');

const access = promisify(fs.access);
const legacyUploadsDir = path.join(__dirname, '..', 'uploads');

const POPULATE_FIELDS = [
  { path: 'university', select: 'name abbreviation' },
  { path: 'department', select: 'name university' },
  { path: 'level', select: 'name order' },
  { path: 'semester', select: 'name order' },
  { path: 'category', select: 'name icon' },
  { path: 'uploadedBy', select: 'name email role' },
  { path: 'validatedBy', select: 'name email role' },
];

const applyPopulate = (query) => {
  POPULATE_FIELDS.forEach((field) => {
    query.populate(field);
  });

  return query;
};

const normalizeTitle = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getTitleTokens = (value) =>
  normalizeTitle(value)
    .split(' ')
    .filter((token) => token.length > 2);

const getBigrams = (value) => {
  const compact = normalizeTitle(value).replace(/\s+/g, '');
  if (compact.length < 2) {
    return compact ? [compact] : [];
  }

  return Array.from({ length: compact.length - 1 }, (_, index) =>
    compact.slice(index, index + 2)
  );
};

const getTitleSimilarity = (sourceTitle, candidateTitle) => {
  const source = normalizeTitle(sourceTitle);
  const candidate = normalizeTitle(candidateTitle);

  if (!source || !candidate) {
    return 0;
  }

  if (source === candidate) {
    return 1;
  }

  const sourceTokens = getTitleTokens(source);
  const candidateTokens = getTitleTokens(candidate);
  const sharedTokens = sourceTokens.filter((token) => candidateTokens.includes(token));
  const tokenScore = sourceTokens.length && candidateTokens.length
    ? sharedTokens.length / Math.min(sourceTokens.length, candidateTokens.length)
    : 0;

  const sourceBigrams = getBigrams(source);
  const candidateBigrams = getBigrams(candidate);
  const sharedBigrams = sourceBigrams.filter((bigram) => candidateBigrams.includes(bigram));
  const bigramScore = sourceBigrams.length && candidateBigrams.length
    ? (2 * sharedBigrams.length) / (sourceBigrams.length + candidateBigrams.length)
    : 0;

  const containmentScore = source.includes(candidate) || candidate.includes(source)
    ? Math.min(source.length, candidate.length) / Math.max(source.length, candidate.length)
    : 0;

  return Math.min(1, Math.max(tokenScore * 0.92, bigramScore, containmentScore));
};

const canAccessDocument = (document, user) => {
  if (document.status === 'approved') {
    return true;
  }

  if (!user) {
    return false;
  }

  const uploadedById = document.uploadedBy?._id || document.uploadedBy;

  if (uploadedById?.toString?.() === user._id.toString()) {
    return true;
  }

  return ['admin', 'sub-admin'].includes(user.role);
};

const assertDocumentAccess = (document, user) => {
  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  if (!canAccessDocument(document, user)) {
    throw new AppError('Acces refuse a ce document', 403);
  }
};

const assertDocumentMutationAccess = (document, user) => {
  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  const isOwner = document.uploadedBy.toString() === user._id.toString();
  const isPrivileged = ['admin', 'sub-admin'].includes(user.role);

  if (!isOwner && !isPrivileged) {
    throw new AppError('Vous ne pouvez pas modifier ce document', 403);
  }
};

const getDocumentById = async (id) => applyPopulate(Document.findById(id));

const getDocumentByStoredFileName = async (fileName) => applyPopulate(Document.findOne({ file: fileName }));

const findDuplicateTitleCandidates = async (title, user) => {
  const normalized = normalizeTitle(title);

  if (normalized.length < 4) {
    return [];
  }

  const documents = await Document.find({})
    .select('title originalFileName status uploadedBy createdAt')
    .sort('-createdAt')
    .lean();

  const rankedMatches = documents
    .map((document) => {
      const titleScore = getTitleSimilarity(title, document.title);
      const fileScore = getTitleSimilarity(title, document.originalFileName);
      const duplicateScore = Math.max(titleScore, fileScore);

      return {
        document,
        duplicateScore: Number(duplicateScore.toFixed(2)),
        matchPercent: Math.round(duplicateScore * 100),
      };
    })
    .filter((match) => match.duplicateScore >= 0.68)
    .sort((a, b) => b.duplicateScore - a.duplicateScore)
    .slice(0, 5);

  const documentsById = new Map(
    (await applyPopulate(Document.find({ _id: { $in: rankedMatches.map((match) => match.document._id) } })))
      .map((document) => [document._id.toString(), document])
  );

  return rankedMatches.map((match) => {
    const populatedDocument = documentsById.get(match.document._id.toString());
    const plainDocument = populatedDocument?.toObject
      ? populatedDocument.toObject()
      : match.document;

    return {
      ...plainDocument,
      duplicateScore: match.duplicateScore,
      matchPercent: match.matchPercent,
      canView: canAccessDocument(populatedDocument || match.document, user),
    };
  });
};

const buildDocumentFilters = (params = {}) => {
  const filters = { status: 'approved' };
  const refFields = ['university', 'department', 'level', 'semester', 'category'];

  refFields.forEach((field) => {
    if (params[field]) {
      filters[field] = params[field];
    }
  });

  if (params.search) {
    filters.$or = [
      { title: { $regex: params.search, $options: 'i' } },
      { description: { $regex: params.search, $options: 'i' } },
      { originalFileName: { $regex: params.search, $options: 'i' } },
    ];
  }

  return filters;
};

const listPublicDocuments = async (params = {}) => {
  const filters = buildDocumentFilters(params);
  let query = applyPopulate(Document.find(filters)).sort('-createdAt');

  const limit = Number.parseInt(params.limit, 10) || 12;
  const page = Number.parseInt(params.page, 10) || 1;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const [data, total] = await Promise.all([
    query,
    Document.countDocuments(filters),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

const listUserDocuments = async (userId, params = {}) => {
  const filters = { uploadedBy: userId };
  let query = applyPopulate(Document.find(filters).sort('-createdAt'));

  const limit = Number.parseInt(params.limit, 10) || 12;
  const page = Number.parseInt(params.page, 10) || 1;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const [data, total] = await Promise.all([
    query,
    Document.countDocuments(filters),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

const listPendingDocuments = async (params = {}) => {
  const filters = { status: 'pending' };
  let query = applyPopulate(Document.find(filters).sort('-createdAt'));

  const limit = Number.parseInt(params.limit, 10) || 12;
  const page = Number.parseInt(params.page, 10) || 1;
  const skip = (page - 1) * limit;

  query = query.skip(skip).limit(limit);

  const [data, total] = await Promise.all([
    query,
    Document.countDocuments(filters),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

const getAnalytics = async () => {
  const [totalDocuments, approvedDocuments, pendingDocuments, rejectedDocuments, totals] = await Promise.all([
    Document.countDocuments(),
    Document.countDocuments({ status: 'approved' }),
    Document.countDocuments({ status: 'pending' }),
    Document.countDocuments({ status: 'rejected' }),
    Document.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalDownloads: { $sum: '$downloads' },
        },
      },
    ]),
  ]);

  return {
    totalDocuments,
    approvedDocuments,
    pendingDocuments,
    rejectedDocuments,
    totalViews: totals[0]?.totalViews || 0,
    totalDownloads: totals[0]?.totalDownloads || 0,
  };
};

const createStoragePayload = (file, userId) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const storedFileName = `${uuidv4()}${extension}`;
  const storageKey = `${storageConfig.folder}/${userId}/${storedFileName}`;

  return {
    extension,
    storedFileName,
    storageKey,
    fileType: extension.replace('.', '').toUpperCase(),
  };
};

const createDocument = async (payload, file, user) => {
  if (!file) {
    throw new AppError('Aucun fichier a uploader', 400);
  }

  const storageProvider = getStorageProvider();
  const { extension, storedFileName, storageKey, fileType } = createStoragePayload(file, user._id.toString());

  await storageProvider.upload(storageKey, file.buffer, {
    contentType: file.mimetype,
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.originalname)}`,
    metadata: {
      originalFileName: file.originalname,
      uploadedBy: user._id.toString(),
    },
  });

  const document = await Document.create({
    title: payload.title?.trim(),
    description: payload.description?.trim() || '',
    university: payload.university || null,
    department: payload.department || null,
    level: payload.level || null,
    semester: payload.semester || null,
    category: payload.category || null,
    uploadedBy: user._id,
    file: storedFileName,
    originalFileName: file.originalname,
    fileType,
    extension,
    mimeType: file.mimetype,
    fileSize: file.size,
    storageKey,
    storageProvider: storageConfig.provider,
    status: 'pending',
  });

  console.info(`[UPLOAD] user=${user._id} document=${document._id} file=${storedFileName} provider=${storageConfig.provider}`);
  console.log("Voici le log document : ", document);
  return getDocumentById(document._id);
};

const updateDocument = async (documentId, payload, user) => {
  const document = await Document.findById(documentId);
  assertDocumentMutationAccess(document, user);

  const fields = ['title', 'description', 'university', 'department', 'level', 'semester', 'category'];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      document[field] = payload[field] || null;
    }
  });

  await document.save();
  return getDocumentById(document._id);
};

const validateDocument = async (documentId, status, user) => {
  const document = await Document.findById(documentId);

  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  document.status = status;
  document.validatedBy = user._id;
  document.validatedAt = new Date();
  await document.save();

  return getDocumentById(document._id);
};

const deleteDocument = async (documentId, user) => {
  const document = await Document.findById(documentId);
  assertDocumentMutationAccess(document, user);

  if (document.storageKey) {
    try {
      await getStorageProvider().delete(document.storageKey);
    } catch (error) {
      console.warn(`[STORAGE_DELETE_WARNING] document=${document._id} key=${document.storageKey} error=${error.message}`);
    }
  }

  await document.deleteOne();

  console.info(`[DELETE] user=${user._id} document=${documentId}`);
};

const buildDownloadPayload = async (document, user) => {
  assertDocumentAccess(document, user);

  if (!document.storageKey || document.storageProvider === 'legacy-local') {
    return null;
  }

  const url = await getStorageProvider().generateSignedUrl(document.storageKey, storageConfig.downloadUrlExpiration, {
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`,
    contentType: document.mimeType,
  });

  await Document.updateOne({ _id: document._id }, { $inc: { downloads: 1 } });

  console.info(`[DOWNLOAD_URL] user=${user?._id || 'guest'} document=${document._id} expiresIn=${storageConfig.downloadUrlExpiration}`);

  return {
    url,
    expiresIn: storageConfig.downloadUrlExpiration,
  };
};

const resolveLegacyLocalPath = async (document) => {
  const legacyFilePath = path.join(legacyUploadsDir, document.file);

  try {
    await access(legacyFilePath, fs.constants.R_OK);
    return legacyFilePath;
  } catch (error) {
    return null;
  }
};

const incrementDocumentViews = async (documentId) => {
  await Document.updateOne({ _id: documentId }, { $inc: { views: 1 } });
};

const incrementDocumentDownloads = async (documentId) => {
  await Document.updateOne({ _id: documentId }, { $inc: { downloads: 1 } });
};

module.exports = {
  getDocumentById,
  getDocumentByStoredFileName,
  findDuplicateTitleCandidates,
  listPublicDocuments,
  listUserDocuments,
  listPendingDocuments,
  getAnalytics,
  createDocument,
  updateDocument,
  validateDocument,
  deleteDocument,
  buildDownloadPayload,
  resolveLegacyLocalPath,
  incrementDocumentViews,
  incrementDocumentDownloads,
  assertDocumentAccess,
};
