const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');
const City = require('../models/City');
const Region = require('../models/Region');
const BacSeries = require('../models/BacSeries');
const BacSubject = require('../models/BacSubject');
const FormationCatalog = require('../models/FormationCatalog');

const getModel = (modelName) => {
  switch (modelName) {
    case 'cities': return City;
    case 'regions': return Region;
    case 'bac-series': return BacSeries;
    case 'bac-subjects': return BacSubject;
    case 'formations': return FormationCatalog;
    default: throw new AppError('Type de référentiel inconnu', 400);
  }
};

const buildQuery = (req) => {
  const { search, active, page = 1, limit = 10 } = req.query;
  const query = {};
  if (active !== undefined) query.active = active === 'true';
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { name: regex },
      { code: regex },
      { id: regex },
      { nomEtablissement: regex },
      { filiere: regex },
      { ville: regex },
      { region: regex },
      { category: regex },
      { typeEtablissement: regex },
    ];
  }
  return { query, page: Number(page), limit: Number(limit) };
};

const canDeleteReferential = async (modelName, record) => {
  if (modelName === 'cities') {
    const referenced = await FormationCatalog.exists({
      $or: [{ ville: record.name }, { region: record.name }],
    });
    return !referenced;
  }

  if (modelName === 'regions') {
    const referenced = await FormationCatalog.exists({ region: record.name });
    return !referenced;
  }

  if (modelName === 'bac-series') {
    const referenced = await FormationCatalog.exists({ 'conditions.bacsAcceptes': record._id });
    return !referenced;
  }

  return true;
};

const listReferentials = asyncHandler(async (req, res) => {
  const { model } = req.params;
  const Model = getModel(model);
  const { query, page, limit } = buildQuery(req);
  const data = await Model.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Model.countDocuments(query);
  sendSuccess(res, {
    data,
    meta: { pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } },
  });
});

const createReferential = asyncHandler(async (req, res) => {
  const { model } = req.params;
  const Model = getModel(model);
  const payload = { ...req.body };
  try {
    const record = await Model.create(payload);
    sendSuccess(res, { statusCode: 201, message: 'Référentiel créé', data: record });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Un référentiel identique existe déjà', 409);
    }
    throw error;
  }
});

const updateReferential = asyncHandler(async (req, res) => {
  const { model, id } = req.params;
  const Model = getModel(model);
  try {
    const record = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!record) throw new AppError('Référentiel introuvable', 404);
    sendSuccess(res, { message: 'Référentiel mis à jour', data: record });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('Un référentiel identique existe déjà', 409);
    }
    throw error;
  }
});

const deleteReferential = asyncHandler(async (req, res) => {
  const { model, id } = req.params;
  const Model = getModel(model);
  const record = await Model.findById(id);
  if (!record) throw new AppError('Référentiel introuvable', 404);

  const canDelete = await canDeleteReferential(model, record);
  if (!canDelete) {
    throw new AppError('Ce référentiel est encore utilisé par des catalogues de formations', 409);
  }

  await Model.findByIdAndDelete(id);
  sendSuccess(res, { message: 'Référentiel supprimé', data: record });
});

module.exports = {
  listReferentials,
  createReferential,
  updateReferential,
  deleteReferential,
};
