const mongoose = require('mongoose');

const InstitutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, lowercase: true, trim: true },
    abbreviation: { type: String, trim: true, default: '' },
    navigationStructure: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: ['year', 'subject'],
      validate: {
        validator: (value) => Array.isArray(value)
          && value.length >= 2
          && value.at(-1) === 'subject'
          && new Set(value).size === value.length
          && value.every((item) => /^[a-z][a-z0-9_-]*$/.test(item)),
        message: 'La structure est invalide',
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

InstitutionSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Institution', InstitutionSchema);
