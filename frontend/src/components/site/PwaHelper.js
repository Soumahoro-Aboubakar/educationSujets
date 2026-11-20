import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cx } from '../ui';
import { IosInstallSteps, isIosSafari, isStandalone } from './IosInstall';

/*
 * Application installable (PWA).
 * - Enregistre le service worker (public/sw.js) en production.
 * - Nouvelle version : installée sans message, au prochain changement de page ou au retour dans
 *   l'application (voir useSilentUpdate). Chaque déploiement change sw.js (empreinte du build).
 * - iPhone / iPad dans Safari, hors application installée : guide d'installation en trois gestes,
 *   proposé dans l'espace de préparation, refermable (rappel au plus tous les 30 jours).
 *   Safari n'a pas de bouton d'installation automatique : seul ce geste manuel existe.
 */
const DISMISS_KEY = 'fatafalta.pwa.ios-guide';
const DAYS = 30;

export { isStandalone };

const dismissedRecently = () => {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return at && Date.now() - at < DAYS * 86400000;
  } catch (error) { return false; }
};

const useServiceWorker = () => {
  const [waiting, setWaiting] = useState(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return undefined;
    let refreshing = false;
    const onController = () => { if (!refreshing) { refreshing = true; window.location.reload(); } };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    const register = () => navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
      // Une vérification par heure suffit (et à chaque retour sur l'onglet).
      const check = () => reg.update().catch(() => {});
      const timer = setInterval(check, 3600000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      return () => clearInterval(timer);
    }).catch(() => {});
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true });
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onController);
  }, []);
  return [waiting, () => waiting?.postMessage('SKIP_WAITING')];
};

/*
 * Feuille flottante, transition CSS (sans framer-motion : ce composant est chargé sur toutes les pages,
 * la bibliothèque d'animation reste dans les écrans qui en ont besoin). Entrée par le bas en 320 ms,
 * sortie en 200 ms ; « Réduire les animations » : fondu seul.
 */
const EXIT_MS = 200;
const usePresence = (open) => {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let second;
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [open]);
  return [mounted, visible];
};

const Sheet = ({ children, bottomOffset, visible }) => (
  <div
    role="dialog"
    aria-live="polite"
    className={cx(
      'fixed inset-x-3 z-50 mx-auto max-w-md rounded-3xl border border-line bg-white p-5 shadow-lift sm:inset-x-auto sm:right-6',
      'transition-[opacity,transform] ease-emphasized motion-reduce:translate-y-0',
      visible ? 'translate-y-0 opacity-100 duration-300' : 'translate-y-4 opacity-0 duration-200',
    )}
    style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))` }}
  >
    {children}
  </div>
);

/*
 * Mise à jour silencieuse : la nouvelle version (service worker en attente) s'installe toute seule au
 * prochain changement de page, ou au retour dans l'application après 10 minutes d'absence. Jamais au
 * milieu d'une page en cours d'utilisation (leçon, exercice) : rien n'est perdu, aucun message.
 */
const AWAY_MS = 10 * 60 * 1000;
const useSilentUpdate = (waiting, apply, pathname) => {
  const pathWhenReady = useRef(null);
  useEffect(() => {
    if (!waiting) { pathWhenReady.current = null; return undefined; }
    if (pathWhenReady.current === null) pathWhenReady.current = pathname;
    if (pathname !== pathWhenReady.current) { apply(); return undefined; }
    let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) apply();
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [waiting, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
};

const PwaHelper = () => {
  const { pathname } = useLocation();
  const [waiting, update] = useServiceWorker();
  useSilentUpdate(waiting, update, pathname);
  const [guide, setGuide] = useState(false);
  const studying = /^\/preparation(\/|$)/.test(pathname);

  useEffect(() => {
    if (!studying || isStandalone() || !isIosSafari() || dismissedRecently()) { setGuide(false); return undefined; }
    const timer = setTimeout(() => setGuide(true), 2500);
    return () => clearTimeout(timer);
  }, [studying]);

  const closeGuide = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (error) { /* rien */ }
    setGuide(false);
  };
  // Au-dessus de la barre d'onglets de l'espace d'étude (64 px) quand elle est affichée.
  const offset = /^\/preparation\/[^/]+/.test(pathname) ? 80 : 16;
  const current = guide ? 'ios' : null;
  const [shown, setShown] = useState(current);
  useEffect(() => { if (current) setShown(current); }, [current]);
  const [mounted, visible] = usePresence(Boolean(current));
  if (!mounted || !shown) return null;

  return (
    <>
      {shown === 'ios' ? (
        <Sheet key="ios" bottomOffset={offset} visible={visible}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[16px] font-bold tracking-[-0.01em] text-ink">Installe Fatafalta sur ton iPhone</p>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft">Une icône sur l’écran d’accueil, en plein écran, sans passer par l’App Store.</p>
            </div>
            <button type="button" onClick={closeGuide} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-paper" aria-label="Fermer le guide d’installation"><X size={18} /></button>
          </div>
          <IosInstallSteps tu className="mt-4 !text-[14px]" />
        </Sheet>
      ) : null}
    </>
  );
};

export default PwaHelper;
