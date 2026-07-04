const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Veuillez ajouter un titre'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    file: {
      type: String,
      required: [true, 'Veuillez ajouter un fichier'],
      unique: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      trim: true,
    },
    extension: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },
    storageKey: {
      type: String,
      trim: true,
    },
    storageProvider: {
      type: String,
      enum: ['r2', 'b2', 'legacy-local'],
      required: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      default: null,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      default: null,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      default: null,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
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
      min: 0,
    },
    downloads: {
      type: Number,
      default: 0,
      min: 0,
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    validatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ university: 1, department: 1, level: 1, semester: 1, category: 1 });
DocumentSchema.index({ storageKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Document', DocumentSchema);
