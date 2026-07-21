const mongoose = require('mongoose');

const BacSubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom de matière'],
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  coefficient: {
    type: Number,
    default: 1,
    min: 0,
  },
  category: {
    type: String,
    trim: true,
    default: 'Autre',
  },
  series: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BacSeries',
  }],
  active: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

BacSubjectSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('BacSubject', BacSubjectSchema);
