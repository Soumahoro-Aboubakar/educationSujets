const mongoose = require('mongoose');

/**
 * Vidéos explicatives (une par leçon) et de présentation (concours) de la préparation.
 *
 * Index en mémoire rafraîchi toutes les 5 minutes : une vidéo enregistrée en production par le
 * script local (scripts/video/publish.js) apparaît dans l'application au plus tard 5 minutes
 * après, sans redéploiement ni nouvelle version. Seules les vidéos « published » sont exposées ;
 * une base indisponible ne casse jamais une réponse (dernier index connu, sinon aucun).
 *
 * Forme de l'index : { lecons: { CODE_LECON: { fr: video, en: video } }, concours: { CODE: { fr: video } } }
 */
const TTL_MS = 5 * 60 * 1000;
const CIBLES = { lecon: 'lecons', concours: 'concours' };

/** Champs publics d'une vidéo (contrat de l'API). */
const publicVideo = (doc) => (doc ? {
  youtubeId: doc.youtubeId,
  url: doc.url,
  title: doc.title || '',
  durationSec: doc.durationSec ?? null,
  publishedAt: doc.publishedAt || null,
  status: doc.status,
  ...(doc.source?.contentRevision ? { contentRevision: doc.source.contentRevision, contentGeneration: doc.source.contentGeneration, needsReview: Boolean(doc.source.needsReview) } : {}),
} : null);

const emptyIndex = () => ({ lecons: {}, concours: {} });

const buildIndex = (docs) => {
  const index = emptyIndex();
  docs.forEach((doc) => {
    const key = CIBLES[doc.cible];
    if (!key || doc.status !== 'published') return;
    index[key][doc.code] = index[key][doc.code] || {};
    index[key][doc.code][doc.langue || 'fr'] = publicVideo(doc);
  });
  return index;
};

const createVideoService = ({
  model = null,
  ttlMs = TTL_MS,
  now = () => Date.now(),
  isReady = () => mongoose.connection.readyState === 1,
} = {}) => {
  let cache = { at: 0, index: null };
  // Le modèle est chargé à la demande : le service reste utilisable dans les tests sans base.
  const Model = () => model || require('../../models/PrepVideo'); // eslint-disable-line global-require

  const index = async () => {
    if (cache.index && now() - cache.at < ttlMs) return cache.index;
    if (!isReady()) return cache.index || emptyIndex();
    try {
      const docs = await Model()
        .find({ status: 'published' })
        .select('cible code langue youtubeId url title durationSec publishedAt status source.contentRevision source.contentGeneration source.needsReview')
        .lean();
      cache = { at: now(), index: buildIndex(docs) };
    } catch (error) {
      // Base momentanément indisponible : on garde le dernier index connu.
      if (!cache.index) return emptyIndex();
    }
    return cache.index;
  };

  const find = (idx, cible, code, langue = 'fr', revision) => {
    const video = idx[CIBLES[cible]]?.[code]?.[langue] || null;
    if (revision && (video?.contentRevision !== revision || video?.needsReview)) return null;
    return video;
  };

  return {
    index,
    find,
    forLesson: async (code, langue = 'fr') => find(await index(), 'lecon', code, langue),
    forConcours: async (code) => find(await index(), 'concours', code, 'fr'),
    reset: () => { cache = { at: 0, index: null }; },
  };
};

const forSnapshot = (index, snapshot) => {
  if (!snapshot.manifest.generation) return index;
  const filtered = emptyIndex();
  const put = (kind, code, revision) => {
    const versions = index[kind]?.[code] || {};
    for (const [language, video] of Object.entries(versions)) {
      if (video.contentRevision === revision && !video.needsReview) {
        filtered[kind][code] ||= {}; filtered[kind][code][language] = video;
      }
    }
  };
  snapshot.pack.programmes.forEach(p => put('concours', p.code, p.revision));
  Object.values(snapshot.pack.modules).forEach(m => m.lecons.forEach(l => put('lecons', l.code, m.revision)));
  return filtered;
};
const defaultService = createVideoService();

module.exports = { ...defaultService, forSnapshot, createVideoService, publicVideo, buildIndex, emptyIndex, TTL_MS };
