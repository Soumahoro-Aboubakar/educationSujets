import { useEffect } from 'react';
import { enqueue, flush } from './client';

/**
 * Temps d'étude (objectif du jour, série, semaine) : même action « minutes » que l'application.
 * Ne compte que le temps réellement passé : onglet visible et activité (défilement, clavier,
 * clic, toucher) dans les 2 dernières minutes. Envoi toutes les minutes et à la sortie.
 */
const IDLE_MS = 120000;

const useStudyTime = (programme, active = true) => {
  useEffect(() => {
    if (!programme || !active) return undefined;
    let seconds = 0;
    let lastActivity = Date.now();
    const touch = () => { lastActivity = Date.now(); };
    const send = () => {
      if (seconds < 15) return;
      enqueue({ type: 'minutes', programme, minutes: Math.round((seconds / 60) * 100) / 100 });
      seconds = 0;
      flush();
    };
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity < IDLE_MS) seconds += 1;
      if (seconds >= 60) send();
    }, 1000);
    const onHide = () => { if (document.visibilityState === 'hidden') send(); };
    const events = ['scroll', 'keydown', 'pointerdown', 'touchstart', 'input'];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onHide);
      send();
    };
  }, [programme, active]);
};

export default useStudyTime;
