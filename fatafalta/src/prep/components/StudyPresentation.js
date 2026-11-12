import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';

import { haptic, useReduceMotion } from '../feedback';

/** État de présentation éphémère uniquement ; aucune écriture dans la progression. */
const stamped = new Set();
const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

export const CopyMargin = ({ color: colorProp, style }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const color = colorProp === undefined ? brand.burgundy : colorProp;
  return (<View pointerEvents="none" accessible={false} style={[styles.margin, style]}>
    <View style={[styles.rule, { backgroundColor: color }]} />
    <View style={[styles.rule, { backgroundColor: color }]} />
  </View>);
};

/** Android/web : région live. VoiceOver : annonce explicite, sans voler le focus. */
export const useResultAnnouncement = (message) => {
  const last = useRef(null);
  useEffect(() => {
    if (!message || last.current === message) return;
    last.current = message;
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
};

export const CorrectorNote = ({ title, children, correct, color, style }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const ink = color || (correct ? colors.success : colors.error);
  return (
    <View style={[styles.note, style]}>
      <CopyMargin color={ink} />
      <View style={styles.noteHead}>
        {correct ? <Check size={21} color={colors.success} strokeWidth={2.2} /> : <X size={20} color={ink} />}
        <Text style={[styles.hand, { color: brand.burgundy }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

/** Le tracé se révèle de gauche à droite, uniquement par transform, sur le thread UI. */
export const CorrectionStrike = () => {
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const initiallyReduced = useReducedMotion();
  const progress = useSharedValue(reduce || initiallyReduced ? 1 : 0);
  useEffect(() => {
    progress.set(reduce || initiallyReduced ? 1 : withTiming(1, { duration: 180, easing: easeOut }));
  }, [reduce, initiallyReduced, progress]);
  const draw = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  return (
    <View pointerEvents="none" accessible={false} style={styles.strikePosition}>
      <Animated.View style={[styles.strike, draw]} />
    </View>
  );
};

/** Une empreinte par événement pendant la vie de l'app ; les visites suivantes restent statiques. */
export const CompletionStamp = ({ label, eventKey, animate = true, feedback = false, onInk = false, style }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const initiallyReduced = useReducedMotion();
  const first = useRef(animate && eventKey != null && !stamped.has(eventKey));
  const scale = useSharedValue(first.current && !reduce && !initiallyReduced ? 1.15 : 1);
  const played = useRef(false);
  useEffect(() => {
    if (reduce || initiallyReduced) scale.set(1);
    if (played.current) return;
    played.current = true;
    if (!first.current) return;
    stamped.add(eventKey);
    if (feedback) haptic.success();
    scale.set(reduce || initiallyReduced ? 1 : withTiming(1, { duration: 220, easing: easeOut }));
  }, [eventKey, feedback, reduce, initiallyReduced, scale]);
  const impression = useAnimatedStyle(() => ({ transform: [{ rotate: '-6deg' }, { scale: scale.get() }] }));
  const ink = onInk ? brand.goldLight : brand.goldInk;
  return (
    <View style={[styles.stampSpace, style]}>
      <Animated.View accessible accessibilityLabel={label} style={[styles.stamp, { borderColor: ink }, impression]}>
        <View style={[styles.stampInner, { borderColor: ink }]}>
          <Text style={[styles.stampText, { color: ink }]}>{label.toLocaleUpperCase('fr')}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

/** Consignes de saisie seulement : la complétude reste décidée par prepCore. */
export const answerPrompt = (type) => ({
  qcm: 'Choisis une réponse', vraiFaux: 'Choisis vrai ou faux',
  entourer: 'Entoure ta réponse', surligner: 'Surligne ta réponse',
  numerique: 'Saisis ta réponse', glisser: 'Complète les espaces',
  ordre: 'Place tous les éléments', classer: 'Classe tous les éléments',
  relier: 'Relie toutes les paires',
}[type] || 'Complète ta réponse');

const useStyles = createThemedStyles(({ theme, colors }) => {
  const styles = StyleSheet.create({
    margin: { position: 'absolute', top: 0, bottom: 0, left: 0, flexDirection: 'row', gap: 3, opacity: 0.55 },
    rule: { width: 1 },
    note: { paddingLeft: 18, paddingVertical: 8, gap: 10 },
    noteHead: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    hand: { flex: 1, fontFamily: theme.fontFamily.serifItalic, fontSize: 20, lineHeight: 28 },
    strikePosition: { position: 'absolute', left: 0, right: 0, top: '50%', transform: [{ rotate: '-2deg' }] },
    strike: { height: 2, borderRadius: 1, backgroundColor: colors.errorSolid, transformOrigin: 'left center' },
    stampSpace: { alignSelf: 'center', maxWidth: '90%', paddingVertical: 18, marginVertical: 8 },
    stamp: { borderWidth: 2, borderRadius: 12, padding: 4 },
    stampInner: { borderWidth: 1, borderRadius: 7, paddingVertical: 12, paddingHorizontal: 18 },
    stampText: { fontFamily: theme.fontFamily.serif, fontSize: 23, lineHeight: 32, letterSpacing: 2, textAlign: 'center' },
  });
  return { styles };
});
