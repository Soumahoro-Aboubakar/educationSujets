
const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Veuillez ajouter un titre'],
  },
  description: {
    type: String,
  },
  file: {
    type: String,
    required: [true, 'Veuillez ajouter un fichier'],
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  university: {
    type: mongoose.Schema.ObjectId,
    ref: 'University',
    required: true,
  },
  department: {
    type: mongoose.Schema.ObjectId,
    ref: 'Department',
    required: true,
  },
  level: {
    type: mongoose.Schema.ObjectId,
    ref: 'Level',
    required: true,
  },
  semester: {
    type: mongoose.Schema.ObjectId,
    ref: 'Semester',
    required: true,
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  views: {
    type: Number,
    default: 0,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  validatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  validatedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Document', DocumentSchema);
