const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter une categorie'],
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  icon: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

CategorySchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('Category', CategorySchema);
