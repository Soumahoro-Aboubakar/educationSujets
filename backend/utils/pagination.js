const { pagination: bounds } = require('../config/security');

/**
 * Pagination bornée : `limit` entre 1 et 100, `page` entre 1 et 500. Une page très lointaine
 * obligerait MongoDB à parcourir puis jeter des centaines de milliers de documents (`skip`).
 */
const parsePagination = (params = {}, { defaultLimit = 12, maxLimit = bounds.maxLimit } = {}) => {
  const limit = Math.min(Math.max(Number.parseInt(params.limit, 10) || defaultLimit, 1), maxLimit);
  const page = Math.min(Math.max(Number.parseInt(params.page, 10) || 1, 1), bounds.maxPage);
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { parsePagination };
