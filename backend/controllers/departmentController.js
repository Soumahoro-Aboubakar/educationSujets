const Department = require('../models/Department');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getDepartments = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.university) {
    filter.university = req.query.university;
  }

  const departments = await listEntities(Department, {
    filter,
    populate: [{ path: 'university', select: 'name abbreviation' }],
    sort: 'name',
  });

  sendSuccess(res, { data: departments });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(Department, req.body, {
    parentField: 'university',
    populate: [{ path: 'university', select: 'name abbreviation' }],
  });

  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Departement cree' : 'Departement deja existant',
    data: entity,
  });
});
