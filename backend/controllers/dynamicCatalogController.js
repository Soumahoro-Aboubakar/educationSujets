const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const service = require('../services/dynamicCatalogService');
const Noeud = require('../models/Noeud');
const logos = require('../services/organismeLogoService');
const Revision = require('../models/CatalogRevision');
const scope = req => ({ ...req.query, includeUnpublished: req.query.scope === 'admin' && req.user?.role === 'admin' });
const catalogRevision = async () => (await Revision.findById('catalog').lean())?.revision || 0;
exports.patchCatalog = kind => asyncHandler(async (req, res) => {
  const data = await require('../services/catalogLifecycleService').patch(kind, req.params.id, req.body, req.user._id);
  sendSuccess(res, { data, meta: { revision: await catalogRevision() } });
});

const AppError = require('../utils/errors');

exports.listOrganismes = asyncHandler(async (req, res) => {
  const result = await service.listOrganismes(scope(req));
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination, revision: await catalogRevision() } });
});

exports.listParcoursTypes = asyncHandler(async (req, res) => {
  const data = await service.listParcoursTypes({ organismeId: req.params.organismeId, ...scope(req) });
  const total = await require('../models/ParcoursType').countDocuments({ organismeId: req.params.organismeId, ...(scope(req).includeUnpublished ? {} : { status: { $nin: ['draft', 'archived'] } }) });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));
  sendSuccess(res, { data, meta: { pagination: { page, limit, total, pages: Math.ceil(total / limit) }, revision: await catalogRevision() } });
});

exports.createParcoursType = asyncHandler(async (req, res) => {
  const data = await service.createParcoursType({ organismeId: req.params.organismeId, nom: req.body.nom, isDefault: req.body.isDefault !== false, status: req.body.status });
  sendSuccess(res, { statusCode: 201, data, message: 'Type de parcours cree' });
});

exports.createOrganisme = asyncHandler(async (req, res) => {
  const organisme = await service.createOrganisme(req.body);
  sendSuccess(res, { statusCode: 201, data: organisme, message: 'Organisme cree' });
});

exports.getStructure = asyncHandler(async (req, res) => {
  const organisme = await service.getOrganismeOrThrow(req.params.organismeId);
  const [structure, nodeCount] = await Promise.all([
    service.ensureDefaultStructure(organisme._id),
    Noeud.countDocuments({ organismeId: organisme._id }),
  ]);
  sendSuccess(res, { data: { organisme, structure, nodeCount } });
});

exports.saveStructure = asyncHandler(async (req, res) => {
  const structure = await service.saveStructure(req.params.organismeId, req.body.niveaux);
  sendSuccess(res, { data: structure, message: 'Structure enregistree' });
});

exports.listNoeuds = asyncHandler(async (req, res) => {
  const result = await service.listNoeuds(scope(req));
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination, revision: await catalogRevision() } });
});

exports.upsertNoeud = asyncHandler(async (req, res) => {
  const noeud = await service.upsertNoeud(req.body);
  sendSuccess(res, { data: noeud, message: 'Noeud existant ou cree' });
});

exports.listMatieres = asyncHandler(async (req, res) => {
  const result = await service.listMatieres(scope(req));
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination, revision: await catalogRevision() } });
});

exports.upsertMatiere = asyncHandler(async (req, res) => {
  const matiere = await service.upsertMatiere(req.body);
  sendSuccess(res, { data: matiere, message: 'Matiere existante ou creee' });
});

exports.listPublishedOrganismes = asyncHandler(async (req, res) => {
  const result = await service.listPublishedOrganismes(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination, revision: await catalogRevision() } });
});

exports.listPublishedNoeuds = asyncHandler(async (req, res) => {
  const result = await service.listPublishedNoeuds(req.query);
  sendSuccess(res, {
    data: result.data,
    meta: { pagination: result.pagination, revision: await catalogRevision(), organisme: result.organisme, structure: result.structure },
  });
});

exports.listPublishedMatieres = asyncHandler(async (req, res) => {
  const result = await service.listPublishedMatieres(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination, revision: await catalogRevision() } });
});

// ── Logos des organismes (administration web) ─────────────────────────────

exports.setOrganismeLogo = asyncHandler(async (req, res) => {
  const data = await logos.setOrganismeLogo(req.params.organismeId, { file: req.file, url: req.body?.url || req.body?.logo });
  sendSuccess(res, { data, message: 'Logo enregistre' });
});

exports.removeOrganismeLogo = asyncHandler(async (req, res) => {
  const data = await logos.removeOrganismeLogo(req.params.organismeId);
  sendSuccess(res, { data, message: 'Logo supprime' });
});

/** Logo stocké : redirection vers une URL signée, mise en cache par le navigateur. */
exports.getOrganismeLogo = asyncHandler(async (req, res) => {
  const url = await logos.resolveStoredLogoUrl(req.params.organismeId);
  if (!url) throw new AppError('Logo introuvable', 404);
  res.set('Cache-Control', `public, max-age=${Math.floor(logos.SIGNED_URL_SECONDS / 2)}`);
  res.redirect(302, url);
});
