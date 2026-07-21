const mongoose = require('mongoose');

const FormationCatalogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Veuillez renseigner l’identifiant du catalogue'],
    trim: true,
    unique: true,
  },
  nomEtablissement: {
    type: String,
    trim: true,
    default: '',
  },
  filiere: {
    type: String,
    trim: true,
    default: '',
  },
  typeEtablissement: {
    type: String,
    trim: true,
    default: '',
  },
  ville: {
    type: String,
    trim: true,
    default: '',
  },
  region: {
    type: String,
    trim: true,
    default: '',
  },
  modeAcces: {
    type: String,
    trim: true,
    default: '',
  },
  prix: {
    type: Number,
    default: 0,
  },
  duree: {
    type: Number,
    default: 0,
  },
  ageLimite: {
    type: Number,
    default: 0,
  },
  conditions: {
    bacsAcceptes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BacSeries',
    }],
    notesMinimales: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  debouches: [{ type: String, trim: true }],
  scoreWeights: {
    type: Map,
    of: Number,
    default: {},
  },
  bourses: {
    disponible: { type: Boolean, default: false },
    montant: { type: Number, default: 0 },
  },
  logement: { type: Boolean, default: false },
  alternance: { type: Boolean, default: false },
  taux_employabilite: { type: Number, default: 0 },
  partenaires: [{ type: String, trim: true }],
  stages: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormationCatalog', FormationCatalogSchema);
