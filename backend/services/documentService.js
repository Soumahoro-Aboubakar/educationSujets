const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const Institution = require('../models/Institution');
const TaxonomyNode = require('../models/TaxonomyNode');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const Organisme = require('../models/Organisme');
const ParcoursType = require('../models/ParcoursType');
const { getLeafContext } = require('./dynamicCatalogService');
const { validateDocumentTaxonomy } = require('./catalogService');
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
  { path: 'contestType', select: 'name abbreviation' },
  { path: 'institution', select: 'name abbreviation navigationStructure' },
  { path: 'taxonomyNodes', select: 'name type parent institution order' },
  {
    path: 'noeudId',
    select: 'nom organismeId parentId ordreNiveau',
    populate: {
      path: 'parentId',
      select: 'nom organismeId parentId ordreNiveau',
      populate: {
        path: 'parentId',
        select: 'nom organismeId parentId ordreNiveau',
        populate: {
          path: 'parentId',
          select: 'nom organismeId parentId ordreNiveau',
        },
      },
    },
  },
  { path: 'matiereId', select: 'nom organismeId' },
  { path: 'parcoursTypeId', select: 'nom organismeId isDefault' },
  { path: 'sujetParentId', select: '_id title titre status type documentType isDeleted' },
  { path: 'dynamicCorrection', select: '_id title titre status originalFileName fileType extension mimeType fileSize type isDeleted' },
  // Pas d'email : ces champs sont servis sur des routes publiques.
  { path: 'uploadedBy', select: 'name role' },
  { path: 'validatedBy', select: 'name role' },
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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  const refFields = ['university', 'department', 'level', 'semester', 'category', 'contestType', 'institution'];

  refFields.forEach((field) => {
    if (params[field]) {
      filters[field] = params[field];
    }
  });

  if (params.node) filters.taxonomyNodes = params.node;
  if (params.taxonomyNode) filters.taxonomyNodes = params.taxonomyNode;
  if (params.documentType && ['sujet', 'corrige'].includes(params.documentType)) {
    filters.documentType = params.documentType;
  }
  if (params.search) {
    let searchQuery = params.search;
    const correctionRegex = /\b(correction|corrigé|corrige)s?\b/i;

    if (correctionRegex.test(searchQuery)) {
      if (!params.documentType) filters.documentType = 'corrige';
      searchQuery = searchQuery.replace(correctionRegex, '').replace(/\s+/g, ' ').trim();
    } else if (!params.documentType) {
      filters.documentType = { $ne: 'corrige' };
    }

    if (searchQuery) {
      const safeSearchQuery = escapeRegex(searchQuery);
      filters.$or = [
        { title: { $regex: safeSearchQuery, $options: 'i' } },
        { description: { $regex: safeSearchQuery, $options: 'i' } },
        { originalFileName: { $regex: safeSearchQuery, $options: 'i' } },
      ];
    }
  } else {
    if (!params.documentType) filters.documentType = { $ne: 'corrige' };
  }

  return filters;
};

// Profondeur maximale d'un catalogue (organisme → concours → cycle → année…) : garde-fou.
const MAX_CATALOG_DEPTH = 8;

/**
 * Nœuds et matières du catalogue dynamique dont le nom contient `token`.
 * Un nœud trouvé (ex. « ENA ») couvre aussi tous ses descendants (années, sessions…),
 * et un organisme trouvé couvre tous ses nœuds.
 */
const findCatalogMatches = async (token) => {
  const regex = new RegExp(escapeRegex(token), 'i');
  const [organismes, matchedNodes, matieres] = await Promise.all([
    Organisme.find({ nomNormalise: regex }).select('_id').lean(),
    Noeud.find({ nomNormalise: regex }).select('_id').limit(500).lean(),
    Matiere.find({ nomNormalise: regex }).select('_id').limit(500).lean(),
  ]);

  const nodeIds = new Set(matchedNodes.map((node) => String(node._id)));

  if (organismes.length) {
    const organismeNodes = await Noeud.find({ organismeId: { $in: organismes.map((o) => o._id) } }).select('_id').lean();
    organismeNodes.forEach((node) => nodeIds.add(String(node._id)));
  }

  let frontier = matchedNodes.map((node) => node._id);
  for (let depth = 0; frontier.length && depth < MAX_CATALOG_DEPTH; depth += 1) {
    const children = await Noeud.find({ parentId: { $in: frontier } }).select('_id').lean();
    frontier = children.map((child) => child._id).filter((id) => !nodeIds.has(String(id)));
    frontier.forEach((id) => nodeIds.add(String(id)));
  }

  return {
    nodeIds: [...nodeIds].map((id) => new mongoose.Types.ObjectId(id)),
    matiereIds: matieres.map((matiere) => matiere._id),
  };
};

const listPublicDocuments = async (params = {}) => {
  const filters = buildDocumentFilters(params);

  if (params.search) {
    const tokens = normalizeTitle(params.search).split(' ').filter((token) => token.length > 2);
    if (tokens.length) {
      const referenceMatches = await Promise.all(tokens.map(async (token) => {
        const regex = new RegExp(escapeRegex(token), 'i');
        const [institutions, nodes, catalog] = await Promise.all([
          Institution.find({ normalizedName: regex }).select('_id').lean(),
          TaxonomyNode.find({ normalizedName: regex }).select('_id').lean(),
          findCatalogMatches(token),
        ]);
        return {
          token,
          institutions: institutions.map((item) => item._id),
          nodes: nodes.map((item) => item._id),
          catalog,
        };
      }));

      filters.$and = referenceMatches.map(({ token, institutions, nodes, catalog }) => ({
        $or: [
          { title: { $regex: escapeRegex(token), $options: 'i' } },
          { description: { $regex: escapeRegex(token), $options: 'i' } },
          { originalFileName: { $regex: escapeRegex(token), $options: 'i' } },
          ...(institutions.length ? [{ institution: { $in: institutions } }] : []),
          ...(nodes.length ? [{ taxonomyNodes: { $in: nodes } }] : []),
          ...(catalog.nodeIds.length ? [{ noeudId: { $in: catalog.nodeIds } }] : []),
          ...(catalog.matiereIds.length ? [{ matiereId: { $in: catalog.matiereIds } }] : []),
        ],
      }));
      delete filters.$or;
    }
  }

  if (params.hasCorrection === 'true' || params.hasCorrection === true) {
    const correctionTargets = await Document.distinct('correctionFor', {
      documentType: 'corrige',
      status: 'approved',
      isDeleted: { $ne: true },
    });
    filters._id = { $in: correctionTargets };
  }

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

const listDynamicDocuments = async (params = {}, user = null) => {
  if (params.type && params.type !== 'sujet') throw new AppError('Cette route liste uniquement les sujets', 400);
  const { node } = await getLeafContext({ noeudId: params.noeudId, matiereId: params.matiereId });
  const filter = {
    noeudId: node._id,
    matiereId: params.matiereId,
    type: 'sujet',
    isDeleted: { $ne: true },
  };
  if (params.parcoursTypeId) {
    const parcoursType = await ParcoursType.findOne({ _id: params.parcoursTypeId, organismeId: node.organismeId }).lean();
    if (!parcoursType) throw new AppError('Type de parcours introuvable pour cet organisme', 404);
    filter.parcoursTypeId = parcoursType._id;
  }
  filter.status = 'approved';

  const numericPage = Math.max(Number.parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(params.limit, 10) || 12, 1), 100);
  const rawSearch = String(params.recherche || params.search || '').trim();
  const searchTokens = rawSearch.split(/\s+/).filter(Boolean);

  if (searchTokens.length) {
    const [organisme, parentNodes] = await Promise.all([
      Organisme.findById(node.organismeId).select('nom').lean(),
      (async () => {
        const ancestors = [];
        let parentId = node.parentId;
        while (parentId) {
          const parent = await Noeud.findById(parentId).select('nom parentId').lean();
          if (!parent) break;
          ancestors.push(parent);
          parentId = parent.parentId;
        }
        return ancestors;
      })(),
    ]);
    const searchableContext = [
      matiere.nom,
      node.nom,
      organisme?.nom,
      ...parentNodes.map((parent) => parent.nom),
    ].map(normalizeTitle);
    const contentFields = ['titre', 'title', 'description', 'originalFileName'];
    const matchingTokens = searchTokens
      .filter((token) => !searchableContext.some((value) => value.includes(normalizeTitle(token))))
      .map((token) => {
        const regex = new RegExp(escapeRegex(token), 'i');
        return { $or: contentFields.map((field) => ({ [field]: regex })) };
      });

    if (matchingTokens.length) filter.$and = matchingTokens;
  }

  const [pageItems, total] = await Promise.all([
    Document.find(filter)
      .sort({ dateAjout: -1, createdAt: -1, _id: -1 })
      .skip((numericPage - 1) * limit)
      .limit(limit)
      .lean(),
    Document.countDocuments(filter),
  ]);
  const data = await Promise.all(pageItems.map(async (subject) => {
    const correction = await Document.findOne(activeCorrectionFilter(subject._id))
      .sort('-dateAjout -createdAt')
      .lean();
    return { ...subject, correction: correction || null };
  }));

  return {
    data,
    pagination: { total, page: numericPage, pages: Math.ceil(total / limit), limit },
  };
};

const applyAdminListFilters = (filters, params = {}) => {
  ['university', 'department', 'level', 'semester', 'category', 'contestType', 'institution'].forEach((field) => {
    if (params[field]) filters[field] = params[field];
  });

  if (params.search) {
    const search = escapeRegex(params.search);
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { originalFileName: { $regex: search, $options: 'i' } },
    ];
  }
};

const listUserDocuments = async (userId, params = {}) => {
  const filters = { uploadedBy: userId, isDeleted: { $ne: true } };
  applyAdminListFilters(filters, params);
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
  applyAdminListFilters(filters, params);
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

const MANAGED_SORTS = {
  recent: '-createdAt',
  oldest: 'createdAt',
  title: 'title',
  views: '-views',
  downloads: '-downloads',
};

const parseDateBound = (value, label) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} invalide`, 400);
  return date;
};

/**
 * Sujets publies, pour l'ecran de gestion (edition des metadonnees, corbeille).
 * Meme perimetre que la suppression : l'admin voit tout, le sous-admin ses propres envois.
 */
const listManagedDocuments = async (params = {}, user) => {
  const filters = {
    status: 'approved',
    isDeleted: { $ne: true },
    documentType: { $ne: 'corrige' },
    type: { $ne: 'correction' },
  };
  if (user.role !== 'admin') filters.uploadedBy = user._id;

  if (params.search) {
    const search = escapeRegex(String(params.search).trim());
    filters.$or = ['title', 'titre', 'originalFileName', 'description'].map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    }));
  }

  if (params.dateFrom || params.dateTo) {
    filters.createdAt = {};
    if (params.dateFrom) filters.createdAt.$gte = parseDateBound(params.dateFrom, 'Date de debut');
    if (params.dateTo) filters.createdAt.$lte = parseDateBound(params.dateTo, 'Date de fin');
  }

  if (params.organismeId) {
    filters.noeudId = { $in: await Noeud.find({ organismeId: params.organismeId }).distinct('_id') };
  }

  const limit = Math.min(Math.max(Number.parseInt(params.limit, 10) || 10, 1), 100);
  const page = Math.max(Number.parseInt(params.page, 10) || 1, 1);
  const sort = MANAGED_SORTS[params.sort] || MANAGED_SORTS.recent;

  const [data, total] = await Promise.all([
    // _id departage les egalites pour une pagination stable.
    applyPopulate(Document.find(filters).sort(`${sort} _id`).skip((page - 1) * limit).limit(limit)),
    Document.countDocuments(filters),
  ]);

  return {
    data,
    pagination: { total, page, pages: Math.ceil(total / limit), limit },
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

  const subject = await Document.findOne({ _id: correctionFor, isDeleted: { $ne: true } });

  if (!subject) {
    throw new AppError('Document principal introuvable', 404);
  }

  if (subject.documentType === 'corrige' || subject.type === 'correction') {
    throw new AppError('Un corrige ne peut pas recevoir un autre corrige', 400);
  }

  return subject;
};

const activeCorrectionFilter = (subjectId) => ({
  isDeleted: { $ne: true },
  $or: [
    { type: 'correction', sujetParentId: subjectId },
    { documentType: 'corrige', correctionFor: subjectId },
  ],
});

const markPreviousCorrectionAsReplaced = async (subjectId, replacementId, userId) => {
  await Document.updateMany(
    { ...activeCorrectionFilter(subjectId), _id: { $ne: replacementId } },
    {
      $set: {
        isDeleted: true,
        deletionReason: 'correction-replaced',
        deletedAt: new Date(),
        deletedBy: userId,
      },
    }
  );
};

const resolveDynamicDocumentStatus = (payload, type) => {
  if (type === 'correction') return 'approved';
  if (payload.metadataStatus === 'false' || payload.publicationStatus === 'draft') return 'draft';
  if (payload.publicationStatus === 'approved') return 'approved';
  return 'pending';
};

const createDynamicDocument = async (payload, file, user) => {
  if (!file) throw new AppError('Aucun fichier a uploader', 400);
  const type = payload.type === 'correction' ? 'correction' : 'sujet';
  const uploadFile = await normalizeImageUploadToPdf(file);
  let subject = null;
  let context;

  if (type === 'correction') {
    if (!payload.sujetParentId) throw new AppError('Le sujet parent est obligatoire', 400);
    subject = await Document.findOne({
      _id: payload.sujetParentId,
      type: 'sujet',
      isDeleted: { $ne: true },
    });
    if (!subject) throw new AppError('Sujet parent introuvable', 404);
    context = await getLeafContext({ noeudId: subject.noeudId, matiereId: subject.matiereId });
    if (String(subject.noeudId) !== String(context.node._id) || String(subject.matiereId) !== String(context.matiere._id)) {
      throw new AppError('Le sujet parent est rattache a un catalogue invalide', 400);
    }
    assertCorrectionFile(uploadFile);
  } else {
    context = await getLeafContext({ noeudId: payload.noeudId, matiereId: payload.matiereId });
  }

  let parcoursType = null;
  if (type === 'correction') {
    parcoursType = subject.parcoursTypeId || null;
    if (payload.parcoursTypeId && String(payload.parcoursTypeId) !== String(parcoursType?._id || '')) {
      throw new AppError('Le type de parcours ne correspond pas au sujet parent', 400);
    }
  } else {
    const availableParcoursTypes = await ParcoursType.find({ organismeId: context.node.organismeId }).select('_id').lean();
    const hasParcoursType = payload.hasParcoursType === true || payload.hasParcoursType === 'true';
    const hasExplicitNoParcoursType = payload.hasParcoursType === false || payload.hasParcoursType === 'false';
    if (availableParcoursTypes.length && hasParcoursType) {
      if (!payload.parcoursTypeId) throw new AppError('Le type de parcours est obligatoire pour cet organisme', 400);
      parcoursType = availableParcoursTypes.find((item) => String(item._id) === String(payload.parcoursTypeId));
      if (!parcoursType) throw new AppError('Type de parcours introuvable pour cet organisme', 404);
    } else if (payload.parcoursTypeId || (availableParcoursTypes.length && !hasExplicitNoParcoursType)) {
      throw new AppError('Type de parcours introuvable pour cet organisme', 404);
    }
  }

  const storageProvider = getStorageProvider();
  const { extension, storedFileName, storageKey, fileType } = createStoragePayload(uploadFile, user._id.toString());
  await storageProvider.upload(storageKey, uploadFile.buffer, {
    contentType: uploadFile.mimetype,
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(uploadFile.originalname)}`,
    metadata: { originalFileName: uploadFile.originalname, uploadedBy: user._id.toString() },
  });

  const suppliedTitle = (payload.titre || payload.title || '').trim();
  const fallbackTitle = path.basename(uploadFile.originalname, path.extname(uploadFile.originalname));
  const title = suppliedTitle || (type === 'sujet' ? fallbackTitle : '');
  const status = resolveDynamicDocumentStatus(payload, type);
  const documentPayload = {
    type,
    documentType: type === 'correction' ? 'corrige' : 'sujet',
    titre: title || undefined,
    title: type === 'sujet' ? title : undefined,
    description: payload.description?.trim() || '',
    noeudId: context.node._id,
    matiereId: context.matiere._id,
    parcoursTypeId: parcoursType?._id || null,
    sujetParentId: type === 'correction' ? subject._id : null,
    correctionFor: type === 'correction' ? subject._id : null,
    fichierUrl: storageKey,
    dateAjout: new Date(),
    uploadedBy: user._id,
    file: storedFileName,
    originalFileName: uploadFile.originalname,
    fileType,
    extension,
    mimeType: uploadFile.mimetype,
    fileSize: uploadFile.size,
    storageKey,
    storageProvider: storageConfig.provider,
    status,
    validatedBy: status === 'approved' ? user._id : null,
    validatedAt: status === 'approved' ? new Date() : null,
  };

  const document = await Document.create(documentPayload);
  if (type === 'correction') await markPreviousCorrectionAsReplaced(subject._id, document._id, user._id);
  return getDocumentById(document._id);
};

const createDocument = async (payload, file, user) => {
  if (payload.type || payload.noeudId || payload.matiereId || payload.sujetParentId) {
    return createDynamicDocument(payload, file, user);
  }
  if (!file) {
    throw new AppError('Aucun fichier a uploader', 400);
  }

  const documentType = payload.documentType === 'corrige' ? 'corrige' : 'sujet';
  const isCorrection = documentType === 'corrige';
  const uploadFile = await normalizeImageUploadToPdf(file);

  let taxonomyNodes = [];
  if (isCorrection) {
    assertCorrectionFile(uploadFile);
    await assertCorrectionTarget(payload.correctionFor);
  } else {
    taxonomyNodes = await validateDocumentTaxonomy({
      institutionId: payload.institution,
      nodeIds: payload.taxonomyNodes,
      requireComplete: Boolean(payload.institution) && payload.metadataStatus !== 'false',
    });
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
      type: 'correction',
      sujetParentId: payload.correctionFor,
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
      contestType: payload.contestType || null,
      institution: payload.institution || null,
      taxonomyNodes,
      status: payload.metadataStatus === 'false' ? 'draft' : 'pending',
    };

  const document = await Document.create(documentPayload);

  if (isCorrection) await markPreviousCorrectionAsReplaced(payload.correctionFor, document._id, user._id);

  console.info(`[UPLOAD] user=${user._id} document=${document._id} file=${storedFileName} provider=${storageConfig.provider}`);
  return getDocumentById(document._id);
};

const createCorrectionDocument = async (documentId, file, user) =>
  createDocument({ documentType: 'corrige', correctionFor: documentId }, file, user);

const replaceDocumentFile = async (documentId, file, user) => {
  if (!file) throw new AppError('Aucun fichier a uploader', 400);
  const document = await Document.findById(documentId);
  assertDocumentMutationAccess(document, user);
  if (document.documentType === 'corrige' || document.type === 'correction') assertCorrectionFile(file);

  const uploadFile = await normalizeImageUploadToPdf(file);
  if (document.documentType === 'corrige' || document.type === 'correction') assertCorrectionFile(uploadFile);
  const storageProvider = getStorageProvider();
  const { extension, storedFileName, storageKey, fileType } = createStoragePayload(uploadFile, user._id.toString());
  await storageProvider.upload(storageKey, uploadFile.buffer, {
    contentType: uploadFile.mimetype,
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(uploadFile.originalname)}`,
  });
  const previousStorageKey = document.storageKey;
  document.file = storedFileName;
  document.originalFileName = uploadFile.originalname;
  document.fileType = fileType;
  document.extension = extension;
  document.mimeType = uploadFile.mimetype;
  document.fileSize = uploadFile.size;
  document.storageKey = storageKey;
  document.fichierUrl = storageKey;
  await document.save();
  if (previousStorageKey) {
    try { await storageProvider.delete(previousStorageKey); } catch (error) { console.warn(`[STORAGE_DELETE_WARNING] document=${documentId} key=${previousStorageKey} error=${error.message}`); }
  }
  return getDocumentById(document._id);
};

const updateDocument = async (documentId, payload, user) => {
  const document = await Document.findById(documentId);
  assertDocumentMutationAccess(document, user);

  if (document.documentType === 'corrige') {
    throw new AppError('Les metadonnees ne sont pas modifiables sur un corrige', 400);
  }

  const hasDynamicMetadata = payload.noeudId !== undefined
    || payload.matiereId !== undefined
    || payload.parcoursTypeId !== undefined
    || payload.hasParcoursType !== undefined;

  if (hasDynamicMetadata) {
    const noeudId = payload.noeudId || document.noeudId;
    const matiereId = payload.matiereId || document.matiereId;
    const context = await getLeafContext({ noeudId, matiereId });
    const hasParcoursType = payload.hasParcoursType === true || payload.hasParcoursType === 'true';
    const parcoursTypeId = payload.parcoursTypeId || null;

    if (hasParcoursType && !parcoursTypeId) {
      throw new AppError('Le type de parcours est obligatoire pour cet organisme', 400);
    }

    if (parcoursTypeId) {
      const parcoursType = await ParcoursType.findOne({
        _id: parcoursTypeId,
        organismeId: context.node.organismeId,
      });
      if (!parcoursType) throw new AppError('Type de parcours introuvable pour cet organisme', 404);
    }

    document.noeudId = context.node._id;
    document.matiereId = context.matiere._id;
    document.parcoursTypeId = parcoursTypeId;

    // Si le document reçoit des métadonnées dynamiques mais n'avait pas de type canonique,
    // on le définit comme 'sujet' (pour qu'il soit visible par les endpoints publics).
    if (!document.type) {
      document.type = 'sujet';
    }
  }

  const nextInstitution = payload.institution !== undefined
    ? payload.institution || null
    : document.institution;
  const nextTaxonomyNodes = payload.taxonomyNodes !== undefined
    ? payload.taxonomyNodes
    : document.taxonomyNodes;
  const taxonomyNodes = await validateDocumentTaxonomy({
    institutionId: nextInstitution,
    nodeIds: nextTaxonomyNodes,
    requireComplete: Boolean(nextInstitution) && (
      payload.metadataStatus !== 'false'
      && (
        payload.institution !== undefined
        || payload.taxonomyNodes !== undefined
        || payload.metadataStatus === 'true'
      )
    ),
  });

  const fields = ['title', 'description', 'university', 'department', 'level', 'semester', 'category', 'contestType', 'institution'];

  fields.forEach((field) => {
    if (payload[field] !== undefined) {
      document[field] = payload[field] || null;
    }
  });

  if (payload.taxonomyNodes !== undefined) {
    document.taxonomyNodes = taxonomyNodes;
  }

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
  document.deletionReason = 'manual';
  document.deletedAt = new Date();
  document.deletedBy = user._id;
  await document.save();

  if (document.type === 'sujet' || document.documentType === 'sujet') {
    await Document.updateMany(
      { ...activeCorrectionFilter(document._id) },
      {
        $set: {
          isDeleted: true,
          deletionReason: 'parent-subject-deleted',
          deletedAt: new Date(),
          deletedBy: user._id,
        },
      }
    );
  }

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
  document.deletionReason = 'manual';
  document.deletedAt = null;
  document.deletedBy = null;
  document.previousStatus = null;
  await document.save();

  if (document.type === 'sujet' || document.documentType === 'sujet') {
    await Document.updateMany(
      {
        $or: [
          { type: 'correction', sujetParentId: document._id },
          { documentType: 'corrige', correctionFor: document._id },
        ],
        isDeleted: true,
        deletionReason: 'parent-subject-deleted',
      },
      { $set: { isDeleted: false, deletedAt: null, deletedBy: null, deletionReason: 'manual' } }
    );
  }

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
  listDynamicDocuments,
  listUserDocuments,
  listPendingDocuments,
  listDraftDocuments,
  listManagedDocuments,
  getAnalytics,
  createDocument,
  createCorrectionDocument,
  replaceDocumentFile,
  markPreviousCorrectionAsReplaced,
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
