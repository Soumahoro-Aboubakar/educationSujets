import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useDownloadStore from '../store/useDownloadStore';
import usePrep from '../prep/store';
import { LAUNCH_WAIT, resolveLaunch } from './launchState';

/**
 * Suit le démarrage réel de l'application et le traduit pour l'expérience de lancement :
 * quand monter l'arbre (`core`), quand le révéler (`ready`), où en est-on (`progress`),
 * et que dire si quelque chose n'aboutit pas (`slow`, `fault`, `retry`).
 *
 * Rien n'est simulé : chaque étape correspond à un travail effectif (préférences, polices,
 * fichiers hors ligne, copie locale de la préparation, navigation).
 */
export default function useLaunchReadiness({ preferencesReady, fontsLoaded, fontError }) {
  const hydrateDownloads = useDownloadStore((state) => state.hydrate);
  const prepReady = usePrep((state) => state.ready);

  const [downloadsReady, setDownloadsReady] = useState(false);
  const [prepSettled, setPrepSettled] = useState(false);
  const [bootFailed, setBootFailed] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const [painted, setPainted] = useState(false);
  // Délais : `attempt` les relance après « Réessayer ».
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState({ network: false, fonts: false, slow: false, stall: false });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /*
   * Même ordre qu'avant (fichiers hors ligne, puis préparation), mais chaque lecture est
   * indépendante : un échec de la première n'empêche plus la seconde, et l'application
   * n'attend plus la fin des échanges réseau de la préparation pour s'afficher.
   */
  const boot = useCallback(async () => {
    try {
      await hydrateDownloads();
    } catch (error) {
      console.warn('[lancement] fichiers hors ligne illisibles', error);
    }
    if (alive.current) setDownloadsReady(true);
    try {
      await usePrep.getState().hydrate();
    } catch (error) {
      console.warn('[lancement] préparation non initialisée', error);
      // Sans copie locale lisible, aucun écran ne peut s'afficher : on le dit, on ne tourne pas en rond.
      if (alive.current && !usePrep.getState().ready) setBootFailed(true);
    }
    if (alive.current) setPrepSettled(true);
  }, [hydrateDownloads]);

  useEffect(() => { boot(); }, [boot]);

  useEffect(() => {
    if (attempt) setExpired({ network: false, fonts: false, slow: false, stall: false });
    const timers = Object.entries(LAUNCH_WAIT).map(([key, delay]) =>
      setTimeout(() => setExpired((current) => ({ ...current, [key]: true })), delay));
    return () => timers.forEach(clearTimeout);
  }, [attempt]);

  // Navigation initialisée : on laisse deux images au premier écran pour se dessiner sous le voile.
  const onNavigationReady = useCallback(() => {
    setNavigationReady(true);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (alive.current) setPainted(true); }));
  }, []);

  const retry = useCallback(() => {
    setBootFailed(false);
    setPrepSettled(false);
    setAttempt((count) => count + 1);
    boot();
  }, [boot]);

  const fontsSettled = Boolean(fontsLoaded || fontError || expired.fonts);

  const state = useMemo(() => resolveLaunch({
    steps: {
      preferences: Boolean(preferencesReady),
      fonts: fontsSettled,
      downloads: downloadsReady,
      prep: prepReady,
      navigation: navigationReady,
    },
    painted,
    prepSettled,
    networkExpired: expired.network,
    bootFailed,
    stalled: expired.stall,
  }), [preferencesReady, fontsSettled, downloadsReady, prepReady, navigationReady, painted, prepSettled, expired.network, expired.stall, bootFailed]);

  return {
    ...state,
    slow: expired.slow && !state.ready && !state.fault,
    retry,
    onNavigationReady,
  };
}
