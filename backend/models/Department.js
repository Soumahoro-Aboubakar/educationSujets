
const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un nom de département'],
  },
  university: {
    type: mongoose.Schema.ObjectId,
    ref: 'University',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Department', DepartmentSchema);
