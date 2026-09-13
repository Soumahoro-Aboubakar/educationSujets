const Institution = require('../models/Institution');
const TaxonomyNode = require('../models/TaxonomyNode');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');
const {
  normalizeNavigationStructure,
  assertStructureCanBeChanged,
} = require('../services/catalogService');

const findInstitution = (id) => Institution.findById(id);

exports.listInstitutions = asyncHandler(async (req, res) => {
  const institutions = await Institution.find({ isActive: true }).sort('name').lean();
  sendSuccess(res, { data: institutions });
});

exports.createInstitution = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) throw new AppError('Le nom de l institution est obligatoire', 400);

  const existing = await Institution.findOne({ normalizedName: name.toLowerCase() });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      if (req.body.navigationStructure) {
        existing.navigationStructure = normalizeNavigationStructure(req.body.navigationStructure);
      }
      await existing.save();
    }
    return sendSuccess(res, { data: existing, message: 'Institution deja existante' });
  }

  const navigationStructure = req.body.navigationStructure
    ? normalizeNavigationStructure(req.body.navigationStructure)
    : ['year', 'subject'];

  const institution = await Institution.create({
    name,
    abbreviation: req.body.abbreviation,
    navigationStructure,
  });
  sendSuccess(res, { statusCode: 201, data: institution, message: 'Institution creee' });
});

exports.getInstitution = asyncHandler(async (req, res) => {
  const institution = await findInstitution(req.params.id);
  if (!institution) throw new AppError('Institution introuvable', 404);
  sendSuccess(res, { data: institution });
});

exports.updateInstitution = asyncHandler(async (req, res) => {
  const institution = await findInstitution(req.params.id);
  if (!institution) throw new AppError('Institution introuvable', 404);

  if (req.body.navigationStructure !== undefined) {
    const navigationStructure = normalizeNavigationStructure(req.body.navigationStructure);
    await assertStructureCanBeChanged(institution, navigationStructure);
    institution.navigationStructure = navigationStructure;
  }

  ['name', 'abbreviation', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) institution[field] = req.body[field];
  });
  await institution.save();
  sendSuccess(res, { data: institution, message: 'Institution mise a jour' });
});

exports.getStructure = asyncHandler(async (req, res) => {
  const institution = await findInstitution(req.params.id);
  if (!institution) throw new AppError('Institution introuvable', 404);

  const requestedParent = req.query.parent;
  const parent = requestedParent && requestedParent !== 'root' ? requestedParent : null;
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const filter = { institution: institution._id, parent, isActive: true };
  const [nodes, total] = await Promise.all([
    TaxonomyNode.find(filter)
    .sort({ order: 1, name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),
    TaxonomyNode.countDocuments(filter),
  ]);
  sendSuccess(res, {
    data: { institution, nodes },
    meta: { pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
  });
});

exports.updateStructure = asyncHandler(async (req, res) => {
  const institution = await findInstitution(req.params.id);
  if (!institution) throw new AppError('Institution introuvable', 404);
  const navigationStructure = normalizeNavigationStructure(req.body.navigationStructure);
  await assertStructureCanBeChanged(institution, navigationStructure);
  institution.navigationStructure = navigationStructure;
  await institution.save();
  sendSuccess(res, { data: institution, message: 'Structure mise a jour' });
});
