/**
 * État du lancement — logique pure, sans React ni module natif (lue telle quelle par les tests Node).
 *
 * Le démarrage attend uniquement ce qui est local à l'appareil : aucune étape ne dépend du
 * réseau, l'application s'ouvre donc hors ligne comme en ligne. La progression affichée est le
 * décompte de ces étapes réelles — jamais un pourcentage inventé.
 */

// Étapes nécessaires à l'affichage du premier écran, dans l'ordre où elles aboutissent d'ordinaire.
export const LAUNCH_STEPS = ['preferences', 'fonts', 'downloads', 'prep', 'navigation'];

export const LAUNCH_WAIT = {
  /*
   * Au tout premier lancement, l'identité de préparation se déclare auprès du serveur. On lui
   * laisse le temps de la séquence d'ouverture pour répondre (l'accueil arrive alors complet),
   * jamais davantage : sur un réseau lent, l'application s'ouvre et l'échange continue derrière.
   */
  network: 1500,
  // Polices introuvables ou trop lentes : l'application s'ouvre avec la police du système.
  fonts: 5000,
  // Au-delà, un mot rassurant accompagne le filet de chargement.
  slow: 6000,
  // Au-delà, on n'attend plus en silence : message clair et bouton « Réessayer ».
  stall: 14000,
};

export const launchProgress = (steps) =>
  LAUNCH_STEPS.filter((step) => steps[step]).length / LAUNCH_STEPS.length;

/**
 * @param {object} input
 * @param {Record<string, boolean>} input.steps étapes abouties
 * @param {boolean} input.painted le premier écran a été dessiné
 * @param {boolean} input.prepSettled la préparation a terminé son initialisation complète (réseau compris)
 * @param {boolean} input.networkExpired le délai accordé au réseau est écoulé
 * @param {boolean} input.bootFailed la copie locale de la préparation n'a pas pu être lue
 * @param {boolean} input.stalled le délai d'attente anormal est dépassé
 */
export const resolveLaunch = ({ steps, painted, prepSettled, networkExpired, bootFailed, stalled }) => {
  // Ce qu'il faut pour monter l'arbre de l'application.
  const core = Boolean(steps.preferences && steps.fonts && steps.downloads && steps.prep);
  // Ce qu'il faut pour le montrer : navigation initialisée et premier écran dessiné.
  const local = Boolean(core && steps.navigation && painted);
  let fault = null;
  if (bootFailed && !steps.prep) fault = 'error';
  else if (stalled && !local) fault = 'stalled';
  return {
    core,
    ready: local && Boolean(prepSettled || networkExpired),
    progress: launchProgress(steps),
    fault,
  };
};

/**
 * Niveau de mise en scène :
 *  - `calm` : « Réduire les animations » activé, ou redémarrage à chaud (le moteur JavaScript
 *    tournait déjà : inutile de rejouer toute la séquence) ;
 *  - `lite` : appareil modeste — le tracé et la pliure restent, l'ambiance disparaît ;
 *  - `full` : la séquence complète.
 */
export const LITE_BOOT_COST = 1200; // ms d'évaluation du bundle avant le premier rendu

export const pickLaunchTier = ({ reduceMotion, warm, os, osVersion, bootCost, deviceMemory }) => {
  if (reduceMotion || warm) return 'calm';
  if (os === 'android' && typeof osVersion === 'number' && osVersion < 29) return 'lite';
  if (typeof bootCost === 'number' && bootCost >= LITE_BOOT_COST) return 'lite';
  if (os === 'web' && typeof deviceMemory === 'number' && deviceMemory <= 2) return 'lite';
  return 'full';
};

// Messages : tutoiement, phrases courtes, le problème puis le geste (ton rédactionnel A12).
export const LAUNCH_COPY = {
  slow: 'Ça prend un peu plus de temps que d’habitude…',
  error: {
    title: 'Fatafalta n’a pas pu démarrer',
    body: 'Tes données enregistrées sur ce téléphone n’ont pas pu être lues. Réessaie ; si ça continue, ferme l’application puis rouvre-la.',
  },
  stalled: {
    title: 'Le démarrage prend trop de temps',
    body: 'Réessaie ; si ça continue, ferme l’application puis rouvre-la.',
  },
  retry: 'Réessayer',
};
