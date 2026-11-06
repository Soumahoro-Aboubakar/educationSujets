/**
 * Design System Tokens — Fatafalta
 *
 * Identité : encre (bleu nuit) dominante, papier ivoire, or pour la valeur,
 * bordeaux pour l'interaction. Valeurs de marque définies dans ./brand.js.
 * Typo    : Inter, hiérarchie 7 niveaux
 * Spacing : multiples de 4
 */

import { Platform } from 'react-native';
import { brand } from './brand';

export { brand };

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
  error: '#B42318',
  errorWash: '#FBEDEB',
  warning: '#8F530F',
  warningWash: brand.goldWash,

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

export const shadows = {
  sm: createShadow(1, 3, 0.06, 1),
  md: createShadow(4, 8, 0.08, 3),
  lg: createShadow(8, 16, 0.1, 6),
  xl: createShadow(12, 24, 0.12, 8),
  card: createShadow(2, 12, 0.06, 2, brand.ink),
  cardHover: createShadow(8, 24, 0.12, 6, brand.ink),
  // Cartes ivoire des références : ombre basse, large et très diffuse.
  soft: createShadow(8, 22, 0.07, 3, brand.ink),
  button: createShadow(8, 16, 0.28, 5, brand.burgundyDeep),
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
