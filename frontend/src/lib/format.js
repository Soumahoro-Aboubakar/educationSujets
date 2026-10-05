const numberFormat = new Intl.NumberFormat('fr-FR');

// Espace insécable standard : l'espace fine d'Intl disparaît avec un interlettrage serré.
export const formatAmount = (amount) => `${numberFormat.format(Math.round(Number(amount) || 0)).replace(/\u202f/g, '\u00a0')}\u00a0FCFA`;

export const formatDate = (date) => (date
  ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  : '');

export const formatLongDate = (date) => (date
  ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  : '');

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export const labelOf = (item) => item?.nom || item?.name || '';

// Les organismes (INP-HB, ENA, ESATIC…) sont toujours affichés en majuscules ; leur nom en base est inchangé.
export const organismeLabel = (item) => labelOf(item).toLocaleUpperCase('fr-FR');

/**
 * Message d'erreur de chargement fidèle à la cause : « Connexion impossible » seulement si le
 * serveur n'a pas répondu ; un lien invalide ou un refus n'est pas un problème de connexion.
 */
export const loadErrorOf = (error, what = 'Le contenu') => {
  const status = error?.response?.status;
  if (!error?.response) return { title: 'Connexion impossible', description: 'Vérifiez votre connexion internet puis réessayez.' };
  if (status === 404 || status === 400) return { title: 'Contenu introuvable', description: 'Ce lien ne correspond plus à un contenu publié.' };
  if (status === 429) return { title: 'Trop de requêtes', description: error.response.data?.error || 'Patientez quelques secondes puis réessayez.' };
  return { title: 'Chargement impossible', description: `${what} n’a pas pu être chargé. Réessayez dans un instant.` };
};

export const documentTitle = (document) => document?.title
  || document?.titre
  || document?.originalFileName
  || (document?.documentType === 'corrige' ? 'Corrigé' : 'Sujet');

export const correctionOf = (document) => {
  if (!document || document.documentType === 'corrige' || document.type === 'correction') return null;
  const correction = document.correction || document.dynamicCorrection;
  return correction?._id ? correction : null;
};

/** Le PDF du sujet contient lui-même son corrigé. */
export const hasIncludedCorrection = (document) => Boolean(document?.correctionIncludedInPdf)
  && document.documentType !== 'corrige'
  && document.type !== 'correction';

/** Corrigé séparé associé OU corrigé inclus dans le PDF du sujet. */
export const hasCorrection = (document) => Boolean(correctionOf(document)) || hasIncludedCorrection(document);

/** Chaîne des nœuds (racine → feuille) à partir du nœud peuplé par l'API. */
export const nodeChain = (node) => {
  const chain = [];
  let current = node;
  while (current && typeof current === 'object' && current.nom) {
    chain.unshift(current);
    current = current.parentId;
  }
  return chain;
};
