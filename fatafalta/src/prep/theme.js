/**
 * Jetons de la section Préparation (docs/maquettes-ecrans-preparation.md, partie A).
 * S'ajoutent aux jetons de marque (theme/tokens.js) sans les modifier.
 */
import { Easing } from 'react-native-reanimated';
import theme, { brand, colors } from '../theme/tokens';

// A2.3 — Teintes de matières, attribuées dans l'ordre des matières du programme.
export const SUBJECT_TINTS = [
  { tint: '#264069', wash: '#E9EEF5' }, // encre lumineuse
  { tint: '#6C2838', wash: '#F4E9EA' }, // bordeaux
  { tint: '#1F5F5B', wash: '#E5F0EE' }, // sarcelle profonde
  { tint: '#7A5A24', wash: '#F6EEDF' }, // or profond
  { tint: '#4B3A6B', wash: '#EEEAF4' }, // prune
  { tint: '#4F5E72', wash: '#EEF0F3' }, // ardoise
];
export const subjectTint = (index = 0) => SUBJECT_TINTS[Math.abs(index) % SUBJECT_TINTS.length];

// Icône de chaque matière (pastille teintée), devinée depuis son nom.
export const subjectIconName = (nom = '') => {
  const n = nom.toLowerCase();
  if (/fran|lettre|r[ée]daction|litt/.test(n)) return 'feather';
  if (/math|logique|calcul|raisonnement|psycho/.test(n)) return 'sigma';
  if (/anglais|english|langue|espagnol|allemand/.test(n)) return 'languages';
  if (/scien|physique|chimie|svt|biolog|sp[ée]cialit/.test(n)) return 'flask';
  if (/droit|institution|admin|civique|[ée]conom/.test(n)) return 'landmark';
  if (/culture|histoire|g[ée]o|actualit/.test(n)) return 'book';
  return 'more';
};

// A2.3 — Couleurs et symboles des niveaux.
export const LEVELS = {
  1: { label: 'Application', color: '#4F5E72', dots: 1 },
  2: { label: 'Entraînement', color: '#264069', dots: 2 },
  3: { label: 'Approfondissement', color: brand.gold, dots: 3 },
};

export const PODIUM = ['#B48A48', '#8C96A3', '#9A6A45'];

// A2.4 — Dégradés autorisés.
export const GRADIENTS = {
  night: [brand.ink, brand.inkDeep],
  dawnGold: [brand.goldLight, brand.gold],
  paperVeil: ['rgba(252,250,245,0)', brand.paper],
};

// A3 — Styles typographiques ajoutés.
// Chiffres héros et titres des « moments » en Playfair Display (références visuelles validées).
export const type = {
  display: { fontFamily: theme.fontFamily.serif, fontSize: 44, lineHeight: 50, letterSpacing: -0.6, fontVariant: ['lining-nums', 'tabular-nums'] },
  hero: { fontFamily: theme.fontFamily.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  numeral: { fontFamily: theme.fontFamily.serif, fontVariant: ['lining-nums', 'tabular-nums'] },
  reading: { fontFamily: theme.fontFamily.regular, fontSize: 17, lineHeight: 28, letterSpacing: -0.1 },
  tabular: { fontVariant: ['tabular-nums'] },
};

// A10 — Mouvement.
export const motion = {
  press: { duration: 100, scale: 0.97 },
  enter: { duration: 420, easing: Easing.bezier(0.16, 1, 0.3, 1), offset: 12 },
  stagger: 40,
  sheet: { damping: 22, stiffness: 220, mass: 1 },
  snap: { damping: 14, stiffness: 260, mass: 1 },
  count: 600,
  draw: 350,
  celebrate: 1200,
};

// A9 — Fonds papier ligné et quadrillé.
export const paperLines = { step: 28, color: 'rgba(228,222,210,0.55)' };

export { theme, brand, colors };
export default { SUBJECT_TINTS, subjectTint, LEVELS, PODIUM, GRADIENTS, type, motion };


export const DARK_SUBJECT_TINTS = [
  { tint: '#9CBFFF', wash: '#203351', solid: '#264069' },
  { tint: '#E08B9E', wash: '#302335', solid: '#6C2838' },
  { tint: '#91D2C8', wash: '#193A39', solid: '#1F5F5B' },
  { tint: brand.goldLight, wash: '#302A21', solid: '#7A5A24' },
  { tint: '#C7B4EF', wash: '#302B46', solid: '#4B3A6B' },
  { tint: '#BBC7D9', wash: '#293344', solid: '#4F5E72' },
];

// Construit une seule fois par palette ; aucune couleur mutable globale.
export const createPrepPalette = ({ brand: b, colors: c, isDark }) => {
  const tints = isDark ? DARK_SUBJECT_TINTS : SUBJECT_TINTS;
  return {
    SUBJECT_TINTS: tints,
    subjectTint: (index = 0) => tints[Math.abs(index) % tints.length],
    LEVELS: isDark ? {
      1: { ...LEVELS[1], color: b.inkSoft },
      2: { ...LEVELS[2], color: '#9CBFFF' },
      3: LEVELS[3],
    } : LEVELS,
    PODIUM,
    GRADIENTS: { ...GRADIENTS, night: [b.night, b.inkDeep], paperVeil: [b.paperTransparent, b.paper] },
    paperLines: isDark ? { ...paperLines, color: b.line } : paperLines,
    STATE_COLORS: {
      juste: { bg: c.successWash, border: c.success, fg: c.success },
      faux: { bg: c.errorWash, border: c.error, fg: c.error },
      oublie: { bg: 'transparent', border: c.success, fg: c.success, dashed: true },
      neutre: { bg: b.sheet, border: b.line, fg: b.ink },
    },
  };
};
