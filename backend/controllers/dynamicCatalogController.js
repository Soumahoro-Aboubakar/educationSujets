const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const service = require('../services/dynamicCatalogService');
const Noeud = require('../models/Noeud');

exports.listOrganismes = asyncHandler(async (req, res) => {
  const result = await service.listOrganismes(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.listParcoursTypes = asyncHandler(async (req, res) => {
  const data = await service.listParcoursTypes({ organismeId: req.params.organismeId });
  sendSuccess(res, { data });
});

exports.createParcoursType = asyncHandler(async (req, res) => {
  const data = await service.createParcoursType({ organismeId: req.params.organismeId, nom: req.body.nom, isDefault: req.body.isDefault !== false });
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
  const result = await service.listNoeuds(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.upsertNoeud = asyncHandler(async (req, res) => {
  const noeud = await service.upsertNoeud(req.body);
  sendSuccess(res, { data: noeud, message: 'Noeud existant ou cree' });
});

exports.listMatieres = asyncHandler(async (req, res) => {
  const result = await service.listMatieres(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.upsertMatiere = asyncHandler(async (req, res) => {
  const matiere = await service.upsertMatiere(req.body);
  sendSuccess(res, { data: matiere, message: 'Matiere existante ou creee' });
});

exports.listPublishedOrganismes = asyncHandler(async (req, res) => {
  const result = await service.listPublishedOrganismes(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.listPublishedNoeuds = asyncHandler(async (req, res) => {
  const result = await service.listPublishedNoeuds(req.query);
  sendSuccess(res, {
    data: result.data,
    meta: { pagination: result.pagination, organisme: result.organisme, structure: result.structure },
  });
});

exports.listPublishedMatieres = asyncHandler(async (req, res) => {
  const result = await service.listPublishedMatieres(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});
