const { invalidateSeoCatalog } = require('./seoCatalogService');

/*
 * Point d'entrée unique des contrôleurs après un changement visible du contenu public (sujet,
 * corrigé, organisme, catalogue, préparation, métadonnées SEO).
 *
 *  1. le flux SEO (/api/seo/catalog) est recalculé à la prochaine demande ;
 *  2. le changement est consigné en base (services/seo/indexingService) : le worker reconstruira le
 *     site une fois les changements regroupés, puis signalera à IndexNow les seules URL dont le
 *     contenu a réellement changé, une fois la nouvelle version en ligne. Voir docs/seo-indexation.md.
 *
 * N'attend rien : l'opération principale (publication, suppression…) n'est jamais ralentie ni
 * mise en échec par l'indexation.
 */
const indexing = () => require('./seo/indexingService');
const { enabled } = require('./seo/config');

/**
 * @param {Array<string|object>} documentIds sujets concernés (identifiants ou documents), pour le journal
 * @param {string} source origine lisible du changement (« sujet », « preparation », « catalogue »…)
 */
const notifyCatalogChange = (documentIds = [], source = 'sujet') => {
  invalidateSeoCatalog();
  if (!enabled()) return;
  const ids = documentIds
    .map((value) => (value && typeof value === 'object' ? value._id : value))
    .filter(Boolean)
    .map(String);
  indexing().recordChange({ source, ids }).catch((error) => console.error(`[SEO] Changement non consigné : ${error.message}`));
};

module.exports = { notifyCatalogChange };
