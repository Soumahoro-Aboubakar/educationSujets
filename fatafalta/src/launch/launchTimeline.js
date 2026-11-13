/**
 * Chronologie de l'expérience de lancement (écran E00) — source unique des durées et des cotes.
 *
 * L'ouverture est une fonction pure du temps écoulé : une seule horloge (en ms) avance sur le
 * thread UI et chaque élément en déduit son état. Tout reste donc coordonné, un appui fait
 * défiler la séquence en accéléré sans la casser, et chaque image peut être vérifiée isolément.
 *
 * Aucun import React Native ici : le fichier est lu tel quel par les tests Node.
 */
import { SPLASH_IMAGE_WIDTH } from '../theme/brand';

// ── Cotes (pt) ──────────────────────────────────
export const MARK = SPLASH_IMAGE_WIDTH; // cadre du F, identique au splash natif
export const UNIT = MARK / 100; // une unité du cadre 100 × 100 du symbole

export const LAYOUT = {
  // Le symbole s'élève quand le nom arrive : l'ensemble F + nom + signature finit centré.
  lift: 38,
  wordSize: 28, // corps du mot-symbole
  wordTop: 80, // du centre de l'écran au haut du mot-symbole
  tagSize: 13, // corps de la signature
  tagBaseline: 129, // du centre de l'écran à la ligne de base de la signature
  pulseWidth: 132,
  pulseHeight: 3,
  pulseBottom: 56, // au-dessus de la zone sûre basse
  gutter: 24,
};

// ── Pistes : [début, fin] en ms depuis la première image animée ──
// `full` : la séquence complète. `calm` : « Réduire les animations » et redémarrage à chaud —
// les mêmes états, sans déplacement ni tracé, en fondus courts.
export const FULL = {
  motion: true,
  depth: [0, 520], // la nuit se creuse (dégradé, grain)
  halo: [40, 720], // une lumière naît derrière le F…
  haloGrow: [40, 1000], // …et s'élargit
  ripple: [130, 840], // impulsion douce depuis le centre
  atmosphere: [200, 1150], // halos lointains et poussières de lumière
  trace: [240, 760], // deux traits lumineux dessinent le contour, du pied au coin
  ignite: [690, 960], // la feuille s'allume
  flash: [720, 1080], // éclat à la rencontre des deux traits
  settle: [760, 1400], // le F se pose (ressort discret)
  traceFade: [790, 1030], // éteint avant que le coin ne se replie : aucun contour fantôme
  bloom: [760, 1520], // le halo se diffuse brièvement
  release: [800, 1560], // les poussières s'écartent
  fold: [860, 1280], // le coin se corne : le revers or apparaît
  glint: [1190, 1580], // un reflet court le long de la pliure
  lift: [820, 1440],
  word: 900, // première lettre du nom
  letter: 460, // durée d'une lettre
  // Écarts qui se resserrent : une vague, pas un métronome.
  letterDelays: [0, 34, 64, 91, 115, 136, 154, 169, 181],
  tagline: [1200, 1640],
  pulse: [460, 820], // le filet de chargement apparaît
  gate: 1720, // la sortie ne commence jamais avant
  end: 1720,
  exit: 520,
};

export const CALM = {
  motion: false,
  depth: [0, 320],
  halo: [0, 420],
  haloGrow: [0, 0],
  ripple: [0, 0],
  atmosphere: [0, 420],
  trace: [0, 0],
  ignite: [90, 400],
  flash: [0, 0],
  settle: [0, 0],
  traceFade: [0, 0],
  bloom: [0, 0],
  release: [0, 0],
  fold: [0, 0],
  glint: [0, 0],
  lift: [0, 0],
  word: 240,
  letter: 320,
  letterDelays: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  tagline: [340, 660],
  pulse: [200, 520],
  gate: 780,
  end: 780,
  exit: 260,
};

// Sortie : fractions de la durée `exit`. Rien n'attend son tour — tout part ensemble,
// le texte d'abord éteint, l'encre en dernier pour laisser paraître l'accueil.
export const EXIT = {
  text: [0, 0.38],
  atmosphere: [0, 0.55],
  halo: [0.04, 0.7],
  mark: [0.08, 0.74],
  veil: [0.22, 1],
};

// ── Moteur ──────────────────────────────────────
export const ENGINE = {
  // Une image en retard (montage de l'application) met la séquence en pause au lieu de la faire sauter.
  maxStep: 48,
  skipSpeed: 9, // un appui fait défiler la fin de l'ouverture en accéléré
  lifeSpan: 120, // s — multiple commun des périodes d'ambiance : la boucle ne se voit pas
  progressEase: 150, // ms — constante de temps du lissage de la progression réelle
  // Budget d'images : trop d'images lentes pendant l'ouverture → les couches d'ambiance s'effacent.
  budgetWindow: 90,
  slowFrame: 34,
  slowTolerance: 8,
};

// ── Courbes (worklets) ──────────────────────────
export const span = (t, from, to) => {
  'worklet';
  if (to <= from) return t >= to ? 1 : 0;
  const p = (t - from) / (to - from);
  return p < 0 ? 0 : p > 1 ? 1 : p;
};

// Décélération franche, proche de cubic-bezier(0.22, 1, 0.36, 1) : les entrées.
export const easeOut = (p) => {
  'worklet';
  const q = 1 - p;
  return 1 - q * q * q * q * q;
};

export const easeOutSoft = (p) => {
  'worklet';
  const q = 1 - p;
  return 1 - q * q * q;
};

// Accélération puis décélération, proche de cubic-bezier(0.76, 0, 0.24, 1) : les déplacements à l'écran.
export const easeInOut = (p) => {
  'worklet';
  return p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2;
};

export const easeInOutSoft = (p) => {
  'worklet';
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};

// Ressort amorti : dépasse d'un cinquième puis se pose, sans rebond visible.
export const spring = (p) => {
  'worklet';
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return 1 - Math.exp(-5.2 * p) * Math.cos(3.4 * Math.PI * p);
};

// 0 → 1 → 0 : montée vive, retombée lente (éclats, impulsions).
export const bump = (p, attack) => {
  'worklet';
  if (p <= 0 || p >= 1) return 0;
  if (p < attack) {
    const q = 1 - p / attack;
    return 1 - q * q * q;
  }
  const r = (p - attack) / (1 - attack);
  return 1 - (r < 0.5 ? 4 * r * r * r : 1 - Math.pow(-2 * r + 2, 3) / 2);
};

export const mix = (from, to, p) => {
  'worklet';
  return from + (to - from) * p;
};

// Valeur le long d'une liste d'échantillons régulièrement espacés (p de 0 à 1).
export const sample = (values, p) => {
  'worklet';
  const last = values.length - 1;
  const f = (p < 0 ? 0 : p > 1 ? 1 : p) * last;
  const i = f >= last ? last - 1 : Math.floor(f);
  return values[i] + (values[i + 1] - values[i]) * (f - i);
};

// Oscillation d'ambiance : `life` en secondes, période en secondes, phase de 0 à 1.
export const sway = (life, period, phase) => {
  'worklet';
  return Math.sin(2 * Math.PI * (life / period + phase));
};

// ── Poussières de lumière ───────────────────────
// Semis déterministe autour du symbole : quelques points, trois profondeurs, jamais une pluie.
const seeded = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const PARTICLE_PERIODS = [8, 10, 12, 15];

// Zone réservée au symbole, au nom et à la signature (pt, depuis le centre de l'écran) :
// aucune poussière n'y repose — un point collé à une lettre se lirait comme une coquille.
export const QUIET_ZONE = { halfWidth: 136, top: -112, bottom: 158 };

// Écarte un point de la zone réservée en le poussant le long de sa direction.
export const clearOfLockup = (x, y) => {
  const { halfWidth, top, bottom } = QUIET_ZONE;
  if (Math.abs(x) >= halfWidth || y <= top || y >= bottom) return [x, y];
  const reachX = x ? halfWidth / Math.abs(x) : Infinity;
  const reachY = y ? (y > 0 ? bottom : -top) / Math.abs(y) : Infinity;
  const push = Math.min(reachX, reachY) * 1.06;
  return Number.isFinite(push) ? [x * push, y * push] : [halfWidth * 1.06, y];
};

export const buildParticles = (count = 11, seed = 0xf0a1) => {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, index) => {
    // Angles répartis par secteurs (pas d'amas), rayons entre 0,22 et 0,5 du petit côté de l'écran :
    // des poussières dans la lumière de la lampe, pas un ciel étoilé.
    const angle = ((index + 0.15 + random() * 0.7) / count) * 2 * Math.PI;
    const depth = 0.35 + random() * 0.65; // 1 = proche (plus grand, plus flou, plus mobile)
    const near = depth > 0.86;
    return {
      angle,
      radius: 0.22 + random() * 0.28,
      depth,
      near,
      // Diamètre du halo de la poussière : le point lumineux n'en occupe que le cœur.
      size: near ? 12 + random() * 5 : 4 + depth * 4,
      opacity: near ? 0.3 + random() * 0.12 : 0.34 + depth * 0.4,
      warm: random() < 0.34, // un tiers de poussières d'or, le reste ivoire
      phase: random(),
      periodX: PARTICLE_PERIODS[Math.floor(random() * PARTICLE_PERIODS.length)],
      periodY: PARTICLE_PERIODS[Math.floor(random() * PARTICLE_PERIODS.length)],
      drift: 4 + random() * 7,
      delay: Math.round(random() * 420),
    };
  });
};
