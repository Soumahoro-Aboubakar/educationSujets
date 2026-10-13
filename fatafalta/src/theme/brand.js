/**
 * Identité Fatafalta — source unique, partagée par l'application (tokens.js,
 * BrandMark, BrandIntro) et par le script de génération des icônes
 * (scripts/generate-brand-assets.mjs). Aucun import React Native ici :
 * le fichier doit pouvoir être lu par Node.
 *
 * Concept « le F corné » : la lettre F dessinée comme une feuille dont le coin
 * supérieur est corné — le geste de l'élève qui marque la page à réviser.
 * Le revers du coin, or, signale ce qui a de la valeur : le sujet retrouvé,
 * le corrigé, la réussite.
 */

// ── Palette ─────────────────────────────────────
// Encre (bleu nuit) : confiance, sérieux académique — couleur de marque.
// Papier (ivoire) : la copie d'examen, fond de lecture chaleureux.
// Or : valeur et réussite, réservé aux accents (coin corné, statuts positifs).
// Bordeaux : unique couleur d'interaction (liens, chevrons, focus, CTA secondaires).
export const brand = {
  ink: '#0D1B32',
  inkDeep: '#081224',
  inkGlow: '#264069',
  inkSoft: '#4F5E72',
  inkMuted: '#7A8697',
  paper: '#FCFAF5',
  paperDim: '#F4F0E6',
  line: '#E4DED2',
  lineStrong: '#CFC7B8',
  burgundy: '#6C2838',
  burgundyWash: '#F4E9EA',
  gold: '#B48A48',
  goldLight: '#E4C997',
  goldWash: '#F6EEDF',
  goldInk: '#7A5A24',
  onInk: '#FFFFFF',
  onInkSoft: 'rgba(255,255,255,0.66)',
  onInkAccent: '#E4C997',
  pressed: 'rgba(13,27,50,0.04)',
  skeleton: '#ECE7DC',
  backdrop: 'rgba(13,27,50,0.56)',
};

// ── Symbole ─────────────────────────────────────
// Tracés dans un cadre de 100 × 100 ; le F est centré optiquement
// (sa masse est à gauche, la boîte englobante est donc décalée d'un point à droite).
export const logo = {
  viewBox: '0 0 100 100',
  // Corps du F, coin supérieur droit coupé en diagonale (la pliure).
  body: 'M34 18H63L75 30V31A3 3 0 0 1 72 34H47V44H62A3 3 0 0 1 65 47V55A3 3 0 0 1 62 58H47V79A3 3 0 0 1 44 82H34A3 3 0 0 1 31 79V21A3 3 0 0 1 34 18Z',
  // Revers du coin, rabattu sur la barre du F.
  flap: 'M63 18L75 30H65.5A2.5 2.5 0 0 1 63 27.5Z',
  // Coin encore déplié (état initial du splash, avant l'animation de pliure).
  corner: 'M63 18H72A3 3 0 0 1 75 21V30Z',
  // F complet, coin déplié, d'un seul tenant (image du splash natif, sans couture).
  bodyUnfolded: 'M34 18H72A3 3 0 0 1 75 21V31A3 3 0 0 1 72 34H47V44H62A3 3 0 0 1 65 47V55A3 3 0 0 1 62 58H47V79A3 3 0 0 1 44 82H34A3 3 0 0 1 31 79V21A3 3 0 0 1 34 18Z',
  // Charnière de la pliure : du point (63, 18) au point (75, 30).
  hinge: { x1: 63, y1: 18, x2: 75, y2: 30 },
  // Tuile de l'icône (coins arrondis façon lanceur).
  tileRadius: 22,
};

// Taille du symbole sur le splash natif (dp/pt) ; l'intro animée la reprend
// à l'identique pour enchaîner sans saut. Gardée en phase avec app.json.
export const SPLASH_IMAGE_WIDTH = 160;

export default brand;
