const mongoose = require('mongoose');
const { pseudonymFields } = require('../services/prep/pseudonymSearch');

/**
 * Identité appareil de la préparation (cahier des charges § 25.1, § 25.4, § 28 IdentiteAppareil
 * + EssaiAppareil). Créée sans saisie au premier lancement, conservée au passage au compte.
 *
 * Identifiants de rapprochement (jamais d'IMEI, numéro de série ni adresse MAC — § 25.4) :
 *  - appareilId : UUID généré par l'app et gardé dans le Trousseau iOS / SecureStore ;
 *  - androidId  : ANDROID_ID (stable par application et appareil après réinstallation) ;
 *  - vendorId   : identifierForVendor iOS ;
 *  - empreinte  : indice de secours (modèle, système, langue, écran), jamais utilisé seul.
 */
const PrepIdentiteSchema = new mongoose.Schema({
  identifiants: {
    appareilId: { type: String, trim: true, index: true },
    androidId: { type: String, trim: true, index: true, sparse: true },
    vendorId: { type: String, trim: true, index: true, sparse: true },
  },
  empreinte: { type: String, trim: true, default: '' },
  pseudonyme: { type: String, trim: true, required: true, index: true },
  pseudonymeNormalise: { type: String, index: true },
  pseudonymeNumero: { type: String, index: true },
  avatarTeinte: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  visibleClassement: { type: Boolean, default: true },
  essai: {
    jours: { type: [String], default: [] }, // AAAA-MM-JJ, jours d'interaction distincts
    iaUtilisees: { type: Number, default: 0 },
  },
  derniereDateServeur: { type: String, default: null },
  programmeActif: { type: String, default: null },
  fusionneeDans: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepIdentite', default: null },
}, { timestamps: true });

// Création et changement de pseudonyme passent par save() dans le service et le contrôleur.
PrepIdentiteSchema.pre('validate', function normalizeSearchFields() {
  if (this.pseudonyme) Object.assign(this, pseudonymFields(this.pseudonyme));
});

module.exports = mongoose.model('PrepIdentite', PrepIdentiteSchema);
