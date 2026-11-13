import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import theme from '../theme/tokens';
import { brand, launch } from '../theme/brand';
import { LAUNCH_COPY } from './launchState';
import { LAYOUT } from './launchTimeline';

/*
 * Ce que l'écran dit quand le démarrage n'est pas ordinaire.
 *  - Attente longue : une phrase discrète au-dessus du filet de chargement.
 *  - Échec ou blocage : le problème, le geste à faire, et un vrai bouton — jamais une attente sans fin.
 * Les polices de l'application ne sont utilisées que si elles sont chargées (c'est peut-être
 * justement leur chargement qui n'aboutit pas) ; sinon la police du système prend le relais.
 */
const fade = { transitionProperty: 'opacity', transitionDuration: 320, transitionTimingFunction: 'ease-out' };

const LaunchNotice = ({ slow, fault, onRetry, fontsReady, bottom }) => {
  const face = (name) => (fontsReady ? { fontFamily: name } : null);
  const copy = fault ? LAUNCH_COPY[fault] : null;
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.slow, { bottom: bottom + LAYOUT.pulseHeight + 18 }, fade, { opacity: slow && !fault ? 1 : 0 }]}
      >
        <Text style={[styles.slowText, face(theme.fontFamily.medium)]} accessibilityLiveRegion="polite">
          {slow && !fault ? LAUNCH_COPY.slow : ''}
        </Text>
      </Animated.View>

      <Animated.View
        pointerEvents={fault ? 'auto' : 'none'}
        accessibilityRole={fault ? 'alert' : undefined}
        accessibilityLiveRegion={fault ? 'assertive' : 'none'}
        style={[styles.fault, { bottom: bottom - 12 }, fade, { opacity: fault ? 1 : 0 }]}
      >
        {copy ? (
          <>
            <Text style={[styles.title, face(theme.fontFamily.semiBold)]}>{copy.title}</Text>
            <Text style={[styles.body, face(theme.fontFamily.regular)]}>{copy.body}</Text>
            <Pressable
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={LAUNCH_COPY.retry}
              pressRetentionOffset={12}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            >
              <Text style={[styles.buttonText, face(theme.fontFamily.semiBold)]}>{LAUNCH_COPY.retry}</Text>
            </Pressable>
          </>
        ) : null}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  slow: {
    position: 'absolute',
    left: LAYOUT.gutter,
    right: LAYOUT.gutter,
    alignItems: 'center',
  },
  slowText: {
    color: brand.onInkSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  fault: {
    position: 'absolute',
    left: LAYOUT.gutter,
    right: LAYOUT.gutter,
    alignItems: 'center',
  },
  title: {
    color: launch.paper,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  body: {
    color: brand.onInkSoft,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: theme.spacing.sm,
  },
  // Bouton clair sur l'encre : un fond plein, lisible comme un bouton (cible 52 pt).
  button: {
    minHeight: 52,
    minWidth: 200,
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: launch.paper,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: brand.ink,
    fontSize: 16,
    lineHeight: 22,
  },
});

export default memo(LaunchNotice);
