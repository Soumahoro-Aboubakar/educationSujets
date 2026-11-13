import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { launch } from '../theme/brand';
import geometry from './launchGeometry';
import { EXIT, LAYOUT, easeOut, easeOutSoft, span } from './launchTimeline';

/*
 * Nom et signature dessinés en tracés vectoriels (générés depuis Inter et Playfair Display) :
 * le lancement n'attend aucune police, et le rendu est identique sur toutes les plateformes.
 */
const { wordmark, tagline } = geometry;
const LETTERS = wordmark.glyphs;
const WORD_SCALE = LAYOUT.wordSize / 100;
const WORD_WIDTH = wordmark.width * WORD_SCALE;
const WORD_HEIGHT = (wordmark.bottom - wordmark.top) * WORD_SCALE;
const PAD = 1; // marge autour de chaque lettre : l'anticrénelage n'est jamais rogné
const SPREAD = 5; // écart initial entre deux lettres voisines, résorbé pendant l'entrée
const RISE = 12;

const TAG_SCALE = LAYOUT.tagSize / 100;
const TAG_WIDTH = tagline.width * TAG_SCALE;
const TAG_HEIGHT = (tagline.bottom - tagline.top) * TAG_SCALE;
const TAG_BOX = `0 ${tagline.top} ${tagline.width} ${tagline.bottom - tagline.top}`;

// Une lettre : fondu, montée et resserrement de l'approche — par transform uniquement.
const Letter = memo(({ glyph, index, clock, tracks }) => {
  const from = tracks.word + tracks.letterDelays[index];
  const to = from + tracks.letter;
  const { motion } = tracks;
  const offset = (index - (LETTERS.length - 1) / 2) * SPREAD;
  const width = (glyph.x2 - glyph.x1) * WORD_SCALE + PAD * 2;
  const height = WORD_HEIGHT + PAD * 2;

  const style = useAnimatedStyle(() => {
    const p = span(clock.get(), from, to);
    const rest = 1 - easeOut(p);
    return {
      opacity: easeOutSoft(span(p, 0, 0.6)),
      transform: [{ translateX: motion ? offset * rest : 0 }, { translateY: motion ? RISE * rest : 0 }],
    };
  });

  return (
    <Animated.View style={[styles.letter, { left: (glyph.x + glyph.x1) * WORD_SCALE - PAD, width, height }, style]}>
      <Svg
        width={width}
        height={height}
        viewBox={`${glyph.x1 - PAD / WORD_SCALE} ${wordmark.top - PAD / WORD_SCALE} ${width / WORD_SCALE} ${height / WORD_SCALE}`}
      >
        <Path d={glyph.d} fill={launch.paper} />
      </Svg>
    </Animated.View>
  );
});

/**
 * « Fatafalta » puis « Apprendre. Progresser. Réussir. », sous le symbole.
 * @param {number} props.maxWidth largeur disponible (la signature se réduit sur un écran étroit)
 * @param {boolean} props.quiet un message d'échec prend la place de la signature
 */
const LaunchWordmark = ({ clock, exit, tracks, maxWidth, quiet }) => {
  const fit = Math.min(1, maxWidth / TAG_WIDTH);
  const { motion } = tracks;
  const [tagFrom, tagTo] = tracks.tagline;

  const wordStyle = useAnimatedStyle(() => ({
    opacity: 1 - span(exit.get(), EXIT.text[0], EXIT.text[1]),
  }));

  const taglineStyle = useAnimatedStyle(() => {
    const p = span(clock.get(), tagFrom, tagTo);
    return {
      opacity: easeOutSoft(p) * (1 - span(exit.get(), EXIT.text[0], EXIT.text[1])),
      transform: [{ translateY: motion ? 6 * (1 - easeOut(p)) : 0 }],
    };
  });

  return (
    <>
      <Animated.View style={[styles.word, wordStyle]}>
        <View style={styles.wordBox}>
          {LETTERS.map((glyph, index) => (
            <Letter key={index} glyph={glyph} index={index} clock={clock} tracks={tracks} />
          ))}
        </View>
      </Animated.View>
      <Animated.View style={[styles.tagline, { marginTop: LAYOUT.tagBaseline + tagline.top * TAG_SCALE * fit }, taglineStyle]}>
        <Animated.View style={[styles.fade, { opacity: quiet ? 0 : 1 }]}>
          <Svg width={TAG_WIDTH * fit} height={TAG_HEIGHT * fit} viewBox={TAG_BOX}>
            <Path d={tagline.plain} fill={launch.paper} fillOpacity={0.72} />
            <Path d={tagline.accent} fill={launch.warm} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  // Sous le F, sans déplacer le symbole (qui reste calé sur le splash natif).
  word: {
    position: 'absolute',
    top: '50%',
    marginTop: LAYOUT.wordTop,
  },
  wordBox: {
    width: WORD_WIDTH,
    height: WORD_HEIGHT,
  },
  letter: {
    position: 'absolute',
    top: -PAD,
  },
  tagline: {
    position: 'absolute',
    top: '50%',
  },
  fade: {
    transitionProperty: 'opacity',
    transitionDuration: 320,
    transitionTimingFunction: 'ease-out',
  },
});

export default memo(LaunchWordmark);
