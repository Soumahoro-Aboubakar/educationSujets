const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const storageConfig = require('../config/storage');
const getStorageProvider = require('../storage');
const AppError = require('../utils/errors');
const { normalizeImageUploadToPdf } = require('./documentImageProcessor');

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
  { path: 'correction', select: '_id status originalFileName fileType extension mimeType fileSize documentType' },
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

/**
 * Check delete permission:
 * - admin (super admin) can delete any document
 * - sub-admin can only delete documents they uploaded
 */
const assertDeleteAccess = (document, user) => {
  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  if (user.role === 'admin') {
    return; // super admin can delete anything
  }

  if (user.role === 'sub-admin') {
    const uploadedById = (document.uploadedBy?._id || document.uploadedBy).toString();
    if (uploadedById !== user._id.toString()) {
      throw new AppError('Vous ne pouvez supprimer que les documents que vous avez uploades', 403);
    }
    return;
  }

  throw new AppError('Vous n\'etes pas autorise a supprimer ce document', 403);
};

const getDocumentById = async (id) => applyPopulate(Document.findById(id));

const getDocumentByStoredFileName = async (fileName) => applyPopulate(Document.findOne({ file: fileName }));

const findDuplicateTitleCandidates = async (title, user) => {
  const normalized = normalizeTitle(title);

  if (normalized.length < 4) {
    return [];
  }

  const documents = await Document.find({ isDeleted: { $ne: true } })
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
  const filters = { status: 'approved', isDeleted: { $ne: true } };
  const refFields = ['university', 'department', 'level', 'semester', 'category'];

  refFields.forEach((field) => {
    if (params[field]) {
      filters[field] = params[field];
    }
  });

  if (params.search) {
    let searchQuery = params.search;
    const correctionRegex = /\b(correction|corrigé|corrige)s?\b/i;
    
    if (correctionRegex.test(searchQuery)) {
      filters.documentType = 'corrige';
      searchQuery = searchQuery.replace(correctionRegex, '').replace(/\s+/g, ' ').trim();
    } else {
      filters.documentType = { $ne: 'corrige' };
    }

    if (searchQuery) {
      filters.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { originalFileName: { $regex: searchQuery, $options: 'i' } },
      ];
    }
  } else {
    filters.documentType = { $ne: 'corrige' };
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
  const filters = { uploadedBy: userId, isDeleted: { $ne: true } };
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
  const filters = { status: 'pending', isDeleted: { $ne: true } };
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

const listDraftDocuments = async (params = {}) => {
  const filters = { status: 'draft', isDeleted: { $ne: true } };
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
  const notDeleted = { isDeleted: { $ne: true } };
  const [totalDocuments, approvedDocuments, pendingDocuments, rejectedDocuments, totals] = await Promise.all([
    Document.countDocuments(notDeleted),
    Document.countDocuments({ status: 'approved', ...notDeleted }),
    Document.countDocuments({ status: 'pending', ...notDeleted }),
    Document.countDocuments({ status: 'rejected', ...notDeleted }),
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

const assertCorrectionFile = (file) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = (file.mimetype || '').toLowerCase();

  if (extension !== '.pdf' || mimeType !== 'application/pdf') {
    throw new AppError('Le corrige doit etre un fichier PDF', 400);
  }
};

const assertCorrectionTarget = async (correctionFor) => {
  if (!correctionFor || !mongoose.Types.ObjectId.isValid(correctionFor)) {
    throw new AppError('Document principal invalide', 400);
  }

  const subject = await Document.findById(correctionFor);

  if (!subject) {
    throw new AppError('Document principal introuvable', 404);
  }

  if (subject.documentType === 'corrige') {
    throw new AppError('Un corrige ne peut pas recevoir un autre corrige', 400);
  }

  const existingCorrection = await Document.findOne({
    documentType: 'corrige',
    correctionFor: subject._id,
  });

  if (existingCorrection) {
    throw new AppError('Ce document possede deja un corrige associe', 409);
  }

  return subject;
};

const createDocument = async (payload, file, user) => {
  if (!file) {
    throw new AppError('Aucun fichier a uploader', 400);
  }

  const documentType = payload.documentType === 'corrige' ? 'corrige' : 'sujet';
  const isCorrection = documentType === 'corrige';
  const uploadFile = await normalizeImageUploadToPdf(file);

  if (isCorrection) {
    assertCorrectionFile(uploadFile);
    await assertCorrectionTarget(payload.correctionFor);
  }

  const storageProvider = getStorageProvider();
  const { extension, storedFileName, storageKey, fileType } = createStoragePayload(uploadFile, user._id.toString());

  await storageProvider.upload(storageKey, uploadFile.buffer, {
    contentType: uploadFile.mimetype,
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(uploadFile.originalname)}`,
    metadata: {
      originalFileName: uploadFile.originalname,
      uploadedBy: user._id.toString(),
    },
  });

  const baseDocument = {
    documentType,
    uploadedBy: user._id,
    file: storedFileName,
    originalFileName: uploadFile.originalname,
    fileType,
    extension,
    mimeType: uploadFile.mimetype,
    fileSize: uploadFile.size,
    storageKey,
    storageProvider: storageConfig.provider,
    isPremmuim: false,
  };

  const documentPayload = isCorrection
    ? {
      ...baseDocument,
      correctionFor: payload.correctionFor,
      status: 'approved',
      validatedBy: user._id,
      validatedAt: new Date(),
    }
    : {
      ...baseDocument,
      title: payload.title?.trim(),
      description: payload.description?.trim() || '',
      university: payload.university || null,
      department: payload.department || null,
      level: payload.level || null,
      semester: payload.semester || null,
      category: payload.category || null,
      status: payload.metadataStatus === 'false' ? 'draft' : 'pending',
    };

  const document = await Document.create(documentPayload);

  console.info(`[UPLOAD] user=${user._id} document=${document._id} file=${storedFileName} provider=${storageConfig.provider}`);
  return getDocumentById(document._id);
};

const createCorrectionDocument = async (documentId, file, user) =>
  createDocument({ documentType: 'corrige', correctionFor: documentId }, file, user);

const updateDocument = async (documentId, payload, user) => {
  const document = await Document.findById(documentId);
  assertDocumentMutationAccess(document, user);

  if (document.documentType === 'corrige') {
    throw new AppError('Les metadonnees ne sont pas modifiables sur un corrige', 400);
  }

  const fields = ['title', 'description', 'university', 'department', 'level', 'semester', 'category'];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      document[field] = payload[field] || null;
    }
  });

  if (payload.metadataStatus === 'true' && document.status === 'draft') {
    document.status = 'pending';
  }

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
  assertDeleteAccess(document, user);

  document.previousStatus = document.status;
  document.isDeleted = true;
  document.deletedAt = new Date();
  document.deletedBy = user._id;
  await document.save();

  console.info(`[SOFT_DELETE] user=${user._id} document=${documentId} previousStatus=${document.previousStatus}`);
};

const restoreDocument = async (documentId) => {
  const document = await Document.findById(documentId);

  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  if (!document.isDeleted) {
    throw new AppError('Ce document n\'est pas dans la corbeille', 400);
  }

  document.status = document.previousStatus || 'pending';
  document.isDeleted = false;
  document.deletedAt = null;
  document.deletedBy = null;
  document.previousStatus = null;
  await document.save();

  console.info(`[RESTORE] document=${documentId} restoredStatus=${document.status}`);
  return getDocumentById(document._id);
};

const permanentlyDeleteDocument = async (documentId) => {
  const document = await Document.findById(documentId);

  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  if (document.storageKey) {
    try {
      await getStorageProvider().delete(document.storageKey);
    } catch (error) {
      console.warn(`[STORAGE_DELETE_WARNING] document=${document._id} key=${document.storageKey} error=${error.message}`);
    }
  }

  await document.deleteOne();
  console.info(`[PERMANENT_DELETE] document=${documentId}`);
};

const listTrashedDocuments = async (params = {}) => {
  const filters = { isDeleted: true };
  let query = applyPopulate(
    Document.find(filters)
      .populate({ path: 'deletedBy', select: 'name email role' })
      .sort('-deletedAt')
  );

  const limit = Number.parseInt(params.limit, 10) || 20;
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

const TRASH_RETENTION_DAYS = 6;

const purgeExpiredTrash = async () => {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expiredDocuments = await Document.find({
    isDeleted: true,
    deletedAt: { $lte: cutoff },
  });

  if (expiredDocuments.length === 0) {
    return { purged: 0 };
  }

  console.info(`[TRASH_PURGE] Found ${expiredDocuments.length} expired documents to purge`);

  let purged = 0;
  for (const doc of expiredDocuments) {
    try {
      await permanentlyDeleteDocument(doc._id);
      purged += 1;
    } catch (error) {
      console.error(`[TRASH_PURGE_ERROR] document=${doc._id} error=${error.message}`);
    }
  }

  console.info(`[TRASH_PURGE] Purged ${purged}/${expiredDocuments.length} documents`);
  return { purged, total: expiredDocuments.length };
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
  listDraftDocuments,
  getAnalytics,
  createDocument,
  createCorrectionDocument,
  updateDocument,
  validateDocument,
  deleteDocument,
  restoreDocument,
  permanentlyDeleteDocument,
  listTrashedDocuments,
  purgeExpiredTrash,
  buildDownloadPayload,
  resolveLegacyLocalPath,
  incrementDocumentViews,
  incrementDocumentDownloads,
  assertDocumentAccess,
};
