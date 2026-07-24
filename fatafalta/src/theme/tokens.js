/**
 * Design System Tokens — Éducation CI (Fatafalta)
 *
 * Palette : Bleu #2563EB dominant, orange #F97316 accent (CTA only)
 * Typo    : Inter, hiérarchie 7 niveaux
 * Spacing : multiples de 4
 * Inspiré des codes visuels de Linear, Arc, Notion
 */

import { Platform } from 'react-native';

// ── Colors ──────────────────────────────────────
export const colors = {
  // Primary — Bleu dominant
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryWash: '#EFF6FF',
  primary100: '#DBEAFE',
  primary200: '#BFDBFE',
  primary900: '#1E3A8A',

  // Accent — Orange (CTA téléchargement UNIQUEMENT)
  accent: '#F97316',
  accentDark: '#EA580C',
  accentLight: '#FB923C',
  accentWash: '#FFF7ED',

  // Success / Error / Warning
  success: '#10B981',
  successWash: '#ECFDF5',
  error: '#EF4444',
  errorWash: '#FEF2F2',
  warning: '#F59E0B',
  warningWash: '#FFFBEB',

  // Neutrals
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F5F9',
  surfaceOverlay: 'rgba(255, 255, 255, 0.72)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Misc
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
  backdrop: 'rgba(15, 23, 42, 0.4)',
};

// ── Typography ──────────────────────────────────
export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
};

export const typography = {
  h1: {
    fontFamily: fontFamily.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
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
  card: createShadow(2, 12, 0.06, 2, '#2563EB'),
  cardHover: createShadow(8, 24, 0.12, 6, '#2563EB'),
};

// ── Transitions ─────────────────────────────────
export const durations = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// ── Hit slop ────────────────────────────────────
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

// ── Convenience export ──────────────────────────
const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  radius,
  shadows,
  durations,
  hitSlop,
};

export default theme;
