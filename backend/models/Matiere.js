const mongoose = require('mongoose');
const normalizeText = require('../utils/normalizeText');

const MatiereSchema = new mongoose.Schema(
  {
    organismeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisme',
      required: true,
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

MatiereSchema.index(
  { organismeId: 1, nom: 1 },
  { unique: true, collation: { locale: 'fr', strength: 2 } }
);
MatiereSchema.index({ organismeId: 1, nomNormalise: 1 }, { unique: true });

MatiereSchema.pre('validate', function normalizeName(next) {
  if (this.nom) this.nomNormalise = normalizeText(this.nom);
  next();
});

module.exports = mongoose.model('Matiere', MatiereSchema);