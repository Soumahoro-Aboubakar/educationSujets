import React, { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { launch, logo } from '../theme/brand';
import geometry from './launchGeometry';
import Glow from './Glow';
import {
  EXIT, MARK, UNIT, bump, easeInOut, easeInOutSoft, easeOut, easeOutSoft, mix, sample, span, spring,
} from './launchTimeline';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Le coin occupe le carré (63, 18) → (75, 30) du cadre ; son centre est le milieu de la charnière.
const CORNER = { left: 63 * UNIT, top: 18 * UNIT, size: 12 * UNIT };
const CORNER_BOX = '63 18 12 12';
// Revers or vu avant la pliure : reflet du revers final par rapport à la charnière.
const FLAP_BACK = 'M63 18L75 30V20.5A2.5 2.5 0 0 0 72.5 18Z';
const { hinge } = logo;
const HINGE = `M${hinge.x1} ${hinge.y1}L${hinge.x2} ${hinge.y2}`;
const HINGE_LENGTH = Math.hypot(hinge.x2 - hinge.x1, hinge.y2 - hinge.y1);
const GLINT = 6; // longueur du reflet qui court sur la pliure (unités du cadre)

const SPARK = 30;
const FLASH = 120;
const [TRACE_A, TRACE_B] = geometry.traces;
const [MEET_X, MEET_Y] = geometry.meet;
const TRACES = [TRACE_A, TRACE_B];

// Étincelle en tête de trait : suit le contour par transform, sans redessiner le SVG.
const Spark = memo(({ clock, trace, from, to }) => {
  const { xs, ys } = trace;
  const style = useAnimatedStyle(() => {
    const t = clock.get();
    const p = easeInOutSoft(span(t, from, to));
    return {
      opacity: span(t, from, from + 70) * (1 - span(t, to - 60, to + 30)),
      transform: [
        { translateX: sample(xs, p) * UNIT - SPARK / 2 },
        { translateY: sample(ys, p) * UNIT - SPARK / 2 },
      ],
    };
  });
  return (
    <Animated.View style={[styles.light, style]}>
      <Glow size={SPARK} color={launch.paper} peak={0.95} />
    </Animated.View>
  );
});

/**
 * Le F corné, de l'état « éteint » (image exacte du splash natif) à l'état allumé.
 *
 * 1. Deux traits lumineux partent du pied de la lettre et en dessinent le contour.
 * 2. Ils se rejoignent au coin supérieur droit : éclat, la feuille s'allume.
 * 3. Le coin se corne — le geste de l'élève qui marque sa page — et montre son revers or.
 *
 * @param {object} props.clock horloge de l'ouverture (ms)
 * @param {object} props.exit avancement de la sortie (0 → 1)
 * @param {object} props.tracks chronologie active (FULL ou CALM)
 * @param {boolean} props.rich halo du trait, étincelles et éclat (niveau complet)
 */
const LaunchMark = ({ clock, exit, tracks, rich }) => {
  const gradientId = `launchTrace${useId().replace(/:/g, '')}`;
  const { motion, trace, ignite, settle, traceFade, fold, glint, flash } = tracks;
  const [traceFrom, traceTo] = trace;

  const markStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const out = span(exit.get(), EXIT.mark[0], EXIT.mark[1]);
    // Le F se contracte à peine pendant le tracé, puis se pose avec un ressort discret.
    const inhale = motion
      ? easeInOutSoft(span(t, traceFrom, traceTo)) * (1 - spring(span(t, settle[0], settle[1])))
      : 0;
    return {
      opacity: 1 - easeOutSoft(out),
      transform: [{ scale: (1 - 0.035 * inhale) * (1 - (motion ? 0.1 : 0) * easeInOut(out)) }],
    };
  });

  const dormantStyle = useAnimatedStyle(() => ({
    opacity: 1 - easeOutSoft(span(clock.get(), ignite[0] + 30, ignite[1])),
  }));

  const litStyle = useAnimatedStyle(() => ({
    opacity: easeOutSoft(span(clock.get(), ignite[0], ignite[1])),
  }));

  const traceStyle = useAnimatedStyle(() => {
    const t = clock.get();
    return { opacity: span(t, traceFrom, traceFrom + 50) * (1 - easeInOutSoft(span(t, traceFade[0], traceFade[1]))) };
  });

  const dashA = useAnimatedProps(() => ({
    strokeDashoffset: TRACE_A.length * (1 - easeInOutSoft(span(clock.get(), traceFrom, traceTo))),
  }));
  const dashB = useAnimatedProps(() => ({
    strokeDashoffset: TRACE_B.length * (1 - easeInOutSoft(span(clock.get(), traceFrom, traceTo))),
  }));
  const dashes = [dashA, dashB];

  // Rotation de 180° autour de la charnière (axe à 45°) : la face papier s'efface à mi-course,
  // le revers or prend le relais et se rabat sur la barre du F.
  const cornerStyle = useAnimatedStyle(() => {
    const folded = motion ? easeInOut(span(clock.get(), fold[0], fold[1])) : 1;
    return {
      transform: [
        { perspective: 240 },
        { rotateZ: '45deg' },
        { rotateX: `${folded * 180}deg` },
        { rotateZ: '-45deg' },
      ],
    };
  });
  const frontStyle = useAnimatedStyle(() => {
    const folded = motion ? easeInOut(span(clock.get(), fold[0], fold[1])) : 1;
    // La face qui se relève quitte la lumière : elle s'assombrit avant de disparaître.
    return { opacity: folded < 0.5 ? 1 - 0.6 * folded : 0 };
  });
  const backStyle = useAnimatedStyle(() => {
    const folded = motion ? easeInOut(span(clock.get(), fold[0], fold[1])) : 1;
    return { opacity: folded < 0.5 ? 0 : 1 };
  });
  // Ombre portée du revers une fois rabattu : un filet, juste assez pour le relief.
  const shadowStyle = useAnimatedStyle(() => {
    const folded = motion ? easeInOut(span(clock.get(), fold[0], fold[1])) : 1;
    return { opacity: easeOutSoft(span(folded, 0.62, 1)) };
  });

  const glintStyle = useAnimatedStyle(() => ({
    opacity: bump(span(clock.get(), glint[0], glint[1]), 0.3),
  }));
  const glintProps = useAnimatedProps(() => ({
    strokeDashoffset: mix(GLINT, -HINGE_LENGTH, easeInOutSoft(span(clock.get(), glint[0], glint[1]))),
  }));

  const flashStyle = useAnimatedStyle(() => {
    const q = span(clock.get(), flash[0], flash[1]);
    return { opacity: bump(q, 0.22) * 0.85, transform: [{ scale: mix(0.35, 1.2, easeOut(q)) }] };
  });

  return (
    <Animated.View style={[styles.mark, markStyle]}>
      {/* F éteint : la même image que le splash natif, au pixel près. */}
      <Animated.View style={[StyleSheet.absoluteFill, dormantStyle]}>
        <Svg width={MARK} height={MARK} viewBox={logo.viewBox}>
          <Path
            d={logo.bodyUnfolded}
            fill={launch.dormant.color}
            fillOpacity={launch.dormant.fillOpacity}
            stroke={launch.dormant.color}
            strokeOpacity={launch.dormant.strokeOpacity}
            strokeWidth={launch.dormant.strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      {/* F allumé : corps, ombre du revers, coin qui se corne, reflet sur la pliure. */}
      <Animated.View style={[StyleSheet.absoluteFill, litStyle]}>
        <Svg width={MARK} height={MARK} viewBox={logo.viewBox} style={StyleSheet.absoluteFill}>
          <Path d={logo.body} fill={launch.paper} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, shadowStyle]}>
          <Svg width={MARK} height={MARK} viewBox={logo.viewBox}>
            <G transform="translate(-0.8 1)">
              <Path d={logo.flap} fill={launch.depth} fillOpacity={0.28} />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.corner, cornerStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
            <Svg width={CORNER.size} height={CORNER.size} viewBox={CORNER_BOX}>
              {/* Liseré de même couleur : pas de couture visible avec le corps du F. */}
              <Path d={logo.corner} fill={launch.paper} stroke={launch.paper} strokeWidth={0.6} />
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
            <Svg width={CORNER.size} height={CORNER.size} viewBox={CORNER_BOX}>
              <Path d={FLAP_BACK} fill={launch.warm} />
            </Svg>
          </Animated.View>
        </Animated.View>
        {motion ? (
          <Animated.View style={[StyleSheet.absoluteFill, glintStyle]}>
            <Svg width={MARK} height={MARK} viewBox={logo.viewBox}>
              <AnimatedPath
                d={HINGE}
                stroke={launch.paper}
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeDasharray={[GLINT, HINGE_LENGTH + GLINT * 2]}
                animatedProps={glintProps}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Tracé lumineux : froid au pied, chaud au coin — du travail vers la réussite. */}
      {motion ? (
        <Animated.View style={[StyleSheet.absoluteFill, traceStyle]}>
          <Svg width={MARK} height={MARK} viewBox={logo.viewBox}>
            <Defs>
              <LinearGradient id={gradientId} x1="33" y1="82" x2="75" y2="18" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={launch.lightSoft} />
                <Stop offset="0.55" stopColor={launch.paper} />
                <Stop offset="1" stopColor={launch.warm} />
              </LinearGradient>
            </Defs>
            {rich ? TRACES.map((item, index) => (
              <AnimatedPath
                key={`glow${index}`}
                d={item.d}
                fill="none"
                stroke={launch.light}
                strokeOpacity={0.26}
                strokeWidth={5.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={[item.length, item.length]}
                animatedProps={dashes[index]}
              />
            )) : null}
            {TRACES.map((item, index) => (
              <AnimatedPath
                key={`line${index}`}
                d={item.d}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={[item.length, item.length]}
                animatedProps={dashes[index]}
              />
            ))}
          </Svg>
        </Animated.View>
      ) : null}

      {motion && rich ? (
        <>
          <Spark clock={clock} trace={TRACE_A} from={traceFrom} to={traceTo} />
          <Spark clock={clock} trace={TRACE_B} from={traceFrom} to={traceTo} />
          <Animated.View style={[styles.flash, flashStyle]}>
            <Glow size={FLASH} color={launch.warm} peak={0.8} />
          </Animated.View>
        </>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mark: {
    width: MARK,
    height: MARK,
  },
  corner: {
    position: 'absolute',
    left: CORNER.left,
    top: CORNER.top,
    width: CORNER.size,
    height: CORNER.size,
  },
  light: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  flash: {
    position: 'absolute',
    left: MEET_X * UNIT - FLASH / 2,
    top: MEET_Y * UNIT - FLASH / 2,
  },
});

export default memo(LaunchMark);
