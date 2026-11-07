import { useEffect } from 'react';
import usePrep from '../store';

/**
 * Accès aux vidéos publiées : une par leçon (affichée à l'ouverture de la leçon) et une de
 * présentation par concours. Sans vidéo, ces hooks renvoient null : l'écran n'affiche alors
 * strictement rien de lié à la vidéo (ni bouton, ni icône, ni message).
 */
const KEYS = { lecon: 'lecons', concours: 'concours' };

export const findVideo = (index, cible, code, langue = 'fr') => index?.[KEYS[cible]]?.[code]?.[langue] || null;

/** Index complet (relu au plus toutes les 5 min, copie locale hors ligne). */
export const useVideosIndex = () => {
  const index = usePrep((s) => s.videos.index);
  const loadVideos = usePrep((s) => s.loadVideos);
  useEffect(() => { loadVideos(); }, [loadVideos]);
  return index;
};

/** Vidéo d'une leçon (dans la version de cours lue) ou d'un concours, sinon null. */
export const useVideo = (cible, code, langue = 'fr') => findVideo(useVideosIndex(), cible, code, langue);

/** « 18 min », « 45 s » — durée lisible ; null si inconnue. */
export const formatDuree = (sec) => {
  if (!(sec > 0)) return null;
  if (sec < 60) return `${Math.round(sec)} s`;
  return `${Math.round(sec / 60)} min`;
};
