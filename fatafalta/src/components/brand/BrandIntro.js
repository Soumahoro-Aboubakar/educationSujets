import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import Text from '../ui/Text';
import theme from '../../theme/tokens';
import { brand, logo, SPLASH_IMAGE_WIDTH } from '../../theme/brand';

// Taille et position identiques au splash natif (app.json → expo-splash-screen) :
// la première image de l'intro est celle du splash, le relais est invisible.
const SIZE = SPLASH_IMAGE_WIDTH;
const UNIT = SIZE / 100;

// Le coin occupe le carré (63, 18) → (75, 30) ; son centre est le milieu de la charnière.
const CORNER = { left: 63 * UNIT, top: 18 * UNIT, size: 12 * UNIT };
// Revers or vu avant la pliure : reflet du revers final par rapport à la charnière.
const FLAP_BACK = 'M63 18L75 30V20.5A2.5 2.5 0 0 0 72.5 18Z';

const FOLD = { delay: 120, duration: 520 };
const WORDMARK = { delay: 460, duration: 380 };
const EXIT = { delay: 1020, duration: 320 };
const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Relais animé du splash natif, joué une seule fois par lancement à froid.
 *
 * Le splash natif (statique) affiche le F, coin déplié. Dès que cette vue est
 * posée, on masque le splash natif et l'on joue : pliure du coin (le revers or
 * apparaît), apparition du nom, puis fondu vers l'écran d'accueil déjà rendu
 * en dessous. ~1,3 s au total ; un appui l'abrège ; « Réduire les animations »
 * le remplace par un simple fondu.
 */
const BrandIntro = ({ onFinish }) => {
  const reduceMotion = useReducedMotion();
  const fold = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const exit = useSharedValue(0);
  const started = useRef(false);

  const finish = useCallback(() => onFinish?.(), [onFinish]);
  const done = (finished) => {
    'worklet';
    if (finished) scheduleOnRN(finish);
  };

  const start = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hideAsync().catch(() => {});

    if (reduceMotion) {
      exit.value = withDelay(150, withTiming(1, { duration: 220 }, done));
      return;
    }
    fold.value = withDelay(FOLD.delay, withTiming(1, { duration: FOLD.duration, easing: easeInOut }));
    wordmark.value = withDelay(WORDMARK.delay, withTiming(1, { duration: WORDMARK.duration, easing: easeOut }));
    exit.value = withDelay(EXIT.delay, withTiming(1, { duration: EXIT.duration, easing: Easing.out(Easing.quad) }, done));
  };

  // Appui : on passe directement au fondu de sortie.
  const skip = () => {
    if (!started.current || exit.value > 0) return;
    fold.value = withTiming(1, { duration: 120 });
    exit.value = withTiming(1, { duration: 200 }, done);
  };

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + exit.value * 0.06 }],
  }));

  // Rotation de 180° autour de la charnière (axe à 45°) : la face papier
  // s'efface à mi-course, la face or prend le relais.
  const cornerStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 240 },
      { rotateZ: '45deg' },
      { rotateX: `${fold.value * 180}deg` },
      { rotateZ: '-45deg' },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({ opacity: fold.value < 0.5 ? 1 : 0 }));
  const backStyle = useAnimatedStyle(() => ({ opacity: fold.value < 0.5 ? 0 : 1 }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [10, 0]) }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
      onLayout={start}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Pressable style={styles.center} onPress={skip} accessible={false}>
        <Animated.View style={[styles.mark, markStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox={logo.viewBox} style={StyleSheet.absoluteFill}>
            <Path d={logo.body} fill={brand.paper} />
          </Svg>
          <Animated.View style={[styles.corner, cornerStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
              <Svg width={CORNER.size} height={CORNER.size} viewBox="63 18 12 12">
                {/* Liseré de même couleur : pas de couture visible avec le corps du F. */}
                <Path d={logo.corner} fill={brand.paper} stroke={brand.paper} strokeWidth={0.6} />
              </Svg>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
              <Svg width={CORNER.size} height={CORNER.size} viewBox="63 18 12 12">
                <Path d={FLAP_BACK} fill={brand.goldLight} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.wordmark, wordmarkStyle]}>
          <Text variant="h2" style={styles.wordmarkText}>Fatafalta</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 10,
    elevation: 10,
    backgroundColor: brand.ink,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: SIZE,
    height: SIZE,
  },
  corner: {
    position: 'absolute',
    left: CORNER.left,
    top: CORNER.top,
    width: CORNER.size,
    height: CORNER.size,
  },
  // Sous le F, sans déplacer le symbole (qui doit rester calé sur le splash natif).
  wordmark: {
    position: 'absolute',
    top: '50%',
    marginTop: SIZE * 0.32 + theme.spacing.lg,
  },
  wordmarkText: {
    color: brand.paper,
    fontFamily: theme.fontFamily.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.7,
  },
});

export default BrandIntro;
