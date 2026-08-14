const ContestType = require('../models/ContestType');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getContestTypes = asyncHandler(async (req, res) => {
  const items = await listEntities(ContestType, { sort: 'name' });
  sendSuccess(res, { data: items });
});

exports.createContestType = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(ContestType, req.body);
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Type de concours créé' : 'Type déjà existant',
    data: entity,
  });
});

exports.updateContestType = asyncHandler(async (req, res) => {
  const updated = await ContestType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  sendSuccess(res, { data: updated });
});

exports.deleteContestType = asyncHandler(async (req, res) => {
  await ContestType.findByIdAndDelete(req.params.id);
  sendSuccess(res, { message: 'Type de concours supprimé' });
});
