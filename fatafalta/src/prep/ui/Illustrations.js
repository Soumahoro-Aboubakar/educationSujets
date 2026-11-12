import { useTheme } from '../../theme/ThemeProvider';
import React, { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useReduceMotion } from '../feedback';

/**
 * Illustrations de la préparation (maquettes A8) : vectorielles, géométriques, feuilles de papier
 * légèrement inclinées, lignes de texte simulées, pastilles or. Pas de personnages, pas de bitmap.
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const GoldDefs = () => {
  const { brand } = useTheme();
  return (<Defs>
    <LinearGradient id="aube" x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={brand.goldLight} />
      <Stop offset="1" stopColor={brand.gold} />
    </LinearGradient>
  </Defs>);
};

/** Jalon qui « s'allume » (rayon 0 → r), échelonné. */
const Milestone = ({ cx, cy, r, fill, stroke, delay, reduce }) => {
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) v.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.back(2)) })); }, [reduce, delay, v]);
  const props = useAnimatedProps(() => ({ r: r * v.value }));
  return <AnimatedCircle cx={cx} cy={cy} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : 0} animatedProps={props} />;
};

/** Trait qui se dessine (A10 « draw »). */
const DrawnPath = ({ d, length, stroke, width = 2.5, delay = 0, duration = 800, dash, reduce }) => {
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) })); }, [reduce, delay, duration, v]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - v.value) }));
  return (
    <>
      {dash ? <Path d={d} stroke={stroke} strokeOpacity={0.25} strokeWidth={width} fill="none" strokeDasharray={dash} strokeLinecap="round" /> : null}
      <AnimatedPath d={d} stroke={stroke} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={`${length} ${length}`} animatedProps={props} />
    </>
  );
};

/** Carnet ouvert + chemin de 4 jalons, le dernier en or (E01, E04). */
export const NotebookPath = ({ size = 140, onDark = false }) => {
  const { brand } = useTheme();
  const reduce = useReduceMotion();
  const page = onDark ? 'rgba(255,255,255,0.08)' : brand.sheet;
  const line = onDark ? 'rgba(255,255,255,0.18)' : brand.line;
  const ink = onDark ? brand.onInk : brand.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 140 140" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <GoldDefs />
      <G transform="rotate(-6 70 70)">
        <Rect x="14" y="26" width="56" height="84" rx="6" fill={page} stroke={line} />
        <Rect x="70" y="26" width="56" height="84" rx="6" fill={page} stroke={line} />
        <Line x1="70" y1="28" x2="70" y2="108" stroke={line} strokeWidth="2" />
        {[40, 50, 60].map((y) => <Rect key={y} x="22" y={y} width={y === 60 ? 26 : 40} height="3" rx="1.5" fill={line} />)}
        <Path d="M108 26V44L114 39L120 44V26Z" fill={brand.burgundy} />
      </G>
      <DrawnPath d="M28 92C44 78 56 98 70 84S96 66 112 74" length={110} stroke={onDark ? brand.goldLight : brand.ink} width={2} delay={300} dash="1 6" reduce={reduce} />
      <Milestone cx={28} cy={92} r={5} fill={ink} delay={250} reduce={reduce} />
      <Milestone cx={56} cy={90} r={5} fill={ink} delay={450} reduce={reduce} />
      <Milestone cx={84} cy={78} r={5} fill={ink} delay={650} reduce={reduce} />
      <Milestone cx={112} cy={74} r={8} fill="url(#aube)" delay={1100} reduce={reduce} />
    </Svg>
  );
};

/** Boussole de papier (E02). */
export const PaperCompass = ({ size = 56 }) => {
  const { brand } = useTheme();
  return (<Svg width={size} height={size} viewBox="0 0 56 56" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <GoldDefs />
    <Circle cx="28" cy="28" r="25" fill={brand.sheet} stroke={brand.line} strokeWidth="1.5" />
    <Circle cx="28" cy="28" r="19" fill="none" stroke={brand.line} strokeDasharray="1 4" />
    <Path d="M28 10L33 28H23Z" fill={brand.burgundy} />
    <Path d="M28 46L23 28H33Z" fill="url(#aube)" />
    <Circle cx="28" cy="28" r="3" fill={brand.ink} />
  </Svg>);
};

/** Cible + feuille cornée plantée au centre (E31). */
export const TargetSheet = ({ size = 160 }) => {
  const { brand } = useTheme();
  return (<Svg width={size} height={size} viewBox="0 0 160 160" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <GoldDefs />
    {[64, 46, 28].map((r, i) => <Circle key={r} cx="80" cy="84" r={r} fill="none" stroke={brand.onInk} strokeOpacity={0.14 + i * 0.1} strokeWidth="2" />)}
    <Circle cx="80" cy="84" r="10" fill="url(#aube)" />
    <G transform="rotate(12 96 60)">
      <Rect x="84" y="30" width="34" height="44" rx="4" fill={brand.paper} />
      <Path d="M108 30H118V40Z" fill="url(#aube)" />
      {[42, 50, 58].map((y) => <Rect key={y} x="90" y={y} width="20" height="2.5" rx="1" fill={brand.line} />)}
    </G>
    <Line x1="80" y1="84" x2="98" y2="68" stroke={brand.onInk} strokeWidth="2" />
  </Svg>);
};

/** Chronomètre de papier, secteur or (E32). */
export const PaperStopwatch = ({ size = 150 }) => {
  const { brand } = useTheme();
  return (<Svg width={size} height={size} viewBox="0 0 150 150" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <GoldDefs />
    <Rect x="64" y="14" width="22" height="12" rx="4" fill={brand.paper} />
    <Circle cx="75" cy="82" r="54" fill={brand.paper} />
    <Path d="M75 82V36A46 46 0 0 1 117 63Z" fill="url(#aube)" />
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return <Line key={i} x1={75 + 48 * Math.sin(a)} y1={82 - 48 * Math.cos(a)} x2={75 + 42 * Math.sin(a)} y2={82 - 42 * Math.cos(a)} stroke={brand.ink} strokeOpacity="0.3" strokeWidth="2" />;
    })}
    <Line x1="75" y1="82" x2="75" y2="44" stroke={brand.ink} strokeWidth="3" strokeLinecap="round" />
    <Circle cx="75" cy="82" r="4" fill={brand.ink} />
  </Svg>);
};

/** Carnet d'erreurs fermé, marque-page bordeaux et coche or (état vide E29). */
export const ErrorNotebook = ({ size = 120 }) => {
  const { brand } = useTheme();
  return (<Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <GoldDefs />
    <G transform="rotate(-5 60 60)">
      <Rect x="26" y="18" width="68" height="88" rx="8" fill={brand.sheet} stroke={brand.line} strokeWidth="1.5" />
      <Rect x="26" y="18" width="12" height="88" rx="6" fill={brand.paperDim} />
      <Path d="M74 18V44L80 39L86 44V18Z" fill={brand.burgundy} />
      <Circle cx="62" cy="68" r="16" fill="url(#aube)" />
      <Path d="M54 68L60 74L71 62" stroke={brand.onInk} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  </Svg>);
};

/** Nuage barré (hors ligne / erreur réseau). */
export const CloudOffArt = ({ size = 110 }) => {
  const { brand } = useTheme();
  return (<Svg width={size} height={size} viewBox="0 0 110 110" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M32 76H80A18 18 0 0 0 78 40A26 26 0 0 0 30 46A15 15 0 0 0 32 76Z" fill="none" stroke={brand.ink} strokeWidth="3" strokeLinejoin="round" />
    <Line x1="22" y1="22" x2="90" y2="90" stroke={brand.burgundy} strokeWidth="4" strokeLinecap="round" />
  </Svg>);
};

/** Podium de feuilles (E34) : 2ᵉ à gauche, 1ᵉʳ au centre, 3ᵉ à droite. */
export const PaperPodium = ({ width = 240 }) => {
  const { brand } = useTheme();
  return (<Svg width={width} height={width * 0.42} viewBox="0 0 240 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <GoldDefs />
    {[[12, 40, 60], [90, 14, 86], [168, 54, 46]].map(([x, y, h], i) => (
      <G key={x}>
        <Rect x={x} y={y} width="60" height={h} rx="6" fill={brand.paper} stroke={brand.line} />
        <Path d={`M${x + 48} ${y}H${x + 60}V${y + 12}Z`} fill={i === 1 ? 'url(#aube)' : brand.lineStrong} />
      </G>
    ))}
  </Svg>);
};
