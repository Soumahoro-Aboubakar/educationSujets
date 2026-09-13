const mongoose = require('mongoose');

const metadataDefault = function metadataDefault() {
  return this.documentType === 'corrige' ? undefined : null;
};

const DocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: function () { return this.status !== 'draft' && this.documentType !== 'corrige'; },
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
    contestType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContestType',
      default: metadataDefault,
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
    },
    // Canonical dynamic catalog references. Legacy fields above remain for compatibility.
    noeudId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Noeud',
      default: null,
    },
    matiereId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Matiere',
      default: null,
    },
      parcoursTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParcoursType',
        default: null,
      },
    taxonomyNodes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaxonomyNode',
    }],
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
    type: {
      type: String,
      enum: ['sujet', 'correction'],
    },
    correctionFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    sujetParentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      validate: {
        validator(value) {
          if (this.type === 'correction') return Boolean(value);
          if (this.type === 'sujet') return !value;
          return true;
        },
        message: 'Une correction doit avoir un sujet parent et un sujet ne peut pas en avoir',
      },
    },
    titre: {
      type: String,
      trim: true,
    },
    fichierUrl: {
      type: String,
      trim: true,
    },
    dateAjout: {
      type: Date,
      default: Date.now,
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
    deletionReason: {
      type: String,
      enum: ['manual', 'correction-replaced', 'parent-subject-deleted'],
      default: 'manual',
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
  match: { documentType: 'corrige', isDeleted: { $ne: true } },
});

DocumentSchema.virtual('dynamicCorrection', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'sujetParentId',
  justOne: true,
  match: { type: 'correction', isDeleted: { $ne: true } },
});

DocumentSchema.index({ status: 1, createdAt: -1 });
DocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
DocumentSchema.index({ isDeleted: 1, deletedAt: 1 });
DocumentSchema.index({ university: 1, department: 1, level: 1, semester: 1, category: 1, contestType: 1 });
DocumentSchema.index({ institution: 1, taxonomyNodes: 1, documentType: 1, status: 1 });
DocumentSchema.index({ noeudId: 1, matiereId: 1, type: 1, status: 1, isDeleted: 1 });
DocumentSchema.index({ sujetParentId: 1, type: 1 });
DocumentSchema.index({ storageKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Document', DocumentSchema);
