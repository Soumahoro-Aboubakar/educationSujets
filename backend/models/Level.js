
const mongoose = require('mongoose');

const LevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Veuillez ajouter un niveau d\'études'],
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

module.exports = mongoose.model('Level', LevelSchema);
