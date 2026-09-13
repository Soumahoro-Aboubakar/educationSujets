const LegacyRouteMetric = require('../models/LegacyRouteMetric');

const legacyRouteMetrics = (route) => (req, res, next) => {
  const day = new Date().toISOString().slice(0, 10);
  LegacyRouteMetric.findOneAndUpdate(
    { route, day },
    { $inc: { count: 1 } },
    { upsert: true, setDefaultsOnInsert: true }
  ).catch((error) => {
    console.warn(`[LEGACY_ROUTE_METRIC] route=${route} error=${error.message}`);
  });
  next();
};

module.exports = legacyRouteMetrics;