const AppError = require('../utils/errors');

const toArray = (value) => {
  if (value === undefined || value === null || value === '') return undefined;

  if (Array.isArray(value)) {
    return value.flatMap((item) => toArray(item) || []);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) throw new Error('not-array');
        return parsed;
      } catch (error) {
        throw new AppError('Les elements de structure doivent etre une liste JSON valide', 400);
      }
    }
    return [trimmed];
  }

  return value;
};

const normalizeDocumentPayload = (req, res, next) => {
  try {
    const values = toArray(req.body.taxonomyNodes);
    if (values !== undefined) req.body.taxonomyNodes = values;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = normalizeDocumentPayload;
