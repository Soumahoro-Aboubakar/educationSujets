import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import theme from '../../theme/tokens';

const { brand } = theme;

// Lignes de texte simulées sur la copie de sujet.
const TEXT_LINES = [144, 132, 140, 96];

/**
 * Fond de l'écran d'accueil : halo et trame de points, en plein cadre.
 */
export const OrientationBackdrop = () => (
  <Svg style={StyleSheet.absoluteFill} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
    <Defs>
      <RadialGradient id="glow" cx="78%" cy="22%" r="70%">
        <Stop offset="0" stopColor="#264069" stopOpacity="1" />
        <Stop offset="1" stopColor={brand.ink} stopOpacity="0" />
      </RadialGradient>
      <Pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
        <Circle cx="2" cy="2" r="1" fill="#FFFFFF" fillOpacity="0.07" />
      </Pattern>
    </Defs>
    <Rect width="390" height="844" fill={brand.ink} />
    <Rect width="390" height="844" fill="url(#glow)" />
    <Rect width="390" height="844" fill="url(#dots)" />
  </Svg>
);

/**
 * Illustration de l'écran d'accueil : une pile d'anciens sujets,
 * celui du dessus portant le tampon « corrigé ». Vectorielle pour rester
 * nette sur tous les écrans sans alourdir l'application.
 * Mise à l'échelle sans rognage (`meet`) : elle occupe l'espace disponible
 * entre la marque et le titre, quelle que soit la hauteur de l'écran.
 */
const OrientationArt = ({ style }) => (
  <Svg style={[styles.fill, style]} viewBox="14 34 386 320" preserveAspectRatio="xMidYMid meet">
    {/* Copies en arrière-plan */}
    <G transform="translate(222 52) rotate(14)">
      <Rect width="170" height="220" rx="12" fill="#FFFFFF" fillOpacity="0.04" stroke="#FFFFFF" strokeOpacity="0.12" />
    </G>
    <G transform="translate(192 70) rotate(5)">
      <Rect width="176" height="226" rx="12" fill="#FFFFFF" fillOpacity="0.07" stroke="#FFFFFF" strokeOpacity="0.14" />
    </G>

    {/* Sujet au premier plan */}
    <G transform="translate(146 96) rotate(-7)">
      <Rect x="6" y="12" width="180" height="232" rx="12" fill="#000000" fillOpacity="0.28" />
      <Rect width="180" height="232" rx="12" fill={brand.paper} />
      <Rect x="18" y="20" width="36" height="6" rx="3" fill={brand.burgundy} />
      <Rect x="18" y="36" width="112" height="9" rx="4.5" fill={brand.ink} />
      <Rect x="18" y="52" width="70" height="6" rx="3" fill={brand.inkMuted} fillOpacity="0.55" />
      <Rect x="18" y="72" width="144" height="1" fill={brand.lineStrong} />
      {TEXT_LINES.map((width, index) => (
        <Rect key={width} x="18" y={88 + index * 14} width={width} height="5" rx="2.5" fill={brand.ink} fillOpacity="0.14" />
      ))}
      <Circle cx="22" cy="154" r="3" fill={brand.gold} />
      <Rect x="32" y="151.5" width="110" height="5" rx="2.5" fill={brand.ink} fillOpacity="0.14" />
      <Circle cx="22" cy="172" r="3" fill={brand.gold} />
      <Rect x="32" y="169.5" width="86" height="5" rx="2.5" fill={brand.ink} fillOpacity="0.14" />

      {/* Tampon « corrigé » */}
      <G transform="translate(152 206)">
        <Circle r="27" fill={brand.gold} />
        <Circle r="21" fill="none" stroke={brand.paper} strokeOpacity="0.55" strokeWidth="1.5" />
        <Path d="M-9 0 L-3 6 L10 -7" fill="none" stroke={brand.paper} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </G>

    {/* Étiquette flottante : évoque le classement par session */}
    <G transform="translate(36 146) rotate(-10)">
      <Rect width="88" height="30" rx="15" fill="#FFFFFF" fillOpacity="0.08" stroke="#FFFFFF" strokeOpacity="0.16" />
      <Circle cx="17" cy="15" r="5" fill={brand.gold} />
      <Rect x="29" y="12" width="44" height="6" rx="3" fill="#FFFFFF" fillOpacity="0.5" />
    </G>
  </Svg>
);

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
});

export default OrientationArt;
