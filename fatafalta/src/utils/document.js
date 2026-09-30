/**
 * Règles d'affichage d'un document partagées par la liste et le détail.
 */

export const getDocumentTitle = (document) => document?.title
  || document?.titre
  || document?.originalFileName
  || (document?.documentType === 'corrige' ? 'Corrigé' : 'Sujet');

/**
 * Corrigé associé à un sujet.
 * - la liste dynamique (/api/documents?noeudId=…) renvoie `correction` ;
 * - le détail (/api/documents/:id) renvoie `correction` pour les anciens
 *   documents et `dynamicCorrection` pour ceux du catalogue dynamique.
 */
export const getCorrection = (document) => {
  if (!document || document.documentType === 'corrige' || document.type === 'correction') return null;
  const correction = document.correction || document.dynamicCorrection;
  return correction?._id ? correction : null;
};

export const getExtensionLabel = (document) => String(document?.extension || document?.fileType || 'pdf')
  .replace(/^\./, '')
  .slice(0, 4)
  .toUpperCase();
