const {
  getDocumentById,
  getDocumentByStoredFileName,
  findDuplicateTitleCandidates,
  listPublicDocuments,
  listUserDocuments,
  listPendingDocuments,
  listDraftDocuments,
  getAnalytics,
  createDocument,
  createCorrectionDocument: createCorrectionDocumentService,
  updateDocument,
  validateDocument,
  deleteDocument,
  restoreDocument: restoreDocumentService,
  permanentlyDeleteDocument: permanentlyDeleteDocumentService,
  listTrashedDocuments,
  buildDownloadPayload,
  resolveLegacyLocalPath,
  incrementDocumentViews,
  incrementDocumentDownloads,
  assertDocumentAccess,
} = require('../services/documentService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');

exports.getDocuments = asyncHandler(async (req, res) => {
  const result = await listPublicDocuments(req.query);
  sendSuccess(res, { data: result.data, meta: { count: result.data.length, pagination: result.pagination } });
});

exports.checkDuplicateTitle = asyncHandler(async (req, res) => {
  const matches = await findDuplicateTitleCandidates(req.query.title, req.user);
  sendSuccess(res, { data: matches, meta: { count: matches.length } });
});

exports.getDocument = asyncHandler(async (req, res) => {
  const document = await getDocumentById(req.params.id);
  assertDocumentAccess(document, req.user || null);
  await incrementDocumentViews(document._id);
  sendSuccess(res, { data: document });
});

exports.createDocument = asyncHandler(async (req, res) => {
  const document = await createDocument(req.body, req.file, req.user);
  const isCorrection = req.body.documentType === 'corrige';

  sendSuccess(res, {
    statusCode: 201,
    message: isCorrection
      ? 'Corrige associe au document'
      : 'Document uploade avec succes et en attente de validation',
    data: document,
  });
});

exports.createCorrectionDocument = asyncHandler(async (req, res) => {
  const correction = await createCorrectionDocumentService(req.params.id, req.file, req.user);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Corrige associe au document',
    data: correction,
  });
});

exports.updateDocument = asyncHandler(async (req, res) => {
  const document = await updateDocument(req.params.id, req.body, req.user);
  sendSuccess(res, { message: 'Document mis a jour', data: document });
});

exports.deleteDocument = asyncHandler(async (req, res) => {
  await deleteDocument(req.params.id, req.user);
  sendSuccess(res, { message: 'Document supprime', data: {} });
});

exports.getMyDocuments = asyncHandler(async (req, res) => {
  const result = await listUserDocuments(req.user._id, req.query);
  sendSuccess(res, { data: result.data, meta: { count: result.data.length, pagination: result.pagination } });
});

exports.validateDocument = asyncHandler(async (req, res) => {
  const document = await validateDocument(req.params.id, req.body.status, req.user);
  sendSuccess(res, { message: 'Statut du document mis a jour', data: document });
});

exports.getPendingDocuments = asyncHandler(async (req, res) => {
  const result = await listPendingDocuments(req.query);
  sendSuccess(res, { data: result.data, meta: { count: result.data.length, pagination: result.pagination } });
});

exports.getDraftDocuments = asyncHandler(async (req, res) => {
  const result = await listDraftDocuments(req.query);
  sendSuccess(res, { data: result.data, meta: { count: result.data.length, pagination: result.pagination } });
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await getAnalytics();
  sendSuccess(res, { data: analytics });
});

exports.getDocumentDownloadUrl = asyncHandler(async (req, res) => {
  const document = await getDocumentById(req.params.id);
  const download = await buildDownloadPayload(document, req.user || null);

  if (!download) {
    throw new AppError('Ce document ne dispose pas de lien signe', 400);
  }

  sendSuccess(res, { data: download });
});

exports.legacyDownloadByFileName = asyncHandler(async (req, res) => {
  const document = await getDocumentByStoredFileName(req.params.fileName);

  if (!document) {
    throw new AppError('Document introuvable', 404);
  }

  const download = await buildDownloadPayload(document, req.user || null);

  if (download?.url) {
    return res.redirect(download.url);
  }

  const legacyFilePath = await resolveLegacyLocalPath(document);

  if (!legacyFilePath) {
    throw new AppError('Fichier source introuvable', 404);
  }

  await incrementDocumentDownloads(document._id);
  return res.download(legacyFilePath, document.originalFileName || document.file);
});

// ── Trash Management (Super Admin) ──────────────

exports.getTrashedDocuments = asyncHandler(async (req, res) => {
  const result = await listTrashedDocuments(req.query);
  sendSuccess(res, { data: result.data, meta: { count: result.data.length, pagination: result.pagination } });
});

exports.restoreDocument = asyncHandler(async (req, res) => {
  const document = await restoreDocumentService(req.params.id);
  sendSuccess(res, { message: 'Document restaure avec succes', data: document });
});

exports.permanentlyDeleteDocument = asyncHandler(async (req, res) => {
  await permanentlyDeleteDocumentService(req.params.id);
  sendSuccess(res, { message: 'Document supprime definitivement', data: {} });
});

exports.getTrashedDocumentPreview = asyncHandler(async (req, res) => {
  const document = await getDocumentById(req.params.id);

  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  const download = await buildDownloadPayload(document, req.user);

  if (!download) {
    throw new AppError('Ce document ne dispose pas de lien de previsualisation', 400);
  }

  sendSuccess(res, { data: download });
});
