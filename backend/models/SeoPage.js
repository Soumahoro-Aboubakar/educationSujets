const mongoose = require('mongoose');

/*
 * Une URL publique indexable du site, telle que la voit le manifeste de la version en ligne
 * (frontend/scripts/prerender.mjs → /seo-manifest.json), et son suivi d'indexation.
 *
 * États IndexNow (jamais une preuve d'indexation) :
 *   pending  : changement constaté en ligne, envoi prévu à nextAttemptAt
 *   sent     : requête partie, réponse non encore enregistrée (reprise si le serveur redémarre)
 *   accepted : IndexNow a répondu 200 (reçue) ou 202 (reçue, clé en cours de vérification)
 *   failed   : refus (400/403/422) ou réessais épuisés ; relançable depuis l'administration
 * Google : uniquement ce que renvoie l'API d'inspection d'URL de Search Console, daté.
 */
const SeoPageSchema = new mongoose.Schema({
  path: { type: String, required: true, unique: true, maxlength: 600 },
  category: { type: String, default: null },
  hash: { type: String, default: null },
  lastmod: { type: Date, default: null },
  inSitemap: { type: Boolean, default: true },
  live: { type: Boolean, default: true },
  firstSeenAt: { type: Date, default: Date.now },
  changedAt: { type: Date, default: null },
  changeType: { type: String, enum: ['ajout', 'modification', 'suppression', null], default: null },
  removedAt: { type: Date, default: null },
  buildId: { type: String, default: null },
  indexNow: {
    state: { type: String, enum: ['pending', 'sent', 'accepted', 'failed', null], default: null },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    lastStatus: { type: Number, default: null },
    lastError: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
    acceptedHash: { type: String, default: null },
    source: { type: String, default: null },
  },
  google: {
    checkedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    verdict: { type: String, default: null },
    coverageState: { type: String, default: null },
    indexingState: { type: String, default: null },
    lastCrawlTime: { type: Date, default: null },
    googleCanonical: { type: String, default: null },
    error: { type: String, default: null },
  },
}, { versionKey: false, timestamps: true });

SeoPageSchema.index({ 'indexNow.state': 1, 'indexNow.nextAttemptAt': 1 });
SeoPageSchema.index({ live: 1, inSitemap: 1 });
SeoPageSchema.index({ 'google.dueAt': 1 });
SeoPageSchema.index({ changedAt: -1 });

module.exports = mongoose.model('SeoPage', SeoPageSchema);
