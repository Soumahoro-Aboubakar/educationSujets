import { useEffect } from 'react';
import { applyHead } from '../lib/seo';

/**
 * Titre, description, canonique et données structurées de la page affichée.
 * Sans argument (null), rien n'est modifié : utile pendant un chargement.
 */
const useSeo = (seo) => {
  const key = seo ? JSON.stringify(seo) : null;
  useEffect(() => {
    if (!key) return;
    applyHead(JSON.parse(key));
    // Contenu de la page prêt : la version pré-rendue peut être remplacée (index.js).
    window.dispatchEvent(new Event('fatafalta:page-ready'));
  }, [key]);
};

export default useSeo;
