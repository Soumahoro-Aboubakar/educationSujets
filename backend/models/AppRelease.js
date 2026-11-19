const mongoose = require('mongoose');

/*
 * Politique de mise à jour de l'application native, une par plateforme (réglée dans l'administration) :
 * dernière version publiée sur le magasin (numéro de build) et mode « none » (rien), « recommended »
 * (message qu'on peut fermer) ou « required » (écran bloquant tant que l'application est plus ancienne).
 * Le site et la PWA n'en ont pas besoin : ils se mettent à jour seuls, sans message.
 */
const PLATFORMS = ['android', 'ios'];
const MODES = ['none', 'recommended', 'required'];

const AppReleaseSchema = new mongoose.Schema({
  _id: { type: String, enum: PLATFORMS },
  latestBuild: { type: Number, min: 0, default: 0 },
  latestVersion: { type: String, trim: true, maxlength: 20, default: '' },
  mode: { type: String, enum: MODES, default: 'none' },
  message: { type: String, trim: true, maxlength: 280, default: '' },
  storeUrl: { type: String, trim: true, maxlength: 300, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false });

AppReleaseSchema.statics.PLATFORMS = PLATFORMS;
AppReleaseSchema.statics.MODES = MODES;

module.exports = mongoose.model('AppRelease', AppReleaseSchema);
