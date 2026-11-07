const mongoose = require('mongoose');

/**
 * Vidéo explicative d'un module ou de présentation d'un concours (programme de préparation).
 *
 * Le contenu de la préparation (modules, programmes) vit dans le pack versionné
 * (data/prep/build/pack.json), embarqué dans l'application : la vidéo est donc rattachée par
 * CODE (« MATH-LNEXP », « ENSEA-AS »…) dans cette collection, pour qu'une vidéo ajoutée en
 * production apparaisse sans nouvelle version de l'application ni du pack.
 *
 * Écriture : uniquement par le script local scripts/video/publish.js (aucune route d'écriture).
 * Lecture : services/prep/videoService.js, qui n'expose que les vidéos « published ».
 */
const PrepVideoSchema = new mongoose.Schema({
  cible: { type: String, enum: ['module', 'concours'], required: true },
  code: { type: String, required: true, trim: true, maxlength: 60 },
  // Version du cours : « fr » par défaut ; un module de langue étrangère peut avoir une vidéo
  // par version (ex. « en » pour la version anglaise d'ANG-GRAM).
  langue: { type: String, default: 'fr', match: /^[a-z]{2}$/ },
  youtubeId: { type: String, required: true, match: /^[A-Za-z0-9_-]{11}$/ },
  url: { type: String, required: true },
  title: { type: String, trim: true, maxlength: 200, default: '' },
  durationSec: { type: Number, min: 0, default: null },
  publishedAt: { type: Date, default: null },
  status: { type: String, enum: ['processing', 'published', 'hidden'], default: 'processing' },
  // Traçabilité (§ 26.3) : contenu et fichier ayant servi à la vidéo, pour repérer les vidéos
  // devenues obsolètes quand le module est modifié.
  source: {
    empreinteContenu: { type: String, default: null },
    fichierSha256: { type: String, default: null },
    generateur: { type: String, default: null },
  },
}, { timestamps: true });

PrepVideoSchema.index({ cible: 1, code: 1, langue: 1 }, { unique: true });

module.exports = mongoose.model('PrepVideo', PrepVideoSchema);
