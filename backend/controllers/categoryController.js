const Category = require('../models/Category');
const { listEntities, createEntity } = require('../services/taxonomyService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await listEntities(Category, { sort: 'name' });
  sendSuccess(res, { data: categories });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { entity, created } = await createEntity(Category, req.body);
  sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Categorie creee' : 'Categorie deja existante',
    data: entity,
  });
});
