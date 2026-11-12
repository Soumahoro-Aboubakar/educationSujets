import useAsyncAction from '../../hooks/useAsyncAction';
import StudyLamp from '../../theme/StudyLamp';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen, Check, Ellipsis, Feather, FlaskConical, Landmark, Languages, Lock, Sigma,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/ui/Text';
import { motion, subjectIconName, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Carte ou bouton qui s'enfonce à l'appui (A10 « press » : 100 ms, échelle 0,97). */
export const PressScale = ({ onPress, onLongPress, onPressIn, onPressOut, disabled, style, children, scaleTo = motion.press.scale, hapticOnPress, accessibilityLabel, accessibilityRole = 'button', accessibilityState, accessibilityHint, hitSlop, loadingIndicator = true, ...props }) => {
  const [run, pending] = useAsyncAction();
  const { brand } = useTheme();
  const pressed = useSharedValue(0);
  const reduce = useReduceMotion();
  const animated = useAnimatedStyle(() => ({ opacity: 1 - pressed.value * 0.2, transform: [{ scale: reduce ? 1 : interpolate(pressed.value, [0, 1], [1, scaleTo]) }] }));
  return (
    <AnimatedPressable
      {...props}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ ...(accessibilityState || {}), disabled: Boolean(disabled || pending), busy: Boolean(pending || accessibilityState?.busy) }}
      disabled={disabled || pending}
      hitSlop={hitSlop}
      onPressIn={(event) => { pressed.value = reduce ? 1 : withTiming(1, { duration: motion.press.duration, easing: Easing.out(Easing.quad) }); onPressIn?.(event); }}
      onPressOut={(event) => { pressed.value = reduce ? 0 : withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }); onPressOut?.(event); }}
      onPress={(e) => { if (disabled || pending) return; if (hapticOnPress) haptic.select(); return run(onPress, e); }}
      onLongPress={onLongPress}
      style={[style, animated]}
    >
      {children}
      {pending && loadingIndicator ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 12 }]}><ActivityIndicator size="small" color={brand.burgundy} /></View> : null}
    </AnimatedPressable>
  );
};

/**
 * Boutons : un bouton doit se lire comme un bouton, jamais comme du texte.
 * - primary : bordeaux plein (56) — l'action principale, une par écran ;
 * - secondary : blanc à filet bordeaux (52) ;
 * - link (tertiaire) : pastille bordeaux pâle (48) — actions de repli (« Plus tard », « Retour… ») ;
 * - gold : Aube or, réservé à « S'abonner » ; light : ivoire sur fond Nuit.
 */
export const PrepButton = ({ title, onPress, variant = 'primary', icon: Icon, iconLeft: IconLeft, disabled, loading, style, textStyle, accessibilityLabel, accessibilityState, compact, ...props }) => {
  const { brand, colors } = useTheme();
  const { styles } = useStyles();
  const [run, pending] = useAsyncAction();
  const busy = Boolean(loading || pending);
  const isLink = variant === 'link';
  const isGold = variant === 'gold';
  const isLight = variant === 'light';
  const isPrimary = variant === 'primary';
  const textColor = disabled ? brand.inkSoft
    : isPrimary ? brand.onAction
      : variant === 'danger' ? colors.error
        : (isLink || variant === 'secondary') ? brand.burgundy : isGold ? brand.onGold : brand.ink;
  const renderIcon = (IconComponent, strokeWidth) => {
    if (React.isValidElement(IconComponent)) return React.cloneElement(IconComponent, { color: textColor });
    if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent?.$$typeof && IconComponent.render)) {
      return <IconComponent size={19} color={textColor} strokeWidth={strokeWidth} />;
    }
    return IconComponent;
  };
  const content = (
    <View style={[styles.btnInner, compact && styles.btnCompact]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexShrink: 1, gap: 10, opacity: busy ? 0 : 1 }} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'}>
        {IconLeft ? renderIcon(IconLeft, 2) : null}
        <Text variant="bodyMedium" style={[styles.btnText, { color: textColor }, isLink && styles.linkText, textStyle]} numberOfLines={2}>{title}</Text>
        {Icon ? renderIcon(Icon, 2.2) : null}
      </View>
      {busy ? <ActivityIndicator color={textColor} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
  return (
    <PressScale
      {...props}
      onPress={(event) => run(onPress, event)}
      loadingIndicator={false}
      disabled={disabled || busy}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled || busy), busy }}
      scaleTo={0.98}
      style={[
        styles.btn,
        compact && { minHeight: 44 },
        isPrimary && !disabled && styles.btnPrimary,
        (variant === 'secondary' || variant === 'danger') && styles.btnSecondary,
        isLight && styles.btnLight,
        isGold && !disabled && styles.btnGoldShadow,
        isLink && styles.btnLink,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      {isPrimary && !disabled ? (
        <View style={[StyleSheet.absoluteFill, styles.btnClip]} pointerEvents="none">
          <LinearGradient colors={[brand.actionBright, brand.action, brand.actionDeep]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.btnSheen} />
        </View>
      ) : null}
      {isGold && !disabled ? (
        <LinearGradient colors={[brand.goldLight, brand.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.btnClip]} />
      ) : null}
      {content}
    </PressScale>
  );
};

/**
 * Petite action en ligne (« Me prévenir », « Se connecter »…) : pastille compacte, jamais du texte nu.
 */
export const InlineAction = ({ title, onPress, icon: Icon, style, accessibilityLabel, disabled }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<PressScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel || title} hitSlop={6} style={[styles.inline, disabled && styles.btnDisabled, style]}>
    {Icon ? <Icon size={14} color={brand.burgundy} strokeWidth={2.2} /> : null}
    <Text variant="caption" style={styles.inlineText} numberOfLines={1}>{title}</Text>
  </PressScale>);
};

/** Barre de progression animée (hauteur 6, rail `line`). */
export const ProgressBar = ({ value = 0, color: colorProp, track: trackProp, height = 6, style, delay = 0 }) => {
  const { brand } = useTheme();
  const color = colorProp === undefined ? brand.ink : colorProp;
  const track = trackProp === undefined ? brand.line : trackProp;
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const target = Math.max(0, Math.min(1, value));
    progress.value = reduce ? target : withTiming(target, { duration: motion.count + delay, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, delay, progress]);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (progress.value - 1) * width }] }));
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View style={[{ flex: 1, borderRadius: height, backgroundColor: color }, fill]} />
    </View>
  );
};

/** Anneau de progression (Aube or par défaut), animé de 0 à la valeur. */
export const ProgressRing = ({ size: requestedSize = 44, stroke = 4, value = 0, color, track: trackProp, children, gradient = true, duration = 900 }) => {
  const { brand } = useTheme();
  const { fontScale } = useWindowDimensions();
  const size = children ? requestedSize * Math.max(1, fontScale) : requestedSize;
  const track = trackProp === undefined ? brand.line : trackProp;
  const reduce = useReduceMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const id = useRef(`g${Math.random().toString(36).slice(2, 8)}`).current;
  useEffect(() => {
    const target = Math.max(0, Math.min(1, value));
    progress.value = reduce ? target : withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, duration, progress]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.goldLight} />
            <Stop offset="1" stopColor={brand.gold} />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color || (gradient ? `url(#${id})` : brand.gold)}
          strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};

/** Nombre qui défile (A10 « count ») ; chiffres tabulaires pour ne pas « danser ». */
export const AnimatedNumber = ({ value = 0, decimals = 0, suffix = '', format, style, variant = 'h2', duration = motion.count }) => {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) { setShown(value); from.current = value; return undefined; }
    const start = Date.now();
    const origin = from.current;
    let frame;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick); else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce, duration]);
  const text = format ? format(Number(shown.toFixed(decimals))) : shown.toFixed(decimals).replace('.', ',');
  return <Text variant={variant} style={[type.tabular, style]}>{`${text}${suffix}`}</Text>;
};

/** Pastille de statut 24 pt : ○ non commencé · ◐ en cours · ✓ validé · 🔒 verrouillé. */
export const StatusDot = ({ status, size = 24 }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  if (status === 'valide') {
    return <View style={[styles.dot, { width: size, height: size, backgroundColor: colors.successSolid, borderColor: colors.success }]} accessibilityLabel="Validé"><Check size={size * 0.6} color={brand.onInk} strokeWidth={2.2} /></View>;
  }
  if (status === 'verrou') {
    return <View style={[styles.dot, { width: size, height: size, backgroundColor: brand.paperDim, borderColor: brand.paperDim }]} accessibilityLabel="Verrouillé"><Lock size={size * 0.52} color={brand.inkMuted} strokeWidth={2.2} /></View>;
  }
  if (status === 'enCours') {
    return (
      <Svg width={size} height={size} accessibilityLabel="En cours">
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} stroke={brand.ink} strokeWidth={1.5} fill="none" />
        <Path d={`M${size / 2} 1.5 A${size / 2 - 1.5} ${size / 2 - 1.5} 0 0 1 ${size / 2} ${size - 1.5} Z`} fill={brand.ink} />
      </Svg>
    );
  }
  return <View style={[styles.dot, { width: size, height: size, borderColor: brand.lineStrong }]} accessibilityLabel="Non commencé" />;
};

/** Symbole de niveau : ●, ●●, ●●● dans la couleur du niveau. */
export const LevelDots = ({ niveau, size = 7, color }) => {
  const { LEVELS, brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.levelDots} accessibilityLabel={`Niveau ${niveau}`}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={{ width: size, height: size, borderRadius: size, backgroundColor: i <= niveau ? (color || LEVELS[niveau].color) : brand.line }} />
    ))}
  </View>);
};

export const Badge = ({ label, tone = 'neutral', icon: Icon, style }) => {
  const { BADGE, styles } = useStyles();
  const c = BADGE[tone] || BADGE.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      {Icon ? <Icon size={11} color={c.fg} strokeWidth={2.2} /> : null}
      <Text variant="overline" style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
};

/**
 * Coin corné (motif du logo F) : le coin haut-droit de la carte est replié, son revers apparaît en
 * relief, avec une ombre portée sous la pliure. Même géométrie que le revers du symbole F
 * (triangle rectangle à angle intérieur arrondi). `cut` = couleur du fond derrière la carte.
 * - tone : 'gold' (revers or, comme le logo) · 'muted' (élément pas encore disponible) ;
 * - animated : le coin « se plie » à l'apparition (ressort depuis l'angle), sauf mouvement réduit.
 */

let foldSeq = 0;
export const CornerFold = ({ size = 26, radius = 18, cut: cutProp, tone = 'gold', animated = false, delay = 0 }) => {
  const { brand } = useTheme();
  const { FOLD_TONES, styles } = useStyles();
  const cut = cutProp === undefined ? brand.paper : cutProp;
  const id = useRef(`fold${(foldSeq += 1)}`).current;
  const reduce = useReduceMotion();
  const fold = useSharedValue(animated && !reduce ? 0 : 1);
  useEffect(() => {
    if (!animated || reduce) { fold.value = 1; return undefined; }
    const t = setTimeout(() => { fold.value = withSpring(1, { damping: 13, stiffness: 180, mass: 0.8 }); }, 180 + delay);
    return () => clearTimeout(t);
  }, [animated, reduce, delay, fold]);
  const foldStyle = useAnimatedStyle(() => ({ transform: [{ scale: fold.value }], opacity: Math.min(1, fold.value * 1.6) }));
  const [c0, c1, c2] = FOLD_TONES[tone] || FOLD_TONES.gold;
  return (
    <View pointerEvents="none" style={[styles.corner, { borderTopRightRadius: radius }]}>
      <Animated.View style={[{ transformOrigin: 'top right' }, foldStyle]}>
        <Svg width={size + 4} height={size + 4} viewBox="0 0 30 30">
          <Defs>
            <SvgGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c0} />
              <Stop offset="0.45" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </SvgGradient>
            <SvgGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={brand.night} stopOpacity="0.14" />
              <Stop offset="1" stopColor={brand.night} stopOpacity="0" />
            </SvgGradient>
          </Defs>
          {/* Coin disparu : on voit le fond derrière la carte. */}
          <Path d="M4 0H30V26Z" fill={cut} />
          {/* Ombre portée du revers sur la carte. */}
          <Path d="M4 0L30 26L9 30Q3 30 2 25Z" fill={`url(#${id}s)`} />
          {/* Revers replié, angle intérieur arrondi comme sur le symbole F. */}
          <Path d="M4 0L30 26H9.5A5.5 5.5 0 0 1 4 20.5Z" fill={`url(#${id}g)`} />
          <Path d="M4 0L30 26" stroke={brand.onInk} strokeOpacity="0.85" strokeWidth="0.8" />
        </Svg>
      </Animated.View>
    </View>
  );
};

const SUBJECT_ICONS = { feather: Feather, sigma: Sigma, languages: Languages, flask: FlaskConical, landmark: Landmark, book: BookOpen, more: Ellipsis };

/** Pastille de matière : disque teinté + icône (plein) ou fond lavé + icône teintée (`soft`). */
export const SubjectIcon = ({ nom, teinte = 0, size = 40, soft = false, icon }) => {
  const { subjectTint, brand } = useTheme();
  const { styles } = useStyles();
  const t = subjectTint(teinte);
  const Icon = SUBJECT_ICONS[icon || subjectIconName(nom)] || BookOpen;
  return (
    <View style={[styles.subjectIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: soft ? t.wash : (t.solid || t.tint) }]}>
      {!soft ? <View style={[styles.subjectGloss, { borderRadius: size / 2 }]} /> : null}
      <Icon size={size * 0.48} color={soft ? t.tint : brand.onInk} strokeWidth={1.9} />
    </View>
  );
};

/** Contrôle segmenté : pastille bordeaux qui glisse sous l'onglet actif. */
export const Segmented = ({ items, value, onChange, style, tone = 'burgundy' }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const [layouts, setLayouts] = useState({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const reduce = useReduceMotion();
  useEffect(() => {
    const l = layouts[value];
    if (!l) return;
    if (reduce || !w.value) { x.value = l.x; w.value = l.w; return; }
    x.value = withSpring(l.x, motion.sheet); w.value = l.w;
  }, [value, layouts, reduce, x, w]);
  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.segment, style]} accessibilityRole="tablist">
      <Animated.View style={[styles.segmentPill, tone === 'ink' && { backgroundColor: brand.night }, pill]} />
      {items.map((it) => {
        const key = it.key ?? it;
        const label = it.label ?? it;
        const on = key === value;
        return (
          <Pressable
            key={key}
            onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; setLayouts((p) => ({ ...p, [key]: { x: lx, w: width } })); }}
            onPress={() => { if (!on) { haptic.select(); onChange(key); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={styles.segmentItem}
          >
            <Text variant="caption" style={[styles.segmentText, on && { color: brand.onInk }]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/** Trait de pinceau or sous un mot (le geste du correcteur qui souligne). */
export const GoldSwash = ({ width = 140, style, color: colorProp }) => {
  const { brand } = useTheme();
  const color = colorProp === undefined ? brand.gold : colorProp;
  return (<Svg width={width} height={10} viewBox="0 0 140 10" preserveAspectRatio="none" style={style} pointerEvents="none">
    <Path d="M2 7.2C30 3.6 64 2.4 96 3.2C112 3.6 126 4.6 138 6.4" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none" />
    <Path d="M18 8.6C46 6.4 80 5.8 120 7.4" stroke={color} strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  </Svg>);
};

/**
 * Cadre « pile de copies » : chaque écran est une feuille de papier posée sur un fond encre, une
 * seconde feuille dépasse derrière elle. `header` s'affiche sur l'encre, au-dessus de la feuille.
 */
export const PaperStack = ({ children, header, style, sheetStyle, night = true, topGap = 10 }) => {
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  return (
    <View style={[styles.stackRoot, style]}>
      {night ? <NightBackground /> : null}
      <View style={{ paddingTop: insets.top }}>
        {fontScale >= 1.3 ? <ScrollView style={{ maxHeight: Math.max(104, height * 0.22), flexGrow: 0 }} nestedScrollEnabled>{header}</ScrollView> : header}
      </View>
      <View style={[styles.stackBody, { marginTop: topGap + 8 }]}>
        <StudyLamp />
        <View style={styles.stackGhost} pointerEvents="none" />
        <View style={[styles.stackSheet, sheetStyle]}>{children}</View>
      </View>
    </View>
  );
};

/** Fond « Nuit » : dégradé encre, halo inkGlow en haut à droite, trame de points (A9). */
export const NightBackground = ({ style, dots = true }) => {
  const { brand } = useTheme();
  return (<Svg style={[StyleSheet.absoluteFill, style]} viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" pointerEvents="none">
    <Defs>
      <SvgGradient id="night" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={brand.night} />
        <Stop offset="1" stopColor={brand.inkDeep} />
      </SvgGradient>
      <RadialGradient id="halo" cx="78%" cy="22%" r="70%">
        <Stop offset="0" stopColor={brand.inkGlow} stopOpacity="1" />
        <Stop offset="1" stopColor={brand.night} stopOpacity="0" />
      </RadialGradient>
      <Pattern id="trame" width="22" height="22" patternUnits="userSpaceOnUse">
        <Circle cx="2" cy="2" r="1" fill={brand.onInk} fillOpacity="0.07" />
      </Pattern>
    </Defs>
    <Rect width="390" height="844" fill="url(#night)" />
    <Rect width="390" height="844" fill="url(#halo)" />
    {dots ? <Rect width="390" height="844" fill="url(#trame)" /> : null}
  </Svg>);
};

export const Avatar = ({ name = '?', tint = 0, size = 40, ring }) => {
  const { brand, theme } = useTheme();
  const { AVATAR_TINTS } = useStyles();
  const initials = String(name).replace(/[-_\d]+/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <View style={{ width: size + (ring ? 6 : 0), height: size + (ring ? 6 : 0), borderRadius: size, borderWidth: ring ? 2.5 : 0, borderColor: ring || 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: AVATAR_TINTS[tint % AVATAR_TINTS.length], alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyMedium" style={{ color: brand.onInk, fontFamily: theme.fontFamily.bold, fontSize: size * 0.38 }}>{initials}</Text>
      </View>
    </View>
  );
};

/** Tuile de statistique (références E04) : icône teintée, chiffre en Playfair, libellé court. */
export const StatTile = ({ icon: Icon, value, label, tint: tintProp, wash: washProp, style, accessibilityLabel, onPress }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const tint = tintProp === undefined ? brand.burgundy : tintProp;
  const wash = washProp === undefined ? brand.burgundyWash : washProp;
  const Wrap = onPress ? PressScale : View;
  return (
    <Wrap onPress={onPress} accessibilityLabel={accessibilityLabel || `${value} ${label}`} style={[styles.stat, style]}>
      <View style={[styles.statIcon, { backgroundColor: wash }]}><Icon size={17} color={tint} strokeWidth={2} /></View>
      <Text style={[type.numeral, styles.statValue]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text variant="caption" style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </Wrap>
  );
};

/** Titre de section en Playfair, avec une mention à droite (compteur, lien). */
export const SectionTitle = ({ children, right, style }) => {
  const { styles } = useStyles();
  return (<View style={[styles.sectionRow, style]}>
    <Text variant="h2" style={styles.sectionTitle} accessibilityRole="header">{children}</Text>
    {right ? (typeof right === 'string' ? <Text variant="caption" style={styles.sectionRight}>{right}</Text> : right) : null}
  </View>);
};

/** Sur-titre de section (`overline`). */
export const SectionLabel = ({ children, style, color: colorProp }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const color = colorProp === undefined ? brand.inkSoft : colorProp;
  return (<Text variant="overline" style={[styles.section, { color }, style]} accessibilityRole="header">{children}</Text>);
};

/** Carte ivoire standard (rayon 18, filet `line`, ombre douce et diffuse). */
export const Card = ({ children, style }) => {
  const { styles } = useStyles();
  return (<View style={[styles.card, style]}>{children}</View>);
};

/** Entrée d'un bloc : fondu + translation 12 pt (A10 « enter »), échelonnée par `index`. */
export const Enter = ({ index = 0, children, style, delay = 0 }) => {
  const reduce = useReduceMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { v.value = 1; return; }
    const t = setTimeout(() => { v.value = withTiming(1, { duration: motion.enter.duration, easing: motion.enter.easing }); }, delay + Math.min(index, 8) * motion.stagger);
    return () => clearTimeout(t);
  }, [reduce, index, delay, v]);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * motion.enter.offset }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
};

/** Apparition discrète, sans partir d'une échelle nulle. */
export const Pop = ({ children, style, trigger = true }) => {
  const reduce = useReduceMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (trigger) v.value = reduce ? 1 : withSpring(1, motion.snap); }, [trigger, reduce, v]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: reduce ? 1 : 0.95 + v.value * 0.05 }], opacity: Math.min(1, v.value) }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
};

const useStyles = createThemedStyles(({ brand, colors, illustration, subjectPalette, theme }) => {
  const BADGE = {
    gold: { bg: brand.goldWash, fg: brand.goldInk },
    burgundy: { bg: brand.burgundyWash, fg: brand.burgundy },
    success: { bg: colors.successWash, fg: colors.success },
    warning: { bg: colors.warningWash, fg: colors.warning },
    neutral: { bg: brand.paperDim, fg: brand.inkSoft },
    ink: { bg: brand.night, fg: brand.onInk },
    onInk: { bg: 'rgba(255,255,255,0.1)', fg: brand.goldLight },
  };

  const FOLD_TONES = {
    gold: [illustration.foldHighlight, brand.goldLight, brand.gold],
    muted: [illustration.foldMuted, brand.line, brand.lineStrong],
  };

  const AVATAR_TINTS = brand.avatarTints;

  const styles = StyleSheet.create({
    btn: { minHeight: 56, borderRadius: 16, justifyContent: 'center' },
    btnClip: { borderRadius: 16, overflow: 'hidden' },
    btnSheen: { position: 'absolute', left: 1, right: 1, top: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
    btnCompact: { paddingVertical: 10 },
    btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 8 },
    btnPrimary: { backgroundColor: brand.action, ...theme.shadows.button },
    btnSecondary: { minHeight: 52, backgroundColor: brand.sheet, borderWidth: 1.2, borderColor: theme.brand.actionBorderStrong },
    btnLight: { backgroundColor: brand.paper, ...theme.shadows.md },
    btnGoldShadow: { ...theme.shadows.md, shadowColor: brand.gold },
    btnLink: { minHeight: 48, backgroundColor: brand.burgundyWash, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.brand.actionBorderSoft },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 17, backgroundColor: brand.burgundyWash, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.brand.actionBorderSoft },
    inlineText: { flexShrink: 1, textAlign: 'center', color: brand.burgundy, fontFamily: theme.fontFamily.semiBold, fontSize: 13 },
    btnDisabled: { backgroundColor: brand.paperDim, borderColor: brand.line, shadowOpacity: 0, elevation: 0 },
    btnText: { fontSize: 16, fontFamily: theme.fontFamily.semiBold, letterSpacing: -0.1, textAlign: 'center', flexShrink: 1 },
    linkText: { fontSize: 15, fontFamily: theme.fontFamily.semiBold },
    dot: { borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    levelDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 22, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
    badgeText: { fontSize: 10, letterSpacing: 0.6 },
    corner: { position: 'absolute', top: 0, right: 0, overflow: 'hidden' },
    section: { marginBottom: 10, letterSpacing: 1 },
    stat: { flex: 1, minHeight: 112, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, alignItems: 'center', ...theme.shadows.soft },
    statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statValue: { fontSize: 26, lineHeight: 31, color: brand.ink },
    statLabel: { color: brand.inkSoft, textAlign: 'center', marginTop: 2, fontSize: 12, lineHeight: 16 },
    sectionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    sectionTitle: { color: brand.ink, flexShrink: 1 },
    sectionRight: { color: brand.inkSoft },
    card: { backgroundColor: brand.sheet, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
    subjectIcon: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    subjectGloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.10)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    segment: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.sm },
    segmentPill: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 10, backgroundColor: brand.burgundySolid },
    segmentItem: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
    segmentText: { textAlign: 'center', color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold, fontSize: 14 },
    stackRoot: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.inkDeep },
    stackBody: { flex: 1 },
    stackGhost: { position: 'absolute', top: -10, left: 16, right: 16, height: 48, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: theme.brand.ghost, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
    stackSheet: { flex: 1, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', shadowColor: illustration.shadow, shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: -4 } },
  });
  return { BADGE, FOLD_TONES, AVATAR_TINTS, styles };
});
