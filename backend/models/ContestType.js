const mongoose = require('mongoose');

const ContestTypeSchema = new mongoose.Schema({ //Desnitiner uniquement pour les concours, pas pour les matières
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un type de concours'],
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  abbreviation: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ContestTypeSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('ContestType', ContestTypeSchema);
