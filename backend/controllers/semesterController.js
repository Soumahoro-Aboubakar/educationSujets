const Semester = require('../models/Semester');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getSemesters = asyncHandler(async (req, res) => {
  const semesters = await listEntities(Semester, { sort: 'order name' });
  sendSuccess(res, { data: semesters });
});

exports.createSemester = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(Semester, req.body, { orderField: 'order' });
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Semestre cree' : 'Semestre deja existant',
    data: entity,
  });
});
