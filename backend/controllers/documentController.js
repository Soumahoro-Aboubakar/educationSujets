const {
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
  sendSuccess(res, {
    statusCode: 201,
    message: 'Document uploadé avec succes et en attente de validation',
    data: document,
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
