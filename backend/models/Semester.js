
const mongoose = require('mongoose');

const SemesterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un semestre'],
  },
  order: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Semester', SemesterSchema);
