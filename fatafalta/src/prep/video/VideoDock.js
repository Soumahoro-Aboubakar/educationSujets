import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { ChevronUp, Pause, Play } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';

/**
 * Barre « vidéo en cours », collée en haut de la feuille quand la vidéo est sortie de l'écran :
 * on lit le cours en écoutant la vidéo, on la met en pause, ou on y revient d'un geste.
 * Apparition 200 ms ease-out (fondu seul si « Réduire les animations »), disparition 150 ms.
 */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const clock = (s) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const VideoDock = ({ visible, playing, title, durationSec, getCurrentTime, onToggle, onBack, top = 10 }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const [time, setTime] = useState(null);

  // Temps écoulé, relu une fois par seconde (et seulement quand la barre est visible).
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    const read = () => getCurrentTime?.().then((t) => { if (alive) setTime(t); }).catch(() => {});
    read();
    if (!playing) return () => { alive = false; };
    const timer = setInterval(read, 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [visible, playing, getCurrentTime]);

  if (!visible) return null;
  const position = time != null ? `${clock(time)}${durationSec ? ` / ${clock(durationSec)}` : ''}` : null;
  return (
    <Animated.View
      entering={reduce ? FadeIn.duration(150) : FadeInDown.duration(200).easing(EASE_OUT)}
      exiting={FadeOut.duration(150)}
      style={[styles.dock, { top }]}
    >
      <Pressable
        onPress={() => { haptic.select(); onToggle(); }}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Mettre la vidéo en pause' : 'Reprendre la vidéo'}
        hitSlop={4}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        {playing ? <Pause size={18} color={brand.ink} fill={brand.ink} /> : <Play size={18} color={brand.ink} fill={brand.ink} style={{ marginLeft: 2 }} />}
      </Pressable>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Revenir à la vidéo" style={styles.text}>
        <Text variant="caption" style={[styles.state, type.tabular]} numberOfLines={1}>{`${playing ? 'Vidéo en cours' : 'Vidéo en pause'}${position ? ` · ${position}` : ''}`}</Text>
        <Text variant="bodyMedium" style={styles.title} numberOfLines={1}>{title}</Text>
      </Pressable>
      <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Revenir à la vidéo" hitSlop={4} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <ChevronUp size={20} color={brand.onInk} />
      </Pressable>
    </Animated.View>
  );
};

export default VideoDock;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    dock: {
      position: 'absolute', left: 16, right: 16, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingLeft: 10, paddingRight: 8, paddingVertical: 8, borderRadius: 20, backgroundColor: brand.night, ...theme.shadows.lg,
    },
    toggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper },
    text: { flex: 1, justifyContent: 'center', minHeight: 44 },
    state: { color: brand.onInkSoft },
    title: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold },
    back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
    pressed: { transform: [{ scale: 0.96 }] },
  });
  return { styles };
});
