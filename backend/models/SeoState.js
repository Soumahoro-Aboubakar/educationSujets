const mongoose = require('mongoose');

/*
 * État unique du service d'indexation (document _id: 'main'), en base pour survivre aux redémarrages
 * et être partagé entre instances : reconstruction demandée, dernière version en ligne traitée,
 * verrou du worker (bail renouvelable), soumissions Google.
 */
const SeoStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  // Reconstruction du site : premier événement non intégré, dernier événement, dernière demande.
  dirtySince: { type: Date, default: null },
  lastEventAt: { type: Date, default: null },
  rebuildRequestedAt: { type: Date, default: null },
  rebuildDay: { type: String, default: null },
  rebuildsToday: { type: Number, default: 0 },
  lastRebuildError: { type: String, default: null },
  // Dernière version en ligne intégrée (seo-build.json).
  buildId: { type: String, default: null },
  builtAt: { type: Date, default: null },
  commit: { type: String, default: null },
  fingerprintVersion: { type: Number, default: null },
  lastBuildCheckAt: { type: Date, default: null },
  lastBuildError: { type: String, default: null },
  pendingReview: {
    // Retraits massifs suspendus en attente de confirmation (garde-fou contre un build tronqué).
    buildId: { type: String, default: null },
    removed: { type: Number, default: 0 },
    detectedAt: { type: Date, default: null },
  },
  // IndexNow
  keyCheckedAt: { type: Date, default: null },
  keyValid: { type: Boolean, default: null },
  indexNowPausedUntil: { type: Date, default: null },
  // Google Search Console
  sitemapSubmittedAt: { type: Date, default: null },
  sitemapSubmitNeeded: { type: Boolean, default: false },
  googleSitemapStatus: { type: mongoose.Schema.Types.Mixed, default: null },
  googleCheckedAt: { type: Date, default: null },
  googleError: { type: String, default: null },
  inspectionDay: { type: String, default: null },
  inspectionsToday: { type: Number, default: 0 },
  // Verrou du worker
  lockOwner: { type: String, default: null },
  lockUntil: { type: Date, default: null },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('SeoState', SeoStateSchema);
