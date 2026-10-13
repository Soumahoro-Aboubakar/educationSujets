import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { brand, logo } from '../../theme/brand';

// Couleurs du symbole selon le fond sur lequel il est posé.
const VARIANTS = {
  tile: { tile: brand.ink, letter: brand.paper, flap: brand.goldLight }, // tuile pleine, tous fonds
  onDark: { letter: brand.paper, flap: brand.goldLight }, // fond encre ou coloré
  onLight: { letter: brand.ink, flap: brand.gold }, // fond papier ou blanc
};

/**
 * Symbole Fatafalta : le F corné (voir theme/brand.js).
 * @param {number} props.size côté du cadre carré, en dp
 * @param {'tile'|'onDark'|'onLight'} props.variant
 */
const BrandMark = ({ size = 32, variant = 'tile', style }) => {
  const colors = VARIANTS[variant] || VARIANTS.tile;
  return (
    <Svg width={size} height={size} viewBox={logo.viewBox} style={style} accessibilityLabel="Fatafalta">
      {colors.tile ? <Rect width="100" height="100" rx={logo.tileRadius} fill={colors.tile} /> : null}
      <Path d={logo.body} fill={colors.letter} />
      <Path d={logo.flap} fill={colors.flap} />
    </Svg>
  );
};

export default BrandMark;
