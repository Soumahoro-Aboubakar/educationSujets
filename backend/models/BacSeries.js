const mongoose = require('mongoose');

const BacSeriesSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Veuillez ajouter un code de série'],
    trim: true,
    uppercase: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom de série'],
    trim: true,
  },
  normalizedName: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
    unique: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

BacSeriesSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

module.exports = mongoose.model('BacSeries', BacSeriesSchema);
