import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { ArrowRight, CheckCircle2, ChevronRight, Lock, PlayCircle, RotateCcw } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { ordinal } from '../../utils/ordinal';
import { useReduceMotion } from '../feedback';
import { motion, type } from '../theme';
import { PressScale } from '../ui/primitives';

/** Affordance commune aux lignes, sans ajouter une carte autour du contenu. */
export const HomeChevron = ({ expanded }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const initiallyReduced = useReducedMotion();
  const angle = expanded === undefined ? 0 : expanded ? -90 : 90;
  const rotation = useSharedValue(angle);
  useEffect(() => {
    rotation.set(reduce || initiallyReduced ? angle : withTiming(angle, { duration: 180 }));
  }, [angle, reduce, initiallyReduced, rotation]);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return (
    <View style={styles.chevron} accessible={false}>
      <Animated.View style={turn}>
        <ChevronRight size={16} color={brand.burgundy} strokeWidth={2} />
      </Animated.View>
    </View>
  );
};

export const HomeVideoBadge = () => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.videoBadge}>
    <PlayCircle size={12} color={brand.onInk} />
    <Text variant="caption" style={styles.videoText}>Vidéo</Text>
  </View>);
};

/** Seule entrée spatiale de l'accueil : la copie se pose sur la pile. */
export const DailyCopy = ({ title, context, annotation, action, actionLabel, onPress, locked, started, reviews, onReviews }) => {
  const { brand, colors } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const initiallyReduced = useReducedMotion();
  const y = useSharedValue(initiallyReduced ? 0 : motion.enter.offset);
  const opacity = useSharedValue(0);
  useEffect(() => {
    y.set(reduce ? 0 : withSpring(0, { duration: motion.enter.duration, dampingRatio: 1 }));
    opacity.set(withTiming(1, { duration: reduce ? 150 : motion.enter.duration, easing: motion.enter.easing }));
  }, [reduce, y, opacity]);
  const entrance = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: reduce ? 0 : y.get() }] }));
  return (
    <Animated.View style={[styles.copyWrap, entrance]}>
      <View style={styles.paperStack}>
        <View style={styles.underSheet} pointerEvents="none" />
        <View style={styles.copy}>
          <View style={styles.margin} pointerEvents="none" />
          <View style={[styles.margin, styles.marginSecond]} pointerEvents="none" />
          <View style={styles.annotationRow}>
            {locked ? <Lock size={15} color={brand.burgundy} /> : null}
            <Text variant="caption" style={styles.annotation}>{annotation}</Text>
          </View>
          <Text variant="h2" style={styles.copyTitle}>{title}</Text>
          <Text variant="caption" style={styles.context}>{context}</Text>
          {onPress ? (
            <PressScale hapticOnPress onPress={onPress} accessibilityLabel={actionLabel || action} style={styles.primary}>
              <Text variant="bodyMedium" style={styles.primaryText}>{action}</Text>
              <ArrowRight size={20} color={brand.onAction} />
            </PressScale>
          ) : null}
          {started ? reviews.total ? (
            <PressScale hapticOnPress onPress={onReviews} style={styles.review}
              accessibilityLabel={`${reviews.total} questions à revoir, ${reviews.erreurs} erreurs et ${reviews.revisionsDues} révisions programmées`}>
              <RotateCcw size={16} color={brand.burgundy} />
              <Text variant="caption" style={styles.reviewText}>{`${reviews.total} question${reviews.total > 1 ? 's' : ''} à revoir`}</Text>
              <HomeChevron />
            </PressScale>
          ) : (
            <View style={styles.review}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text variant="caption" style={styles.context}>Révisions à jour</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

export const HomeScoreboard = ({ summary, rank, online, onPress }) => {
  const { styles } = useStyles();
  const { fontScale, width } = useWindowDimensions();
  // À grande taille de texte, le tableau se replie sans tronquer ses quatre valeurs.
  const wrap = fontScale >= 1.3 || width < 350;
  const stats = [
    { value: `${Math.round(summary.pourcentage * 100)} %`, label: 'progression' },
    { value: `${summary.serie}`, label: `jour${summary.serie > 1 ? 's' : ''} de série` },
    { value: rank?.rang ? ordinal(rank.rang) : '—', label: rank?.total ? `sur ${rank.total}` : online === false ? 'hors ligne' : 'classement' },
    { value: `${Math.round((summary.stats.reussite || 0) * 100)} %`, label: 'réussite' },
  ];
  return (
    <PressScale hapticOnPress onPress={onPress} style={styles.board}
      accessibilityLabel={`Mon bilan. ${stats.map((s) => `${s.value} ${s.label}`).join(', ')}. ${summary.modulesValides} modules validés sur ${summary.modulesTotal}`}>
      <View style={styles.stats}>
        {stats.map((stat, i) => (
          <View key={stat.label} style={[styles.stat, wrap && styles.statWrapped, i > 0 && !(wrap && i === 2) && styles.statDivider]}>
            <Text style={[type.numeral, styles.value]}>{stat.value}</Text>
            <Text variant="caption" style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.boardLink}>
        <Text variant="caption" style={styles.reviewText}>Mon bilan</Text>
        <HomeChevron />
      </View>
    </PressScale>
  );
};

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.burgundyWash, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    videoBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: brand.night },
    videoText: { color: brand.onInk, fontSize: 12, lineHeight: 16 },
    copyWrap: { marginBottom: 8 },
    paperStack: { marginBottom: 5 },
    underSheet: { position: 'absolute', top: 10, bottom: -5, left: 7, right: 7, backgroundColor: brand.paperDim, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong },
    copy: { backgroundColor: brand.sheet, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, paddingLeft: 32, paddingRight: 18, paddingTop: 20, paddingBottom: 12 },
    margin: { position: 'absolute', left: 16, top: 18, bottom: 18, width: 1, backgroundColor: brand.burgundy, opacity: 0.55 },
    marginSecond: { left: 20 },
    annotationRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
    annotation: { flex: 1, color: brand.burgundy, fontFamily: theme.fontFamily.serifItalic, fontSize: 15, lineHeight: 21, fontVariant: ['lining-nums'] },
    copyTitle: { color: brand.ink, fontSize: 25, lineHeight: 32, marginBottom: 8 },
    context: { color: brand.inkSoft, flexShrink: 1 },
    primary: { marginTop: 20, marginBottom: 4, minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: brand.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    primaryText: { color: brand.onAction, flexShrink: 1, textAlign: 'center', fontSize: 16 },
    review: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 8 },
    reviewText: { color: brand.burgundy, fontFamily: theme.fontFamily.semiBold, flexShrink: 1 },
    board: { paddingTop: 18, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
    stat: { flex: 1, alignItems: 'center', paddingHorizontal: 5, gap: 4 },
    statWrapped: { flexBasis: '50%', flexGrow: 0 },
    statDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: brand.line },
    value: { color: brand.ink, fontSize: 24, lineHeight: 32, textAlign: 'center' },
    statLabel: { color: brand.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center' },
    boardLink: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 10 },
  });
  return { styles };
});
