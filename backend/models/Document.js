const mongoose = require('mongoose');

const metadataDefault = function metadataDefault() {
  return this.documentType === 'corrige' ? undefined : null;
};

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: function() { return this.status !== 'draft' && this.documentType !== 'corrige'; },
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: function descriptionDefault() {
        return this.documentType === 'corrige' ? undefined : '';
      },
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
      default: metadataDefault,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: metadataDefault,
    },
    level: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Level',
      default: metadataDefault,
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      default: metadataDefault,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: metadataDefault,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
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
    isPremmuim: {
      type: Boolean,
      default: false,
    },
    documentType: {
      type: String,
      enum: ['sujet', 'corrige'],
      default: 'sujet',
    },
    correctionFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
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
    // ── Soft-delete / Corbeille ────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    previousStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', null],
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

DocumentSchema.virtual('correction', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'correctionFor',
  justOne: true,
});

DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ isDeleted: 1, deletedAt: 1 });
DocumentSchema.index({ university: 1, department: 1, level: 1, semester: 1, category: 1 });
DocumentSchema.index({ storageKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Document', DocumentSchema);
