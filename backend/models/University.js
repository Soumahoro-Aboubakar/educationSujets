const mongoose = require('mongoose');

const UniversitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Veuillez ajouter un nom d'universite"],
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UniversitySchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('University', UniversitySchema);
