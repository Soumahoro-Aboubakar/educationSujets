const mongoose = require('mongoose');
const normalizeText = require('../utils/normalizeText');

const NoeudSchema = new mongoose.Schema(
  {
    organismeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisme',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Noeud',
      default: null,
    },
    ordreNiveau: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
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
  },
  { timestamps: true }
);

NoeudSchema.index(
  { organismeId: 1, parentId: 1, nom: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 } }
);
NoeudSchema.index({ organismeId: 1, parentId: 1, nomNormalise: 1 }, { unique: true });
NoeudSchema.index({ organismeId: 1, parentId: 1, ordreNiveau: 1, nom: 1 });

NoeudSchema.pre('validate', function normalizeName(next) {
  if (this.nom) this.nomNormalise = normalizeText(this.nom);
  next();
});

module.exports = mongoose.model('Noeud', NoeudSchema);