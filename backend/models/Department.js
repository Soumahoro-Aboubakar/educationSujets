const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom de departement'],
    trim: true,
  },
  normalizedName: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

DepartmentSchema.index({ normalizedName: 1, university: 1 }, { unique: true });

DepartmentSchema.pre('validate', function normalizeName(next) {
  if (this.name) {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLowerCase();
  }

  next();
});

module.exports = mongoose.model('Department', DepartmentSchema);
