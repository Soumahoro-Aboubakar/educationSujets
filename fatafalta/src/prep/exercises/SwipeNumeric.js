import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming, FadeInDown } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Check, ChevronDown, Delete, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { motion, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { isCorrected, useShake, useShuffled } from './kit';

// ═══ Vrai / Faux rapide (§ 11.7, E19) ═══════════════════════════════════
const SwipeCard = ({ text, onAnswer, width, depth }) => {
  const { colors } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const latest = useRef(onAnswer);
  latest.current = onAnswer;
  const answer = useCallback((v) => latest.current(v), []);
  const threshold = width * 0.3;

  const fling = (v) => {
    haptic.select();
    x.value = reduce ? (v ? width * 1.4 : -width * 1.4) : withTiming(v ? width * 1.4 : -width * 1.4, { duration: 220, easing: Easing.out(Easing.quad) });
    setTimeout(() => answer(v), reduce ? 0 : 200);
  };
  const latestFling = useRef(fling);
  latestFling.current = fling;
  const callFling = useCallback((v) => latestFling.current(v), []);

  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => { x.value = e.translationX; })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > threshold || Math.abs(e.velocityX) > 900) scheduleOnRN(callFling, e.translationX > 0);
      else x.value = withSpring(0, motion.snap);
    }), [threshold, callFling, x]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${interpolate(x.value, [-width, 0, width], [-12, 0, 12])}deg` }],
    backgroundColor: interpolateColor(x.value, [-threshold, 0, threshold], [colors.errorWash, colors.surface, colors.successWash]),
  }));
  const trueStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, threshold], [0, 1], 'clamp') }));
  const falseStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-threshold, 0], [1, 0], 'clamp') }));

  return (
    <>
      {depth > 1 ? <View style={[styles.tfCard, styles.tfBehind, { transform: [{ scale: 0.9 }, { translateY: 22 }] }]} /> : null}
      {depth > 0 ? <View style={[styles.tfCard, styles.tfBehind, { transform: [{ scale: 0.95 }, { translateY: 11 }] }]} /> : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.tfCard, cardStyle]} accessibilityLabel={text} accessibilityHint="Balaie à droite pour vrai, à gauche pour faux, ou utilise les boutons">
          <Animated.View style={[styles.stamp, styles.stampTrue, trueStamp]}><Text variant="overline" style={[styles.stampText, { color: colors.success }]}>VRAI</Text></Animated.View>
          <Animated.View style={[styles.stamp, styles.stampFalse, falseStamp]}><Text variant="overline" style={[styles.stampText, { color: colors.error }]}>FAUX</Text></Animated.View>
          <Text variant="h2" style={styles.tfText}>{text}</Text>
        </Animated.View>
      </GestureDetector>
      <View style={styles.tfButtons}>
        <Pressable onPress={() => callFling(false)} accessibilityRole="button" accessibilityLabel="Faux" style={[styles.tfBtn, { borderColor: colors.error }]}>
          <X size={26} color={colors.error} strokeWidth={2.2} />
        </Pressable>
        <Pressable onPress={() => callFling(true)} accessibilityRole="button" accessibilityLabel="Vrai" style={[styles.tfBtn, { borderColor: colors.success }]}>
          <Check size={26} color={colors.success} strokeWidth={2.2} />
        </Pressable>
      </View>
    </>
  );
};

export const VraiFauxRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { colors } = useTheme();
  const { styles } = useStyles();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const items = useShuffled(exercice.contenu.affirmations, seed);
  const valeurs = value?.valeurs || {};
  const corrected = isCorrected(phase);
  const remaining = items.filter((a) => typeof valeurs[a.id] !== 'boolean');
  const current = remaining[0];

  if (corrected || !current) {
    return (
      <View style={styles.tfList}>
        {items.map((a, i) => {
          const st = corrected ? correction?.detail?.[a.id] : null;
          const expected = (correction?.cle?.valeurs || exercice.cle?.valeurs || {})[a.id];
          return (
            <Animated.View key={a.id} entering={reduce ? undefined : FadeInDown.delay(i * 40).duration(260)} style={[styles.tfRow, st === 'juste' && styles.tfRowOk, st === 'faux' && styles.tfRowKo]}>
              <View style={styles.tfRowHead}>
                <Text variant="bodyMedium" style={styles.tfRowText}>{a.texte}</Text>
                {!corrected ? (
                  <Pressable onPress={() => { const next = { ...valeurs }; delete next[a.id]; onChange({ valeurs: next }); }} accessibilityRole="button" accessibilityLabel="Changer ma réponse" hitSlop={8} style={styles.tfChange}>
                    <Text variant="caption" style={styles.tfAnswer}>{valeurs[a.id] ? 'Vrai' : 'Faux'}</Text>
                  </Pressable>
                ) : (
                  <Text variant="caption" style={[styles.tfAnswer, { color: st === 'juste' ? colors.success : colors.error }]}>{expected ? 'Vrai' : 'Faux'}</Text>
                )}
              </View>
              {corrected && a.explication ? <Text variant="caption" style={styles.tfExpl}>{a.explication}</Text> : null}
            </Animated.View>
          );
        })}
        {!corrected ? <Text variant="caption" style={styles.tfHint}>Touche une réponse pour la modifier, puis vérifie.</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.tfStage}>
      <Text variant="caption" style={[styles.tfCounter, type.tabular]}>{`${items.length - remaining.length + 1} / ${items.length}`}</Text>
      <View style={styles.tfDeck}>
        <SwipeCard key={current.id} text={current.texte} width={width} depth={remaining.length - 1} onAnswer={(v) => onChange({ valeurs: { ...valeurs, [current.id]: v } })} />
      </View>
    </View>
  );
};

// ═══ Réponse numérique (§ 11.9, E21) ════════════════════════════════════
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '±', '0', ','];

const Digit = ({ char }) => {
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  return (<Animated.Text entering={reduce ? undefined : FadeInDown.duration(120)} style={[type.display, styles.displayDigit]}>{char}</Animated.Text>);
};

export const NumeriqueRenderer = ({ exercice, value, onChange, phase, correction }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const c = exercice.contenu;
  const corrected = isCorrected(phase);
  const raw = value?.valeur ?? '';
  const ok = correction?.correct;
  const shake = useShake(corrected && ok === false);
  const [showCalc, setShowCalc] = useState(false);
  useEffect(() => { if (!corrected) setShowCalc(false); }, [corrected]);

  const press = (k) => {
    haptic.select();
    let next = String(raw);
    if (k === '⌫') next = next.slice(0, -1);
    else if (k === '±') next = next.startsWith('-') ? next.slice(1) : `-${next}`;
    else if (k === ',') { if (!next.includes(',')) next = `${next || '0'},`; } else if (next.replace(/[-,]/g, '').length < 12) next = next === '0' ? k : `${next}${k}`;
    onChange({ valeur: next });
  };

  const color = corrected ? (ok ? colors.success : colors.error) : brand.ink;
  const expected = correction?.cle?.valeur ?? exercice.cle?.valeur;
  const calcul = correction?.cle?.calcul || exercice.cle?.calcul || [];
  const format = (n) => String(Math.round(n * 10000) / 10000).replace('.', ',');

  return (
    <View>
      {c.enonce ? <Text variant="body" style={styles.numEnonce}>{c.enonce}</Text> : null}
      <Animated.View style={[styles.display, corrected && { borderColor: color, backgroundColor: ok ? colors.successWash : colors.errorWash }, shake]} accessibilityLabel={`Ta réponse : ${raw || 'vide'}${c.unite ? ` ${c.unite}` : ''}`}>
        <View style={styles.displayRow}>
          {String(raw || '').split('').map((ch, i) => <Digit key={`${i}-${ch}`} char={ch} />)}
          {!corrected ? <View style={styles.caret} /> : null}
          {!raw ? <Text style={[type.display, styles.displayDigit, { color: brand.lineStrong }]}>0</Text> : null}
        </View>
        {c.unite ? <Text variant="h3" style={styles.unit}>{c.unite}</Text> : null}
      </Animated.View>
      {corrected && !ok ? (
        <View style={styles.solution}>
          <Text variant="bodyMedium" style={{ color: colors.success }}>{`Réponse attendue : ${format(expected)}${c.unite ? ` ${c.unite}` : ''}`}</Text>
          {calcul.length ? (
            <Pressable onPress={() => setShowCalc((s) => !s)} style={styles.calcToggle} accessibilityRole="button">
              <Text variant="bodyMedium" style={styles.calcLink}>{showCalc ? 'Masquer le calcul' : 'Voir le calcul'}</Text>
              <ChevronDown size={16} color={brand.burgundy} style={{ transform: [{ rotate: showCalc ? '180deg' : '0deg' }] }} />
            </Pressable>
          ) : null}
          {showCalc ? calcul.map((step, i) => <Text key={step} variant="body" style={styles.calcStep}>{`${i + 1}. ${step}`}</Text>) : null}
        </View>
      ) : null}
      {!corrected ? (
        <View style={styles.pad}>
          {KEYS.map((k) => (
            <Pressable key={k} onPress={() => press(k)} accessibilityLabel={k === '±' ? 'Changer le signe' : k === ',' ? 'Virgule' : k} style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
              <Text variant="h2" style={styles.keyText}>{k}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => press('⌫')} accessibilityLabel="Effacer" style={({ pressed }) => [styles.key, styles.keyWide, pressed && styles.keyPressed]}>
            <Delete size={22} color={brand.ink} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, colors, theme }) => {
  const styles = StyleSheet.create({
    tfStage: { alignItems: 'center' },
    tfCounter: { color: brand.inkMuted, marginBottom: 12 },
    tfDeck: { width: '100%', alignItems: 'center', minHeight: 380 },
    tfCard: { width: '88%', minHeight: 280, padding: 24, borderRadius: 24, backgroundColor: brand.sheet, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: brand.line, shadowColor: brand.night, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 0 },
    tfBehind: { position: 'absolute', top: 0, backgroundColor: brand.paperDim, shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: brand.line },
    tfText: { color: brand.ink, textAlign: 'center' },
    stamp: { position: 'absolute', top: 22, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderRadius: 6 },
    stampTrue: { left: 22, borderColor: colors.success, transform: [{ rotate: '-12deg' }] },
    stampFalse: { right: 22, borderColor: colors.error, transform: [{ rotate: '12deg' }] },
    stampText: { fontSize: 20, letterSpacing: 2 },
    tfButtons: { flexDirection: 'row', gap: 40, marginTop: 28 },
    tfBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sheet },
    tfList: { gap: 10 },
    tfRow: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet },
    tfRowOk: { borderColor: colors.success, backgroundColor: colors.successWash },
    tfRowKo: { borderColor: colors.error, backgroundColor: colors.errorWash },
    tfRowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tfRowText: { flex: 1, color: brand.ink },
    tfAnswer: { color: brand.burgundy, fontFamily: theme.fontFamily.bold },
    tfChange: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: brand.burgundyWash, alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
    tfExpl: { marginTop: 6, color: brand.inkSoft },
    tfHint: { color: brand.inkMuted, textAlign: 'center', marginTop: 4 },
    numEnonce: { color: brand.ink, marginBottom: 12 },
    display: { minHeight: 86, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 18, borderWidth: 1.5, borderColor: brand.line, backgroundColor: brand.sheet, paddingHorizontal: 16 },
    displayRow: { maxWidth: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    displayDigit: { color: brand.ink },
    caret: { width: 2, height: 36, marginLeft: 2, backgroundColor: brand.burgundySolid },
    unit: { color: brand.inkSoft },
    solution: { marginTop: 12, gap: 6 },
    calcToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
    calcLink: { color: brand.burgundy },
    calcStep: { color: brand.inkSoft },
    pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 18 },
    key: { width: '31.5%', minHeight: 58, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sheet, borderWidth: 1, borderColor: brand.line },
    keyWide: { width: '100%' },
    keyPressed: { backgroundColor: brand.paperDim },
    keyText: { color: brand.ink },
  });
  return { styles };
});
