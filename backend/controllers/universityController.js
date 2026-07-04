const University = require('../models/University');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getUniversities = asyncHandler(async (req, res) => {
  const universities = await listEntities(University, { sort: 'name' });
  sendSuccess(res, { data: universities });
});

exports.createUniversity = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(University, req.body);
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Universite creee' : 'Universite deja existante',
    data: entity,
  });
});
