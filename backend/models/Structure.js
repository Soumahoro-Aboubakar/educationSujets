const mongoose = require('mongoose');

const NiveauSchema = new mongoose.Schema(
  {
    ordre: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z][a-z0-9_-]*$/,
    },
    libelleSingulier: {
      type: String,
      required: true,
      trim: true,
    },
    libellePluriel: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const StructureSchema = new mongoose.Schema(
  {
    organismeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisme',
      required: true,
      unique: true,
    },
    niveaux: {
      type: [NiveauSchema],
      required: true,
      validate: [
        {
          validator: (niveaux) => Array.isArray(niveaux) && niveaux.length > 0,
          message: 'Une structure doit contenir au moins un niveau',
        },
        {
          validator: (niveaux) => niveaux.every((niveau, index) => niveau.ordre === index + 1),
          message: 'Les niveaux doivent avoir des ordres consecutifs commencant a 1',
        },
        {
          validator: (niveaux) => new Set(niveaux.map((niveau) => niveau.type)).size === niveaux.length,
          message: 'Un type de niveau ne peut apparaitre qu une seule fois',
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Structure', StructureSchema);