const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un semestre'],
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
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

SemesterSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('Semester', SemesterSchema);
