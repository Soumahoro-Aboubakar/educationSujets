const mongoose = require('mongoose');

const LegacyRouteMetricSchema = new mongoose.Schema(
  {
    route: { type: String, required: true, enum: ['institutions', 'nodes'] },
    day: { type: String, required: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

LegacyRouteMetricSchema.index({ route: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('LegacyRouteMetric', LegacyRouteMetricSchema);