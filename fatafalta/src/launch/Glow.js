import React, { memo } from 'react';
import { Platform, View } from 'react-native';

/*
 * Lumière diffuse : un disque dont l'intensité retombe comme une gaussienne, sans bord visible.
 * Dessinée par le moteur de rendu natif (dégradé radial de React Native, CSS sur le web) :
 * ni image à décoder, ni flou calculé, et la vue s'anime par transform / opacity uniquement.
 */
const FALLOFF = [[0, 1], [0.12, 0.82], [0.26, 0.56], [0.4, 0.34], [0.55, 0.18], [0.7, 0.08], [0.85, 0.025], [1, 0]];
// Anneau diffus : une onde de lumière, pas un cercle tracé au compas.
const RING = [[0, 0.1], [0.5, 0.03], [0.74, 0.3], [0.84, 1], [0.92, 0.32], [1, 0]];

const channels = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));

// Couleur translucide dérivée d'un jeton (#RRGGBB).
export const tint = (color, alpha) => `rgba(${channels(color).join(',')},${alpha})`;

export const glowImage = (color, peak = 1, shape = 'circle', ring = false) => {
  const [r, g, b] = channels(color);
  // Même teinte jusqu'au bout (alpha 0) : pas de frange sombre en bord de halo.
  const stops = (ring ? RING : FALLOFF).map(([at, alpha]) => ({ color: `rgba(${r},${g},${b},${Number((alpha * peak).toFixed(4))})`, at: `${at * 100}%` }));
  if (Platform.OS === 'web') {
    return { backgroundImage: `radial-gradient(${shape} closest-side, ${stops.map((stop) => `${stop.color} ${stop.at}`).join(', ')})` };
  }
  return {
    experimental_backgroundImage: [{
      type: 'radial-gradient',
      shape,
      size: 'closest-side',
      position: { top: '50%', left: '50%' },
      colorStops: stops.map((stop) => ({ color: stop.color, positions: [stop.at] })),
    }],
  };
};

/**
 * @param {number} props.size diamètre (ou largeur si `height` est fourni : halo elliptique)
 * @param {string} props.color couleur de la lumière (#RRGGBB)
 * @param {number} props.peak opacité au plus fort de la lumière
 * @param {boolean} props.ring anneau diffus au lieu d'un disque
 */
const Glow = ({ size, height, color, peak = 1, ring = false, style }) => (
  <View
    pointerEvents="none"
    style={[{ width: size, height: height ?? size }, glowImage(color, peak, height ? 'ellipse' : 'circle', ring), style]}
  />
);

export default memo(Glow);
