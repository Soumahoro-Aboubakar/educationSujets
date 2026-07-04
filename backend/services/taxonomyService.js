const AppError = require('../utils/errors');

const listEntities = async (Model, { filter = {}, populate = [], sort = 'name' } = {}) => {
  let query = Model.find(filter).sort(sort);

  populate.forEach((entry) => {
    query = query.populate(entry);
  });

  return query;
};

const createEntity = async (Model, payload, options = {}) => {
  const {
    parentField,
    populate = [],
    orderField,
  } = options;

  const name = payload.name?.trim();

  if (!name) {
    throw new AppError('Le nom est obligatoire', 400);
  }

  const lookup = { normalizedName: name.toLowerCase() };

  if (parentField) {
    lookup[parentField] = payload[parentField] || null;
  }

  let existingQuery = Model.findOne(lookup);
  populate.forEach((entry) => {
    existingQuery = existingQuery.populate(entry);
  });

  const existing = await existingQuery;

  if (existing) {
    return { entity: existing, created: false };
  }

  const data = {
    ...payload,
    name,
  };

  if (orderField && !Number.isFinite(Number(data[orderField]))) {
    const latest = await Model.findOne().sort(`-${orderField}`);
    data[orderField] = (latest?.[orderField] || 0) + 1;
  }

  const createdEntity = await Model.create(data);

  let hydratedQuery = Model.findById(createdEntity._id);
  populate.forEach((entry) => {
    hydratedQuery = hydratedQuery.populate(entry);
  });

  return {
    entity: await hydratedQuery,
    created: true,
  };
};

module.exports = {
  listEntities,
  createEntity,
};
