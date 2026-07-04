const Level = require('../models/Level');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getLevels = asyncHandler(async (req, res) => {
  const levels = await listEntities(Level, { sort: 'order name' });
  sendSuccess(res, { data: levels });
});

exports.createLevel = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(Level, req.body, { orderField: 'order' });
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Niveau cree' : 'Niveau deja existant',
    data: entity,
  });
});
