import React from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Text from './Text';
import theme from '../../theme/tokens';
import { NightBackground } from '../../prep/ui/primitives';

const { brand } = theme;

/**
 * En-tête commun aux écrans du parcours étudiant.
 * - `eyebrow` situe l'écran dans le parcours (organisme, chemin…)
 * - `title` dit ce que l'écran propose ; il est animé lorsqu'il change
 *   (navigation interne du catalogue) pour signaler le changement de niveau.
 */
const ScreenHeader = ({ eyebrow, eyebrowIcon, title, subtitle, onBack, right, titleLines = 2, children, sheet = true }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NightBackground />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.inner, { paddingTop: insets.top + theme.spacing.xs }]}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour"
              hitSlop={theme.hitSlop}
              onPress={onBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            >
              <ArrowLeft size={20} color={brand.onInk} strokeWidth={2} />
            </Pressable>
          ) : <View style={styles.iconSpacer} />}
          {right || <View style={styles.iconSpacer} />}
        </View>

        <Animated.View key={title} entering={FadeIn.duration(200)} style={styles.copy}>
          {eyebrow ? (
            <View style={styles.eyebrowRow}>
              {eyebrowIcon || null}
              <Text variant="caption" style={[styles.eyebrow, styles.eyebrowText]} numberOfLines={1}>{eyebrow}</Text>
            </View>
          ) : null}
          <Text variant="h1" style={styles.title} numberOfLines={titleLines} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text variant="body" style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
        {children}
      </View>
      {/* Bord de la « pile de copies » : une feuille fantôme dépasse, la feuille papier commence ici. */}
      {sheet ? (
        <View style={styles.sheetEdge} pointerEvents="none">
          <View style={styles.ghost} />
          <View style={styles.cap} />
        </View>
      ) : null}
    </View>
  );
};

export const HeaderIconButton = ({ icon: Icon, label, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={theme.hitSlop}
    onPress={onPress}
    style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
  >
    <Icon size={18} color={brand.onInk} strokeWidth={1.9} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.inkDeep,
    overflow: 'hidden',
  },
  inner: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing.base,
  },
  sheetEdge: {
    height: 34,
  },
  ghost: {
    position: 'absolute',
    top: 4,
    left: 16,
    right: 16,
    height: 40,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: 'rgba(244,240,230,0.34)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cap: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    bottom: -1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: brand.paper,
  },
  topBar: {
    height: theme.layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -4,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconSpacer: {
    width: 40,
  },
  copy: {
    marginTop: theme.spacing.base,
  },
  eyebrow: {
    color: brand.onInkAccent,
    fontFamily: theme.fontFamily.semiBold,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowText: {
    flexShrink: 1,
  },
  title: {
    marginTop: 6,
    color: brand.onInk,
    fontFamily: theme.fontFamily.serif,
    fontVariant: ['lining-nums'],
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    maxWidth: 340,
    marginTop: 6,
    color: brand.onInkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ScreenHeader;
