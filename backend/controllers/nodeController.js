const TaxonomyNode = require('../models/TaxonomyNode');
const Document = require('../models/Document');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');
const { validateNodePlacement } = require('../services/catalogService');

const validateNodePayload = async (payload, nodeId) => {
  const { institution, parent = null, type, name } = payload;
  if (!name?.trim() || !type) throw new AppError('Le type et le nom sont obligatoires', 400);

  const placement = await validateNodePlacement({
    institutionId: institution,
    parentId: parent,
    type,
    nodeId,
  });

  return {
    institution: placement.institution._id,
    parent: placement.parent?._id || null,
    type: placement.type,
    name: name.trim(),
  };
};

exports.listNodes = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.institution) filter.institution = req.query.institution;
  if (req.query.parent === 'root') filter.parent = null;
  else if (req.query.parent) filter.parent = req.query.parent;
  if (req.query.type) filter.type = String(req.query.type).toLowerCase();

  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const [nodes, total] = await Promise.all([
    TaxonomyNode.find(filter)
      .sort({ order: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TaxonomyNode.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: nodes,
    meta: { pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

exports.createNode = asyncHandler(async (req, res) => {
  const payload = await validateNodePayload(req.body);
  const normalizedName = payload.name.toLowerCase();
  const existing = await TaxonomyNode.findOne({
    institution: payload.institution,
    parent: payload.parent,
    type: payload.type,
    normalizedName,
  });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.order = req.body.order ?? existing.order;
      existing.metadata = req.body.metadata ?? existing.metadata;
      await existing.save();
    }
    return sendSuccess(res, { data: existing, message: 'Element deja existant' });
  }

  const node = await TaxonomyNode.create({
    ...payload,
    normalizedName,
    order: req.body.order ?? 0,
    metadata: req.body.metadata,
  });
  sendSuccess(res, { statusCode: 201, data: node, message: 'Element cree' });
});

exports.updateNode = asyncHandler(async (req, res) => {
  const node = await TaxonomyNode.findById(req.params.id);
  if (!node) throw new AppError('Element introuvable', 404);

  if (req.body.institution && String(req.body.institution) !== String(node.institution)) {
    throw new AppError('Un element ne peut pas changer d institution', 400);
  }

  if (req.body.parent !== undefined || req.body.type !== undefined) {
    const payload = await validateNodePayload({
      institution: node.institution,
      parent: req.body.parent !== undefined ? req.body.parent : node.parent,
      type: req.body.type !== undefined ? req.body.type : node.type,
      name: req.body.name !== undefined ? req.body.name : node.name,
    }, node._id);
    node.parent = payload.parent;
    node.type = payload.type;
  }

  if (req.body.name !== undefined) {
    if (!req.body.name?.trim()) throw new AppError('Le nom est obligatoire', 400);
    node.name = req.body.name.trim();
    node.normalizedName = node.name.toLowerCase();
  }

  const duplicate = await TaxonomyNode.exists({
    _id: { $ne: node._id },
    institution: node.institution,
    parent: node.parent,
    type: node.type,
    normalizedName: node.normalizedName,
  });
  if (duplicate) throw new AppError('Un element portant ce nom existe deja a ce niveau', 409);

  ['order', 'metadata', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) node[field] = req.body[field];
  });
  await node.save();
  sendSuccess(res, { data: node, message: 'Element mis a jour' });
});

exports.deleteNode = asyncHandler(async (req, res) => {
  const node = await TaxonomyNode.findById(req.params.id);
  if (!node) throw new AppError('Element introuvable', 404);

  const [childCount, documentExists] = await Promise.all([
    TaxonomyNode.countDocuments({ parent: node._id, isActive: true }),
    Document.exists({ taxonomyNodes: node._id, isDeleted: { $ne: true } }),
  ]);
  if (childCount) throw new AppError('Supprimez d abord les elements enfants', 409);
  if (documentExists) throw new AppError('Cet element est encore utilise par un document', 409);

  node.isActive = false;
  await node.save();
  sendSuccess(res, { data: {}, message: 'Element supprime' });
});
