import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { launch } from '../theme/brand';
import { EXIT, LAYOUT, bump, easeInOutSoft, easeOut, easeOutSoft, mix, span } from './launchTimeline';

const WIDTH = LAYOUT.pulseWidth;
const HEIGHT = LAYOUT.pulseHeight;
const SHINE = 44; // largeur du reflet qui parcourt le filet
const CYCLE = 2.4; // s — un passage du reflet puis un temps de repos
const TRAVEL = 0.55; // part du cycle occupée par le passage

const FILL = [launch.light, launch.lightSoft, launch.warm];
const SHINE_COLORS = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'];
const LEFT = { x: 0, y: 0.5 };
const RIGHT = { x: 1, y: 0.5 };

/**
 * « Learning Pulse » : le filet de chargement de Fatafalta.
 *
 * Un trait fin, de la lumière froide à l'or. Sa longueur suit la progression réelle du démarrage
 * (étapes abouties — jamais un pourcentage inventé) ; un reflet le parcourt tant que l'on attend.
 * Il se révèle par translation de deux calques opposés : aucun recalcul de mise en page.
 *
 * @param {object} props.fill progression lissée (0 → 1)
 * @param {number} props.bottom distance au bas de l'écran (zone sûre comprise)
 */
const LaunchPulse = ({ clock, life, exit, fill, tracks, bottom }) => {
  const { motion } = tracks;
  const [from, to] = tracks.pulse;

  const wrapStyle = useAnimatedStyle(() => {
    const p = span(clock.get(), from, to);
    return {
      opacity: easeOutSoft(p) * (1 - span(exit.get(), EXIT.text[0], EXIT.text[1])),
      transform: [{ scaleX: motion ? mix(0.72, 1, easeOut(p)) : 1 }],
    };
  });

  const revealStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(1 - fill.get()) * WIDTH }],
  }));
  const anchorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - fill.get()) * WIDTH }],
  }));

  const shineStyle = useAnimatedStyle(() => {
    const phase = span((life.get() % CYCLE) / CYCLE, 0, TRAVEL);
    return {
      opacity: bump(phase, 0.3),
      transform: [{ translateX: mix(-SHINE, WIDTH, easeInOutSoft(phase)) }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { bottom }, wrapStyle]}>
      <View style={styles.track}>
        <Animated.View style={[styles.reveal, revealStyle]}>
          <Animated.View style={[styles.anchor, anchorStyle]}>
            <LinearGradient colors={FILL} start={LEFT} end={RIGHT} style={StyleSheet.absoluteFill} />
            {motion ? (
              <Animated.View style={[styles.shine, shineStyle]}>
                <LinearGradient colors={SHINE_COLORS} start={LEFT} end={RIGHT} style={StyleSheet.absoluteFill} />
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Fenêtre arrondie qui glisse vers la droite : son bord est l'extrémité du filet.
  reveal: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    overflow: 'hidden',
  },
  // Contre-translation : le dégradé reste fixe sous la fenêtre.
  anchor: {
    width: WIDTH,
    height: HEIGHT,
  },
  shine: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SHINE,
    height: HEIGHT,
  },
});

export default memo(LaunchPulse);
