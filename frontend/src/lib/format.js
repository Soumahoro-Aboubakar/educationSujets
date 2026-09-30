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

export const documentTitle = (document) => document?.title
  || document?.titre
  || document?.originalFileName
  || (document?.documentType === 'corrige' ? 'Corrigé' : 'Sujet');

export const correctionOf = (document) => {
  if (!document || document.documentType === 'corrige' || document.type === 'correction') return null;
  const correction = document.correction || document.dynamicCorrection;
  return correction?._id ? correction : null;
};

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
