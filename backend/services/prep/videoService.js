const mongoose = require('mongoose');

/**
 * Vidéos explicatives (modules) et de présentation (concours) de la préparation.
 *
 * Index en mémoire rafraîchi toutes les 5 minutes : une vidéo enregistrée en production par le
 * script local (scripts/video/publish.js) apparaît dans l'application au plus tard 5 minutes
 * après, sans redéploiement ni nouvelle version. Seules les vidéos « published » sont exposées ;
 * une base indisponible ne casse jamais une réponse (dernier index connu, sinon aucun).
 *
 * Forme de l'index : { modules: { CODE: { fr: video, en: video } }, concours: { CODE: { fr: video } } }
 */
const TTL_MS = 5 * 60 * 1000;
const CIBLES = { module: 'modules', concours: 'concours' };

/** Champs publics d'une vidéo (contrat de l'API). */
const publicVideo = (doc) => (doc ? {
  youtubeId: doc.youtubeId,
  url: doc.url,
  title: doc.title || '',
  durationSec: doc.durationSec ?? null,
  publishedAt: doc.publishedAt || null,
  status: doc.status,
} : null);

const emptyIndex = () => ({ modules: {}, concours: {} });

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
        .select('cible code langue youtubeId url title durationSec publishedAt status')
        .lean();
      cache = { at: now(), index: buildIndex(docs) };
    } catch (error) {
      // Base momentanément indisponible : on garde le dernier index connu.
      if (!cache.index) return emptyIndex();
    }
    return cache.index;
  };

  const find = (idx, cible, code, langue = 'fr') => idx[CIBLES[cible]]?.[code]?.[langue] || null;

  return {
    index,
    find,
    forModule: async (code, langue = 'fr') => find(await index(), 'module', code, langue),
    forConcours: async (code) => find(await index(), 'concours', code, 'fr'),
    reset: () => { cache = { at: 0, index: null }; },
  };
};

const defaultService = createVideoService();

module.exports = { ...defaultService, createVideoService, publicVideo, buildIndex, emptyIndex, TTL_MS };
