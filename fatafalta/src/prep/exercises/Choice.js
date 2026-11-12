import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import { Check, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { motion, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { isCorrected, useShuffled } from './kit';
import { PressScale } from '../ui/primitives';
import { CorrectionStrike } from '../components/StudyPresentation';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ═══ QCM (§ 11.8, E20) ═════════════════════════════════════════════════
const QcmOption = ({ option, letter, selected, status, multiple, onPress, disabled }) => {
  const { STATE_COLORS, brand, colors } = useTheme();
  const { styles } = useStyles();
  const { fontScale } = useWindowDimensions();
  const letterSize = Math.max(34, Math.ceil(26 * fontScale));
  const st = status && status !== 'neutre' ? STATE_COLORS[status] : null;
  return (
    <View>
      <PressScale
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={multiple ? 'checkbox' : 'radio'}
        accessibilityState={{ checked: selected, selected }}
        accessibilityLabel={`${letter}. ${option.texte}${status === 'juste' ? ', bonne réponse' : status === 'faux' ? ', réponse fausse' : status === 'oublie' ? ', bonne réponse non choisie' : ''}`}
        style={[
          styles.option,
          selected && !st && styles.optionSelected,
          st && { backgroundColor: brand.sheet, borderColor: brand.line },
        ]}
      >
        <View style={[styles.letter, { width: letterSize, height: letterSize, borderRadius: letterSize / 2 }, multiple && styles.letterSquare, selected && !st && styles.letterSelected, st && { backgroundColor: st.dashed ? 'transparent' : st.border, borderColor: st.border }]}>
          {status === 'juste' || status === 'oublie' ? <Check size={16} color={status === 'oublie' ? colors.success : brand.onInk} strokeWidth={2.2} />
            : status === 'faux' ? <X size={16} color={brand.onInk} strokeWidth={2.2} />
              : <Text variant="bodyMedium" style={[styles.letterText, selected && { color: brand.onInk }]}>{letter}</Text>}
        </View>
        <View style={styles.optionCopy}>
          <Text variant="bodyMedium" style={styles.optionText}>{option.texte}</Text>
          {status === 'faux' ? <CorrectionStrike /> : null}
        </View>
        {status === 'juste' || status === 'oublie' ? (
          <Svg pointerEvents="none" accessible={false} width="100%" height="100%" viewBox="0 0 360 80" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
            <Path d="M343 18 C302 1 63 0 23 13 C-4 22 4 62 28 69 C83 82 306 78 341 65 C365 54 360 25 340 16" stroke={colors.success} strokeWidth={1.5} fill="none" />
          </Svg>
        ) : null}
      </PressScale>
    </View>
  );
};

export const QcmRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { styles } = useStyles();
  const c = exercice.contenu;
  const options = useShuffled(c.options, seed);
  const chosen = value?.ids || [];
  const corrected = isCorrected(phase);
  const toggle = (id) => {
    haptic.select();
    if (!c.multiple) onChange({ ids: [id] });
    else onChange({ ids: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id] });
  };
  return (
    <View style={styles.stack}>
      {c.enonce ? <Text variant="h3" style={styles.enonce}>{c.enonce}</Text> : null}
      {c.multiple ? <Text variant="caption" style={styles.hint}>Plusieurs réponses possibles</Text> : null}
      {options.map((o, i) => (
        <QcmOption
          key={o.id}
          option={o}
          letter={LETTERS[i]}
          multiple={c.multiple}
          selected={chosen.includes(o.id)}
          status={corrected ? correction?.detail?.[o.id] : null}
          disabled={corrected}
          onPress={() => toggle(o.id)}
        />
      ))}
    </View>
  );
};

// ═══ Entourer (§ 11.3, E15) — cercle façon stylo ════════════════════════
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Ellipse « fait main » : légèrement irrégulière, ouverte de 10° en fin de tracé. */
const handDrawnEllipse = (w, h, seedKey) => {
  const rand = core.seededRandom(seedKey);
  const cx = w / 2; const cy = h / 2;
  const rx = w / 2 + 8; const ry = h / 2 + 7;
  const start = -0.35;
  const steps = 26;
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = start + (i / steps) * (Math.PI * 2 + 0.17);
    const wobble = 1 + (rand() - 0.5) * 0.06;
    pts.push([cx + rx * wobble * Math.cos(a), cy + ry * wobble * Math.sin(a)]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const length = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) * 1.08;
  return { d, length };
};

const PenCircle = ({ width, height, visible, color, dashed, seedKey }) => {
  const reduce = useReduceMotion();
  const { d, length } = useMemo(() => handDrawnEllipse(width, height, seedKey), [width, height, seedKey]);
  const v = useSharedValue(visible ? 1 : 0);
  useEffect(() => {
    v.value = reduce ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: motion.draw, easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad) });
  }, [visible, reduce, v]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - v.value) }));
  if (!width) return null;
  return (
    <Svg pointerEvents="none" width={width + 24} height={height + 22} style={{ position: 'absolute', left: -12, top: -11 }}>
      <AnimatedPath
        d={d} transform="translate(12 11)" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round"
        strokeDasharray={dashed ? '5 6' : `${length} ${length}`}
        animatedProps={dashed ? undefined : props}
      />
    </Svg>
  );
};

const CircleWord = ({ el, selected, status, onPress, disabled }) => {
  const { STATE_COLORS, brand } = useTheme();
  const { styles } = useStyles();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const st = status && status !== 'neutre' ? STATE_COLORS[status] : null;
  const color = st ? st.border : brand.burgundy;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${el.texte}${selected ? ', entouré' : ''}${status === 'oublie' ? ', bonne réponse oubliée' : status === 'faux' ? ', mauvaise sélection' : ''}`}
      style={styles.word}
    >
      <View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Text variant="h3" style={[styles.wordText, status === 'faux' && styles.struck]}>{el.texte}</Text>
        <PenCircle width={size.w} height={size.h} visible={selected || status === 'oublie'} color={color} dashed={status === 'oublie'} seedKey={el.id} />
      </View>
    </Pressable>
  );
};

export const EntourerRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { styles } = useStyles();
  const c = exercice.contenu;
  const elements = useShuffled(c.elements, seed);
  const chosen = value?.ids || [];
  const corrected = isCorrected(phase);
  const toggle = (id) => {
    haptic.select();
    onChange({ ids: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id] });
  };
  return (
    <View>
      {c.afficherNombre && c.nombreAttendu ? (
        <Text variant="caption" style={styles.hint}>{`${chosen.length} / ${c.nombreAttendu} entourée${c.nombreAttendu > 1 ? 's' : ''}`}</Text>
      ) : null}
      <View style={styles.cloud}>
        {elements.map((el) => (
          <CircleWord key={el.id} el={el} selected={chosen.includes(el.id)} status={corrected ? correction?.detail?.[el.id] : null} disabled={corrected} onPress={() => toggle(el.id)} />
        ))}
      </View>
    </View>
  );
};

// ═══ Surligner (§ 11.10, E22) — feutre, au geste ou au toucher ═══════════
export const SurlignerRenderer = ({ exercice, value, onChange, phase, correction }) => {
  const { styles } = useStyles();
  const segments = exercice.contenu.segments;
  const chosen = value?.ids || [];
  const corrected = isCorrected(phase);
  const words = useMemo(() => segments.flatMap((s) => s.texte.split(/(?<=\s)/).filter(Boolean).map((w, i) => ({ key: `${s.id}-${i}`, seg: s.id, w }))), [segments]);
  const layouts = useRef({});
  const dragMode = useRef(null);
  const touched = useRef(new Set());
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toggleSeg = (seg) => {
    haptic.select();
    const cur = chosenRef.current;
    onChange({ ids: cur.includes(seg) ? cur.filter((x) => x !== seg) : [...cur, seg] });
  };

  const hit = (x, y) => {
    const found = Object.entries(layouts.current).find(([, l]) => x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h);
    return found ? found[1].seg : null;
  };
  const onDragAt = useRef(null);
  onDragAt.current = (x, y, first) => {
    const seg = hit(x, y);
    if (!seg) return;
    if (first) { dragMode.current = !chosenRef.current.includes(seg); touched.current = new Set(); }
    if (touched.current.has(seg)) return;
    touched.current.add(seg);
    const cur = chosenRef.current;
    const has = cur.includes(seg);
    if (dragMode.current && !has) { haptic.select(); chosenRef.current = [...cur, seg]; onChangeRef.current({ ids: chosenRef.current }); }
    if (!dragMode.current && has) { haptic.select(); chosenRef.current = cur.filter((x2) => x2 !== seg); onChangeRef.current({ ids: chosenRef.current }); }
  };

  const callDrag = useCallback((x, y, first) => onDragAt.current(x, y, first), []);
  const pan = useMemo(() => Gesture.Pan()
    .enabled(!corrected)
    // Activation horizontale : un glisser vertical reste un défilement de l'écran.
    .activeOffsetX([-6, 6])
    .onStart((e) => { scheduleOnRN(callDrag, e.x, e.y, true); })
    .onUpdate((e) => { scheduleOnRN(callDrag, e.x, e.y, false); }), [corrected, callDrag]);

  const segStyle = (seg) => {
    if (corrected) {
      const st = correction?.detail?.[seg];
      if (st === 'juste') return styles.hlJuste;
      if (st === 'faux') return styles.hlFaux;
      if (st === 'oublie') return styles.hlOublie;
      return null;
    }
    return chosen.includes(seg) ? styles.hl : null;
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.paragraph} accessibilityHint="Touche ou glisse sur une phrase pour la surligner">
        {words.map((w) => (
          <Pressable
            key={w.key}
            disabled={corrected}
            onPress={() => toggleSeg(w.seg)}
            onLayout={(e) => { const l = e.nativeEvent.layout; layouts.current[w.key] = { x: l.x, y: l.y, w: l.width, h: l.height, seg: w.seg }; }}
            accessibilityRole="button"
            accessibilityLabel={segments.find((s) => s.id === w.seg)?.texte}
            accessibilityState={{ selected: chosen.includes(w.seg) }}
            style={[styles.hlWord, segStyle(w.seg)]}
          >
            <Text style={[type.reading, styles.readingText, correction?.detail?.[w.seg] === 'faux' && styles.struck]}>{w.w}</Text>
          </Pressable>
        ))}
      </View>
    </GestureDetector>
  );
};

const useStyles = createThemedStyles(({ brand, theme, colors }) => {
  const styles = StyleSheet.create({
    stack: { gap: 10 },
    enonce: { color: brand.ink, marginBottom: 6 },
    hint: { color: brand.inkMuted, marginBottom: 8 },
    option: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet, ...theme.shadows.sm },
    optionSelected: { borderWidth: 1.5, borderColor: brand.burgundy, backgroundColor: brand.burgundyWash },
    letter: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sheet, borderWidth: 1.2, borderColor: brand.lineStrong },
    letterSquare: { borderRadius: 9 },
    letterSelected: { backgroundColor: brand.burgundySolid, borderColor: brand.burgundy },
    letterText: { color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold },
    optionCopy: { flex: 1, paddingVertical: 2 },
    optionText: { color: brand.ink, fontSize: 16, lineHeight: 24 },
    cloud: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 26, paddingVertical: 18, paddingHorizontal: 6 },
    word: { paddingHorizontal: 4, paddingVertical: 2 },
    wordText: { color: brand.ink, textAlign: 'center' },
    struck: { textDecorationLine: 'line-through', textDecorationColor: colors.error },
    paragraph: { flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8 },
    hlWord: { borderRadius: 3, marginVertical: 1 },
    readingText: { color: brand.ink },
    hl: { backgroundColor: theme.brand.highlight },
    hlJuste: { backgroundColor: colors.successWash, borderBottomWidth: 2, borderBottomColor: colors.success },
    hlFaux: { backgroundColor: colors.errorWash },
    hlOublie: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.success },
  });
  return { styles };
});
