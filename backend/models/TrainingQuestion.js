const mongoose = require('mongoose');

const TrainingQuestionSchema = new mongoose.Schema({
  // A contest is represented by the existing Category taxonomy, keeping the
  // document and interactive-training catalogs aligned.
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Le concours est obligatoire'],
    index: true,
  },
  question: {
    type: String,
    required: [true, 'La question est obligatoire'],
    trim: true,
    maxlength: 1200,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (options) => Array.isArray(options) && options.length >= 2 && options.length <= 6,
      message: 'Une question doit comporter entre deux et six réponses',
    },
  },
  correctIndex: {
    type: Number,
    required: [true, 'La bonne réponse est obligatoire'],
    min: 0,
    validate: {
      validator: function validateOptionIndex(value) {
        return Number.isInteger(value) && value < (this.options?.length || 0);
      },
      message: 'La bonne réponse doit correspondre à une proposition',
    },
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 1600,
    default: '',
  },
  position: {
    type: Number,
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

TrainingQuestionSchema.index({ category: 1, active: 1, position: 1 });

module.exports = mongoose.model('TrainingQuestion', TrainingQuestionSchema);
