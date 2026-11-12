/**
 * Design System Tokens — Fatafalta
 *
 * Identité : encre (bleu nuit) dominante, papier ivoire, or pour la valeur,
 * bordeaux pour l'interaction. Valeurs de marque définies dans ./brand.js.
 * Typo    : Inter, hiérarchie 7 niveaux
 * Spacing : multiples de 4
 */

import { Platform } from 'react-native';
import { brand as identity } from './brand';

// Rôles distincts : l’encre du texte évolue, celle des moments reste profonde.
export const brand = {
  ...identity,
  night: identity.ink,
  onInkMuted: 'rgba(255,255,255,0.55)',
  inkAccent: identity.inkGlow,
  monogramInk: identity.ink,
  monogramBurgundy: identity.burgundy,
  monogramGold: identity.goldInk,
  inactiveOpacity: 0.6,
  burgundySolid: identity.burgundy,
  avatarTints: [identity.inkGlow, identity.burgundy, '#1F5F5B', identity.goldInk, '#4B3A6B', identity.inkSoft],
  action: identity.burgundy,
  actionBright: identity.burgundyBright,
  actionDeep: identity.burgundyDeep,
  onAction: identity.onInk,
  onGold: identity.ink,
  paperTransparent: 'rgba(252,250,245,0)',
  ghost: 'rgba(244,240,230,0.34)',
  actionBorder: 'rgba(108,40,56,0.45)',
  actionBorderStrong: 'rgba(108,40,56,0.55)',
  actionBorderSoft: 'rgba(108,40,56,0.18)',
  highlight: 'rgba(228,201,151,0.55)',
};

// ── Colors ──────────────────────────────────────
// Rôles sémantiques historiques (primary, accent…), désormais alignés sur
// l'identité : les écrans qui les utilisent adoptent la marque sans réécriture.
export const colors = {
  // Primary — encre
  primary: brand.ink,
  primaryDark: brand.inkDeep,
  primaryLight: brand.inkGlow,
  primaryWash: brand.paperDim,
  primary100: brand.line,
  primary200: brand.lineStrong,
  primary900: brand.inkDeep,

  // Accent — bordeaux (CTA téléchargement, actions secondaires fortes)
  accent: brand.burgundy,
  accentDark: '#561F2C',
  accentLight: '#8E3B50',
  accentWash: brand.burgundyWash,

  // Success / Error / Warning — tons profonds, lisibles en texte sur fond clair (≥ 4,5:1)
  success: '#1F7A55',
  successWash: '#E8F3EC',
  successSolid: '#1F7A55',
  error: '#B42318',
  errorWash: '#FBEDEB',
  errorSolid: '#B42318',
  warning: '#8F530F',
  warningWash: brand.goldWash,
  warningSolid: '#8F530F',

  // Neutrals
  background: brand.paper,
  surface: '#FFFFFF',
  surfaceRaised: brand.paperDim,
  surfaceOverlay: 'rgba(252, 250, 245, 0.86)',

  // Text
  textPrimary: brand.ink,
  textSecondary: brand.inkSoft,
  textMuted: brand.inkMuted,
  textInverse: '#FFFFFF',

  // Borders
  border: brand.line,
  borderLight: '#EFEADF',

  // Misc
  skeleton: brand.skeleton,
  skeletonHighlight: brand.paperDim,
  backdrop: brand.backdrop,
};

// Palettes spécialisées : couleurs des illustrations et types de fichiers conservées.
export const fileType = {
  pdf: '#EF4444',
  pdfWash: '#FEF2F2',
  word: '#2563EB',
  wordWash: '#EFF6FF',
  presentation: '#F97316',
  presentationWash: '#FFF7ED',
  spreadsheet: '#10B981',
  spreadsheetWash: '#ECFDF5',
  image: '#8B5CF6',
  imageWash: '#F5F3FF',
  audio: '#EC4899',
  audioWash: '#FDF2F8',
  archive: '#F59E0B',
  archiveWash: '#FFFBEB',
};

export const trainingFeedback = {
  hint: '#B45309',
  correct: '#047857',
  correctText: '#065F46',
  hintText: '#92400E',
  questionBorder: '#E9EFF8',
  questionShadow: '#1E3A8A',
  correctBorder: '#6EE7B7',
  correctWash: '#ECFDF5',
  wrongBorder: '#FECACA',
  wrongWash: '#FEF2F2',
  feedbackBorder: '#A7F3D0',
  hintWash: '#FFFBEB',
  hintBorder: '#FDE68A',
};

export const illustration = {
  shadow: '#000000',
  foldHighlight: '#F3E1B5',
  foldMuted: '#F7F4EC',
};

export const organismPalette = {
  teal: '#14514C',
  blue: '#2B4A8B',
  plum: '#53346B',
  green: '#2E5A2E',
  terracotta: '#9A4421',
  slate: '#3A3F4B',
};

export const subjectPalette = {
  teal: '#1F5F5B',
  plum: '#4B3A6B',
  inkWash: '#E9EEF5',
};

export const countryFlag = {
  orange: '#F77F00',
  green: '#009E60',
};

export const studySurface = {
  tableAlternate: '#FBF9F4',
  adminShadow: '#0F172A',
};

export const rankingTrend = {
  up: '#8FD9B4',
  down: '#F3ADA4',
};

// ── Typography ──────────────────────────────────
export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  // Serif d'apparat : titres d'écran, chiffres héros, mise en valeur.
  serif: 'Playfair-Bold',
  serifSemiBold: 'Playfair-SemiBold',
  serifItalic: 'Playfair-BoldItalic',
};

export const typography = {
  // Titres en Playfair Display : la voix « copie d'excellence » de la marque.
  display: {
    fontFamily: fontFamily.serif,
    fontVariant: ['lining-nums'],
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontVariant: ['lining-nums'],
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: fontFamily.serif,
    fontVariant: ['lining-nums'],
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fontFamily.serif,
    fontVariant: ['lining-nums'],
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

// ── Spacing (multiples of 4) ────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

// ── Border Radius ───────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// ── Shadows (platform-adaptive) ─────────────────
const createShadow = (offsetY, blurRadius, opacity, elevation, color = '#000') => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowRadius: blurRadius,
  shadowOpacity: opacity,
  ...(Platform.OS === 'android' ? { elevation } : {}),
});

// Profondeur « papier » : la séparation vient du ton (carte blanche sur papier ivoire) et du filet,
// pas de l'ombre. Aucune élévation Android sur les cartes (évite le halo gris et l'effet d'empilement) ;
// seuls les éléments réellement flottants (feuilles, menus, barre d'onglets) en gardent une.
export const shadows = {
  sm: createShadow(1, 2, 0.035, 0),
  md: createShadow(2, 6, 0.05, 0),
  lg: createShadow(6, 18, 0.08, 3),
  xl: createShadow(12, 24, 0.12, 8),
  card: createShadow(1, 3, 0.035, 0),
  cardHover: createShadow(6, 16, 0.1, 4),
  soft: createShadow(1, 4, 0.04, 0),
  button: createShadow(3, 8, 0.16, 0),
};

// ── Transitions ─────────────────────────────────
export const durations = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Mise en page commune aux écrans du parcours
export const layout = {
  gutter: 20,
  // 680 pt de lecture entre deux marges de 20 pt ; catalogue à trois colonnes.
  readingFrame: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  catalogFrame: { width: '100%', maxWidth: 1040, alignSelf: 'center' },
  rowMinHeight: 64,
  touch: 44,
};

// ── Hit slop ────────────────────────────────────
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

// ── Convenience export ──────────────────────────
const theme = {
  colors,
  brand,
  layout,
  typography,
  fontFamily,
  spacing,
  radius,
  shadows,
  durations,
  hitSlop,
};

export default theme;

/** Nuit d'étude : la même copie sous une lampe, jamais une inversion des images. */
export const darkBrand = {
  ...brand,
  ink: '#F3EEE4',
  onInkMuted: 'rgba(255,255,255,0.66)',
  inkAccent: '#9CBFFF',
  inactiveOpacity: 1,
  inkSoft: '#B9C3D2',
  inkMuted: '#A9B5C6',
  paper: '#0F1A2C',
  sheet: '#16233A',
  paperDim: '#1D2C43',
  line: 'rgba(255,255,255,0.10)',
  lineStrong: 'rgba(255,255,255,0.24)',
  burgundy: '#E08B9E',
  burgundySolid: '#8B344B',
  burgundyWash: '#302335',
  burgundyBright: '#E8A0AE',
  burgundyDeep: '#D4778B',
  action: '#C45F75',
  actionBright: '#D4778B',
  actionDeep: '#C45F75',
  onAction: brand.inkDeep,
  onGold: brand.inkDeep,
  goldInk: brand.goldLight,
  goldWash: '#302A21',
  pressed: 'rgba(255,255,255,0.06)',
  skeleton: '#26354C',
  backdrop: 'rgba(3,8,17,0.76)',
  paperTransparent: 'rgba(15,26,44,0)',
  ghost: '#293342',
  actionBorder: 'rgba(224,139,158,0.45)',
  actionBorderStrong: 'rgba(224,139,158,0.55)',
  actionBorderSoft: 'rgba(224,139,158,0.24)',
  highlight: 'rgba(180,138,72,0.20)',
};

export const darkColors = {
  ...colors,
  primary: darkBrand.ink,
  primaryDark: darkBrand.ink,
  primary900: darkBrand.ink,
  primaryLight: darkBrand.inkSoft,
  primaryWash: darkBrand.paperDim,
  primary100: darkBrand.line,
  primary200: darkBrand.lineStrong,
  accent: darkBrand.burgundy,
  accentDark: darkBrand.burgundyDeep,
  accentLight: darkBrand.burgundyBright,
  accentWash: darkBrand.burgundyWash,
  success: '#86D4AC', successWash: '#183B32', successSolid: '#226746',
  error: '#FFAAA3', errorWash: '#40272F', errorSolid: '#A72C35',
  warning: '#E8C48B', warningWash: darkBrand.goldWash, warningSolid: '#805013',
  background: darkBrand.paper,
  surface: darkBrand.sheet,
  surfaceRaised: darkBrand.paperDim,
  surfaceOverlay: 'rgba(15,26,44,0.94)',
  textPrimary: darkBrand.ink,
  textSecondary: darkBrand.inkSoft,
  textMuted: darkBrand.inkMuted,
  border: darkBrand.line,
  borderLight: darkBrand.line,
  skeleton: darkBrand.skeleton,
  skeletonHighlight: darkBrand.paperDim,
  backdrop: darkBrand.backdrop,
};

export const darkTheme = { ...theme, isDark: true, brand: darkBrand, colors: darkColors };
export const lightPalette = {
  isDark: false, theme, brand, colors, fileType, trainingFeedback, illustration,
  organismPalette, subjectPalette, countryFlag, studySurface, rankingTrend,
};
export const darkPalette = {
  ...lightPalette, isDark: true, theme: darkTheme, brand: darkBrand, colors: darkColors,
  fileType: {
    pdf: '#FFAAA3', pdfWash: '#40272F', word: '#9CBFFF', wordWash: '#203351',
    presentation: '#F4BC8E', presentationWash: '#382B25',
    spreadsheet: '#86D4AC', spreadsheetWash: '#183B32',
    image: '#C7B4EF', imageWash: '#302B46', audio: '#ECA9CD', audioWash: '#3A273C',
    archive: '#E8C48B', archiveWash: '#302A21',
  },
  trainingFeedback: {
    ...trainingFeedback,
    hint: darkColors.warning, correct: darkColors.success, correctText: darkColors.success,
    hintText: darkColors.warning, questionBorder: darkBrand.line,
    correctBorder: darkColors.success, correctWash: darkColors.successWash,
    wrongBorder: darkColors.error, wrongWash: darkColors.errorWash,
    feedbackBorder: darkColors.success, hintWash: darkColors.warningWash, hintBorder: darkColors.warning,
  },
  studySurface: { ...studySurface, tableAlternate: '#142138' },
  subjectPalette: { ...subjectPalette, inkWash: '#203351' },
};
