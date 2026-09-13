const mongoose = require('mongoose');

const TaxonomyNodeSchema = new mongoose.Schema(
  {
    institution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'TaxonomyNode', default: null },
    type: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, lowercase: true, trim: true },
    order: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TaxonomyNodeSchema.index(
  { institution: 1, parent: 1, type: 1, normalizedName: 1 },
  { unique: true }
);
TaxonomyNodeSchema.index({ institution: 1, parent: 1, order: 1, name: 1 });

TaxonomyNodeSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('TaxonomyNode', TaxonomyNodeSchema);