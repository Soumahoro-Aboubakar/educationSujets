const mongoose = require('mongoose');
const normalizeText = require('../utils/normalizeText');

const OrganismeSchema = new mongoose.Schema(
  {
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
    logo: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    parcoursTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParcoursType',
      default: null,
    },
    hasParcoursType: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

OrganismeSchema.index(
  { nom: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 } }
);
OrganismeSchema.index({ nomNormalise: 1 }, { unique: true });

OrganismeSchema.pre('validate', function normalizeName(next) {
  if (this.nom) this.nomNormalise = normalizeText(this.nom);
  next();
});

module.exports = mongoose.model('Organisme', OrganismeSchema);