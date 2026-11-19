import { useEffect, useSyncExternalStore } from 'react';

/**
 * Recherche contextuelle : la loupe de l'en-tête cherche ce que montre la page en cours.
 * Une page déclare son contexte (libellé + action) ; sans contexte, la loupe ouvre la recherche
 * de sujets (/recherche). Raccourcis clavier : « / » ou Ctrl/⌘ + K.
 *
 *   useContextSearch({ label: 'Rechercher un organisme', open: () => input.current.focus() });
 */
let current = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export const useContextSearch = (context) => {
  const label = context?.label;
  useEffect(() => {
    if (!context) return undefined;
    current = context;
    emit();
    return () => {
      if (current === context) { current = null; emit(); }
    };
  }, [label, context?.open]); // eslint-disable-line react-hooks/exhaustive-deps
};

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => current;

/** Contexte actif (pour l'en-tête). */
export const useActiveSearch = () => useSyncExternalStore(subscribe, snapshot, snapshot);

/** Ouvre la recherche du contexte ; renvoie false s'il n'y en a pas. */
export const openContextSearch = () => {
  if (!current) return false;
  current.open();
  return true;
};
