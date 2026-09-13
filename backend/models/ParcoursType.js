const mongoose = require('mongoose');
const normalizeText = require('../utils/normalizeText');

const ParcoursTypeSchema = new mongoose.Schema(
  {
    organismeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisme',
      required: true,
      index: true,
    },
    nom: {
      type: String,
      required: true,
      trim: true,
    },
    nomNormalise: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ParcoursTypeSchema.index(
  { organismeId: 1, nom: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 } }
);
ParcoursTypeSchema.index({ organismeId: 1, nomNormalise: 1 }, { unique: true });

ParcoursTypeSchema.pre('validate', function normalizeName(next) {
  if (this.nom) {
    this.nom = this.nom.trim();
    this.nomNormalise = normalizeText(this.nom);
  }
  next();
});

module.exports = mongoose.model('ParcoursType', ParcoursTypeSchema);
