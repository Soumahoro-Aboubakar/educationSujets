const mongoose = require('mongoose');

/**
 * Code de parrainage d'un utilisateur. L'état ACTIVE/INACTIVE est dérivé :
 *  - `adminOverride` s'il est défini (action administrative explicite) ;
 *  - sinon, actif si et seulement si le propriétaire a un abonnement actif.
 */
const PromoCodeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    adminOverride: { type: String, enum: ['ACTIVE', 'INACTIVE', null], default: null },
    history: [
      {
        action: { type: String, required: true },
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isAdminAction: { type: Boolean, default: false },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoCode', PromoCodeSchema);
