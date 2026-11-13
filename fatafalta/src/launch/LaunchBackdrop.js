import React, { memo } from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { launch } from '../theme/brand';
import Glow, { tint } from './Glow';
import { EXIT, easeInOut, easeOutSoft, span, sway } from './launchTimeline';

const grain = require('../../assets/launch/grain.png');

// La nuit se referme en haut et surtout en bas : le regard reste sur le symbole.
const DEPTH = [tint(launch.depth, 0.55), tint(launch.depth, 0), tint(launch.depth, 0), tint(launch.depth, 0.92)];
const DEPTH_STOPS = [0, 0.3, 0.56, 1];
/*
 * Grain de papier : casse les bandes des dégradés sombres (visibles sur écran OLED).
 * iOS et web seulement : Android trame déjà ses dégradés, et y répéter une image
 * coûterait un bitmap de la taille de l'écran.
 */
const GRAIN = Platform.OS !== 'android';

/**
 * Décor du lancement, du fond vers l'avant : encre du splash natif, profondeur, deux lumières
 * lointaines qui dérivent lentement (une froide, une chaude), grain.
 *
 * @param {object} props.quality 1 → 0 quand l'appareil peine : les lumières lointaines s'effacent
 * @param {boolean} props.rich lumières lointaines et grain (niveau complet)
 */
const LaunchBackdrop = ({ clock, life, exit, quality, tracks, width, height, rich }) => {
  const [depthFrom, depthTo] = tracks.depth;
  const [airFrom, airTo] = tracks.atmosphere;

  // L'encre est la dernière à s'effacer : c'est elle qui laisse paraître l'accueil.
  const veilStyle = useAnimatedStyle(() => ({
    opacity: 1 - easeInOut(span(exit.get(), EXIT.veil[0], EXIT.veil[1])),
  }));

  const depthStyle = useAnimatedStyle(() => ({
    opacity: easeOutSoft(span(clock.get(), depthFrom, depthTo)) * (1 - span(exit.get(), EXIT.atmosphere[0], EXIT.atmosphere[1])),
  }));

  const coolStyle = useAnimatedStyle(() => {
    const t = life.get();
    const seen = easeOutSoft(span(clock.get(), airFrom, airTo)) * (1 - span(exit.get(), EXIT.atmosphere[0], EXIT.atmosphere[1]));
    return {
      opacity: seen * quality.get() * (0.86 + 0.14 * sway(t, 12, 0)),
      transform: [{ translateX: 16 * sway(t, 20, 0) }, { translateY: 12 * sway(t, 24, 0.25) }],
    };
  });

  const warmStyle = useAnimatedStyle(() => {
    const t = life.get();
    const seen = easeOutSoft(span(clock.get(), airFrom, airTo)) * (1 - span(exit.get(), EXIT.atmosphere[0], EXIT.atmosphere[1]));
    return {
      opacity: seen * quality.get() * (0.8 + 0.2 * sway(t, 15, 0.4)),
      transform: [{ translateX: -14 * sway(t, 24, 0.1) }, { translateY: 10 * sway(t, 20, 0.6) }],
    };
  });

  const cool = Math.min(900, Math.max(480, width * 1.7));
  const warm = Math.min(520, Math.max(300, width * 0.95));

  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, depthStyle]}>
        <LinearGradient colors={DEPTH} locations={DEPTH_STOPS} style={StyleSheet.absoluteFill} />
        {rich && GRAIN ? <Image source={grain} resizeMode="repeat" fadeDuration={0} style={styles.grain} /> : null}
      </Animated.View>
      {rich ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.light, { left: width * 0.16 - cool / 2, top: height * 0.2 - cool / 2 }, coolStyle]}>
            <Glow size={cool} color={launch.light} peak={0.17} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.light, { left: width * 0.84 - warm / 2, top: height * 0.66 - warm / 2 }, warmStyle]}>
            <Glow size={warm} color={launch.warm} peak={0.1} />
          </Animated.View>
        </>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  veil: {
    backgroundColor: launch.base,
  },
  // Taille explicite : sans elle, l'image garde les dimensions de sa tuile (64 pt).
  grain: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  light: {
    position: 'absolute',
  },
});

export default memo(LaunchBackdrop);
