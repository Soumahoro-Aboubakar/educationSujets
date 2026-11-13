import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { launch } from '../theme/brand';
import Glow from './Glow';
import { EXIT, buildParticles, clearOfLockup, easeInOutSoft, easeOut, easeOutSoft, span, sway } from './launchTimeline';

// Une poussière de lumière : position et scintillement déduits des deux horloges, par transform.
const Mote = memo(({ mote, clock, life, exit, quality, tracks, centerX, centerY, reach }) => {
  const { angle, radius, depth, size, opacity, phase, periodX, periodY, drift, delay, warm } = mote;
  const [traceFrom, traceTo] = tracks.trace;
  const [releaseFrom, releaseTo] = tracks.release;
  const appearFrom = tracks.atmosphere[0] + delay;
  // Semis plus haut que large (il épouse l'écran en portrait), tenu à l'écart du symbole et du texte.
  const [baseX, baseY] = clearOfLockup(Math.cos(angle) * radius * reach, Math.sin(angle) * radius * reach * 1.25);

  const style = useAnimatedStyle(() => {
    const t = clock.get();
    const now = life.get();
    // Les poussières se rapprochent du symbole pendant le tracé, puis s'écartent doucement.
    const pull = 1 - 0.16 * easeInOutSoft(span(t, traceFrom, traceTo)) + 0.26 * easeOut(span(t, releaseFrom, releaseTo));
    const seen = easeOutSoft(span(t, appearFrom, appearFrom + 520)) * (1 - span(exit.get(), EXIT.atmosphere[0], EXIT.atmosphere[1]));
    return {
      opacity: seen * quality.get() * opacity * (0.72 + 0.28 * sway(now, periodY, phase + 0.3)),
      transform: [
        { translateX: centerX + baseX * pull + drift * depth * sway(now, periodX, phase) - size / 2 },
        { translateY: centerY + baseY * pull + drift * depth * sway(now, periodY, phase + 0.5) - size / 2 },
      ],
    };
  });

  const color = warm ? launch.warm : launch.paper;
  return (
    <Animated.View style={[styles.mote, style]}>
      <Glow size={size} color={color} peak={1} />
    </Animated.View>
  );
});

/**
 * Poussières de lumière autour du symbole : une dizaine de points diffus sur trois profondeurs,
 * presque immobiles. Elles n'existent qu'au niveau complet.
 */
const LaunchParticles = ({ clock, life, exit, quality, tracks, width, height }) => {
  const motes = useMemo(() => buildParticles(), []);
  const reach = Math.min(width, height);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {motes.map((mote, index) => (
        <Mote
          key={index}
          mote={mote}
          clock={clock}
          life={life}
          exit={exit}
          quality={quality}
          tracks={tracks}
          centerX={width / 2}
          centerY={height / 2}
          reach={reach}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  mote: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default memo(LaunchParticles);
