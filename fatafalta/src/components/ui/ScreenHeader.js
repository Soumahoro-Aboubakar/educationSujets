import React from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import Text from './Text';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * En-tête commun aux écrans du parcours étudiant.
 * - `eyebrow` situe l'écran dans le parcours (organisme, chemin…)
 * - `title` dit ce que l'écran propose ; il est animé lorsqu'il change
 *   (navigation interne du catalogue) pour signaler le changement de niveau.
 */
const ScreenHeader = ({ eyebrow, title, subtitle, onBack, right, titleLines = 2, children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
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
            <Text variant="overline" style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
          ) : null}
          <Text variant="h1" style={styles.title} numberOfLines={titleLines} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text variant="body" style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
        {children}
      </View>
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
    backgroundColor: brand.ink,
  },
  inner: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing.xl,
  },
  topBar: {
    height: theme.layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -4,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    letterSpacing: 1,
  },
  title: {
    marginTop: 6,
    color: brand.onInk,
    fontFamily: theme.fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
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
