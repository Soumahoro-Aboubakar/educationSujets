import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StatusBar, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { launch } from '../theme/brand';
import Glow from './Glow';
import LaunchBackdrop from './LaunchBackdrop';
import LaunchMark from './LaunchMark';
import LaunchNotice from './LaunchNotice';
import LaunchParticles from './LaunchParticles';
import LaunchPulse from './LaunchPulse';
import LaunchWordmark from './LaunchWordmark';
import { pickLaunchTier } from './launchState';
import {
  CALM, ENGINE, EXIT, FULL, LAYOUT, bump, easeInOut, easeOut, easeOutSoft, mix, span, sway,
} from './launchTimeline';

// Même moteur JavaScript, nouvelle fenêtre (retour après fermeture sans arrêt du processus) :
// redémarrage à chaud, la séquence complète n'est pas rejouée.
let launchedOnce = false;

const RIPPLE = 240;
const fade = { transitionProperty: 'opacity', transitionDuration: 320, transitionTimingFunction: 'ease-out' };

// Temps passé à évaluer le bundle avant le premier rendu : un indice honnête de la vitesse de l'appareil.
const readBootCost = () => {
  const from = globalThis.__BUNDLE_START_TIME__;
  const now = globalThis.nativePerformanceNow?.();
  if (typeof from !== 'number' || typeof now !== 'number') return undefined;
  const cost = now - from;
  return cost >= 0 && cost < 60000 ? cost : undefined;
};

/*
 * Mise au point (développement uniquement) : fige la séquence sur une image précise.
 * Web : ?launchAt=900&launchLife=3&launchExit=0.4&launchFill=0.6&launchTier=lite
 * Natif : globalThis.__FATAFALTA_LAUNCH__ = { at: 900 }
 */
const readDebug = () => {
  if (!__DEV__) return null;
  const preset = globalThis.__FATAFALTA_LAUNCH__;
  if (preset) return preset;
  if (Platform.OS !== 'web' || !globalThis.location?.search) return null;
  const query = new URLSearchParams(globalThis.location.search);
  if (!query.has('launchAt') && !query.has('launchTier')) return null;
  const number = (key) => (query.has(key) ? Number(query.get(key)) : undefined);
  return { at: number('launchAt'), life: number('launchLife'), exit: number('launchExit'), fill: number('launchFill'), tier: query.get('launchTier') || undefined };
};

/**
 * Expérience de lancement de Fatafalta (écran E00) — relais animé du splash natif.
 *
 * Le splash natif montre le F « éteint » sur l'encre. Dès que cette vue est posée, il est masqué
 * (la première image animée est identique) et la séquence joue pendant que l'application se
 * prépare réellement dessous : la lumière s'éveille, deux traits dessinent le F, la feuille
 * s'allume, le coin se corne, le nom et la signature arrivent. Quand l'application est prête
 * (`ready`) et la séquence posée, l'encre se retire et laisse paraître l'accueil.
 *
 * Tout est piloté sur le thread UI par une seule boucle d'images (voir launchTimeline.js) :
 * le montage de l'application ne peut pas faire sauter l'animation. Un appui abrège l'ouverture ;
 * « Réduire les animations » et un redémarrage à chaud la remplacent par des fondus courts.
 *
 * @param {boolean} props.ready l'application peut être montrée
 * @param {number} props.progress progression réelle du démarrage (0 → 1)
 * @param {'error'|'stalled'|null} props.fault démarrage en échec ou bloqué
 * @param {boolean} props.slow attente inhabituellement longue
 * @param {Function} props.onRetry relance l'initialisation
 * @param {Function} props.onFinish la sortie est terminée : retirer cette vue
 * @param {boolean} props.fontsReady les polices de l'application sont chargées
 */
const LaunchExperience = ({ ready, progress, fault, slow, onRetry, onFinish, fontsReady }) => {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [setup] = useState(() => {
    const debug = readDebug();
    const tier = debug?.tier || pickLaunchTier({
      reduceMotion,
      warm: launchedOnce,
      os: Platform.OS,
      osVersion: Platform.Version,
      bootCost: readBootCost(),
      deviceMemory: globalThis.navigator?.deviceMemory,
    });
    return { debug, tier, tracks: tier === 'calm' ? CALM : FULL };
  });
  const { debug, tier, tracks } = setup;
  const rich = tier === 'full';
  const { motion } = tracks;

  const clock = useSharedValue(0); // ms depuis la première image animée
  const life = useSharedValue(0); // s — ambiance (dérives lentes, reflet du filet)
  const exit = useSharedValue(0); // 0 → 1 pendant la sortie
  const fill = useSharedValue(0); // progression affichée, lissée
  const target = useSharedValue(0); // progression réelle
  const go = useSharedValue(0); // 1 : l'application est prête
  const halt = useSharedValue(0); // 1 : échec affiché, on ne sort pas
  const speed = useSharedValue(1);
  const running = useSharedValue(0);
  const phase = useSharedValue(0); // 0 ouverture / attente · 1 sortie · 2 terminé
  const quality = useSharedValue(1);
  const frames = useSharedValue(0);
  const slowFrames = useSharedValue(0);

  const started = useRef(false);
  const startedAt = useRef(0);
  const [leaving, setLeaving] = useState(false);
  const [faultShown, setFaultShown] = useState(false);

  useEffect(() => { target.set(progress); }, [progress, target]);
  useEffect(() => { go.set(ready ? 1 : 0); }, [ready, go]);

  // Un échec ne coupe pas la parole à l'ouverture : il s'affiche une fois le symbole allumé.
  useEffect(() => {
    if (!fault) { setFaultShown(false); halt.set(0); return undefined; }
    halt.set(1);
    const wait = Math.max(0, tracks.gate - (Date.now() - startedAt.current));
    const timer = setTimeout(() => setFaultShown(true), started.current ? wait : tracks.gate);
    return () => clearTimeout(timer);
  }, [fault, halt, tracks.gate]);

  const finish = useCallback(() => onFinish?.(), [onFinish]);
  const leave = useCallback(() => setLeaving(true), []);

  const monitor = rich && Platform.OS !== 'web';
  const ambient = motion;
  const { end, gate, exit: exitDuration } = tracks;

  // Boucle d'images, sur le thread UI : la seule source de mouvement de cet écran.
  useFrameCallback((frame) => {
    if (running.get() === 0) return;
    const raw = frame.timeSincePreviousFrame ?? 16.7;
    // Une image en retard met la séquence en pause au lieu de la faire sauter.
    const dt = raw > ENGINE.maxStep ? ENGINE.maxStep : raw;

    const t = clock.get();
    if (t < end) {
      const next = t + dt * speed.get();
      clock.set(next > end ? end : next);
    }
    if (ambient) life.set((life.get() + dt / 1000) % ENGINE.lifeSpan);

    // Progression réelle, lissée : le filet rejoint sa cible sans à-coup.
    const shown = fill.get();
    const wanted = target.get();
    if (shown !== wanted) {
      const eased = shown + (wanted - shown) * (1 - Math.exp(-dt / ENGINE.progressEase));
      fill.set(Math.abs(wanted - eased) < 0.003 ? wanted : eased);
    }

    // Sortie : dès que l'application est prête et que l'ouverture est posée, jamais avant.
    const stage = phase.get();
    if (stage === 0 && go.get() === 1 && halt.get() === 0 && t >= gate) {
      phase.set(1);
      scheduleOnRN(leave);
    } else if (stage === 1) {
      const out = exit.get() + dt / exitDuration;
      if (out >= 1) {
        exit.set(1);
        phase.set(2);
        scheduleOnRN(finish);
      } else {
        exit.set(out);
      }
    }

    // Budget d'images : si l'appareil peine pendant l'ouverture, l'ambiance s'efface.
    if (monitor) {
      const seen = frames.get();
      if (seen < ENGINE.budgetWindow) {
        frames.set(seen + 1);
        if (raw > ENGINE.slowFrame) {
          const late = slowFrames.get() + 1;
          slowFrames.set(late);
          if (late === ENGINE.slowTolerance) quality.set(withTiming(0, { duration: 360 }));
        }
      }
    }
  }, true);

  // Première mise en page : cette vue recouvre l'écran, le splash natif peut se retirer.
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    startedAt.current = Date.now();
    launchedOnce = true;
    SplashScreen.hide();
    if (debug) {
      // Séquence figée : chaque image se règle à la main (ou depuis la console du navigateur).
      const scrub = (values) => {
        clock.set(values.at ?? 0);
        life.set(values.life ?? 0);
        exit.set(values.exit ?? 0);
        fill.set(values.fill ?? 0);
      };
      scrub(debug);
      globalThis.__FATAFALTA_LAUNCH_SCRUB__ = scrub;
      return;
    }
    running.set(1);
  }, [clock, debug, exit, fill, life, running]);

  // Appui : la fin de l'ouverture défile en accéléré (la sortie attend toujours que l'app soit prête).
  const skip = useCallback(() => { speed.set(ENGINE.skipSpeed); }, [speed]);

  // Le symbole part du centre du splash, puis s'élève quand le nom arrive : l'ensemble finit centré.
  const [liftFrom, liftTo] = tracks.lift;
  const lockupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: motion ? -LAYOUT.lift * easeInOut(span(clock.get(), liftFrom, liftTo)) : 0 }],
  }));

  // Halo derrière le symbole : naît, s'élargit, se diffuse un instant quand la feuille s'allume, puis respire.
  const [haloFrom, haloTo] = tracks.halo;
  const [growFrom, growTo] = tracks.haloGrow;
  const [bloomFrom, bloomTo] = tracks.bloom;
  const haloStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const now = life.get();
    const out = span(exit.get(), EXIT.halo[0], EXIT.halo[1]);
    const bloom = bump(span(t, bloomFrom, bloomTo), 0.24);
    return {
      opacity: easeOutSoft(span(t, haloFrom, haloTo)) * (0.7 + 0.3 * bloom) * (0.95 + 0.05 * sway(now, 6, 0)) * (1 - out),
      transform: [{
        scale: (motion ? mix(0.72, 1, easeOut(span(t, growFrom, growTo))) : 1)
          * (1 + 0.08 * bloom) * (1 + 0.025 * sway(now, 8, 0.2)) * (1 - 0.12 * easeInOut(out)),
      }],
    };
  });

  // Impulsion douce depuis le centre, à l'éveil.
  const [rippleFrom, rippleTo] = tracks.ripple;
  const rippleStyle = useAnimatedStyle(() => {
    const q = span(clock.get(), rippleFrom, rippleTo);
    return { opacity: bump(q, 0.2), transform: [{ scale: mix(0.4, 1.6, easeOut(q)) }] };
  });

  const insets = initialWindowMetrics?.insets;
  const bottom = (insets?.bottom ?? 0) + LAYOUT.pulseBottom;
  const halo = Math.min(640, Math.max(420, width * 1.45)) * (rich ? 1 : 0.8);
  const quiet = Boolean(faultShown);

  return (
    <Animated.View
      onLayout={start}
      pointerEvents={leaving ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.root]}
      // Décor pur tant que tout va bien ; un échec, lui, doit être lu et annoncé.
      accessibilityElementsHidden={!quiet}
      importantForAccessibility={quiet ? 'yes' : 'no-hide-descendants'}
      accessibilityViewIsModal={quiet}
    >
      <StatusBar barStyle="light-content" />
      <LaunchBackdrop clock={clock} life={life} exit={exit} quality={quality} tracks={tracks} width={width} height={height} rich={rich} />
      {rich ? <LaunchParticles clock={clock} life={life} exit={exit} quality={quality} tracks={tracks} width={width} height={height} /> : null}

      <Pressable style={styles.stage} onPress={skip} accessible={false}>
        <Animated.View pointerEvents="none" style={[styles.stage, lockupStyle]}>
          <Animated.View style={[styles.behind, { width: halo, height: halo, marginLeft: -halo / 2, marginTop: -halo / 2 }, haloStyle]}>
            <Glow size={halo} color={launch.light} peak={0.5} />
          </Animated.View>
          {motion ? (
            <Animated.View style={[styles.behind, styles.ripple, rippleStyle]}>
              <Glow size={RIPPLE} color={launch.lightSoft} peak={0.22} ring />
            </Animated.View>
          ) : null}
          <LaunchMark clock={clock} exit={exit} tracks={tracks} rich={rich} />
          <LaunchWordmark clock={clock} exit={exit} tracks={tracks} maxWidth={width - LAYOUT.gutter * 2} quiet={quiet} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade, { opacity: quiet ? 0 : 1 }]}>
          <LaunchPulse clock={clock} life={life} exit={exit} fill={fill} tracks={tracks} bottom={bottom} />
        </Animated.View>
      </Pressable>

      <LaunchNotice slow={slow} fault={faultShown ? fault : null} onRetry={onRetry} fontsReady={fontsReady} bottom={bottom} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    zIndex: 10,
    elevation: 10,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  behind: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  ripple: {
    width: RIPPLE,
    height: RIPPLE,
    marginLeft: -RIPPLE / 2,
    marginTop: -RIPPLE / 2,
  },
});

export default LaunchExperience;
