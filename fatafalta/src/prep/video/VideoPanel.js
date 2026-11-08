import { getErrorMessage } from '../../utils/userMessages';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowDown, CloudOff, PlayCircle, RotateCcw } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import usePrep from '../store';
import { brand, theme } from '../theme';
import { useReduceMotion } from '../feedback';
import { InlineAction } from '../ui/primitives';
import YoutubeEmbed from './YoutubeEmbed';
import { formatDuree } from './useVideos';

/**
 * Vidéo en tête du contenu à lire : la leçon (à son ouverture) ou la page du concours.
 * - Chargée d'office quand il y a une connexion, sans lecture automatique : on la regarde en
 *   touchant « lecture », ou on fait défiler pour lire la leçon dessous.
 * - Le lecteur YouTube n'est jamais recouvert une fois prêt ; la miniature ne sert qu'au chargement.
 * - Quitter l'écran met la vidéo en pause.
 * Ne pas rendre ce composant sans vidéo : l'écran reste alors exactement comme avant.
 */
const LOAD_TIMEOUT = 20000;
const RATIO = 9 / 16;

const MESSAGES = {
  horsLigne: `${getErrorMessage({ code: 'ERR_NETWORK' }, 'video')} Tu peux poursuivre avec le cours écrit ci-dessous.`,
  indisponible: `${getErrorMessage(null, 'video')} Tu peux poursuivre avec le cours écrit ci-dessous.`,
};

const VideoPanel = forwardRef(({ video, kind = 'lecon', language = 'fr', readLabel, onRead, onLayout, onPlayerChange, style }, ref) => {
  const reduce = useReduceMotion();
  const enLigne = usePrep((s) => s.videosEnLigne);
  const loadVideos = usePrep((s) => s.loadVideos);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const embed = useRef(null);
  const offline = enLigne === false;

  // Vidéo différente (changement de version de langue) : on repart de zéro.
  useEffect(() => { setReady(false); setFailure(null); setPlaying(false); setStarted(false); }, [video.youtubeId]);

  // Le lecteur ne répond pas (réseau lent ou coupé) : état « réessayer » plutôt qu'un chargement sans fin.
  useEffect(() => {
    if (ready || failure || offline || !width) return undefined;
    const timer = setTimeout(() => setFailure('horsLigne'), LOAD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [ready, failure, offline, width, attempt, video.youtubeId]);

  useEffect(() => { onPlayerChange?.({ playing, started }); }, [playing, started]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ouvrir une leçon (ou quitter l'écran) met la vidéo en pause, à l'instant atteint.
  useFocusEffect(useCallback(() => () => setPlaying(false), []));

  useImperativeHandle(ref, () => ({
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    getCurrentTime: () => embed.current?.getCurrentTime?.() ?? Promise.resolve(0),
  }), []);

  const onStateChange = useCallback((state) => {
    if (state === 'playing') { setPlaying(true); setStarted(true); }
    if (state === 'paused' || state === 'ended') setPlaying(false);
  }, []);
  const onError = useCallback((code) => {
    setFailure(code === 'reseau' ? 'horsLigne' : 'indisponible');
    setPlaying(false);
  }, []);
  const retry = () => {
    setFailure(null);
    setReady(false);
    setAttempt((a) => a + 1);
    loadVideos(true);
  };

  const height = Math.round(width * RATIO);
  const showPlayer = width > 0 && !failure && !offline;
  const blocked = Boolean(failure || offline);
  const duree = formatDuree(video.durationSec);
  const label = kind === 'concours' ? 'Présentation' : 'Vidéo';

  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      <View style={styles.frame} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {showPlayer ? (
          <YoutubeEmbed
            key={`${video.youtubeId}-${attempt}`}
            ref={embed}
            videoId={video.youtubeId}
            width={width}
            height={height}
            playing={playing}
            language={language}
            onReady={() => setReady(true)}
            onStateChange={onStateChange}
            onError={onError}
          />
        ) : null}
        {!ready || blocked ? (
          <Animated.View exiting={FadeOut.duration(reduce ? 120 : 220)} style={StyleSheet.absoluteFill} pointerEvents={blocked ? 'auto' : 'none'}>
            <Image source={{ uri: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
            <View style={[StyleSheet.absoluteFill, styles.veil, blocked && styles.veilStrong]} />
            {blocked ? (
              <View style={styles.blocked} accessibilityLiveRegion="polite">
                <CloudOff size={22} color={brand.goldLight} strokeWidth={1.9} />
                <Text variant="caption" style={styles.blockedText}>{MESSAGES[failure || 'horsLigne']}</Text>
                <InlineAction title="Réessayer" icon={RotateCcw} onPress={retry} accessibilityLabel="Réessayer de charger la vidéo" style={styles.retry} />
              </View>
            ) : (
              <View style={styles.loading}><ActivityIndicator color={brand.goldLight} accessibilityLabel="Chargement de la vidéo" /></View>
            )}
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <View style={styles.metaHead}>
          <View style={[styles.row, styles.shrink]}>
            <PlayCircle size={15} color={brand.burgundy} strokeWidth={2.1} />
            <Text variant="caption" style={[styles.kind, styles.shrink]} numberOfLines={1}>{duree ? `${label} · ${duree}` : label}</Text>
          </View>
          {onRead ? <InlineAction title={readLabel || 'Lire le cours'} icon={ArrowDown} onPress={onRead} accessibilityLabel={`${readLabel || 'Lire le cours'} : aller au contenu sous la vidéo`} /> : null}
        </View>
        {video.title ? <Text variant="bodyMedium" style={styles.title} numberOfLines={2}>{video.title}</Text> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: brand.inkDeep },
  veil: { backgroundColor: 'rgba(8,18,36,0.38)' },
  veilStrong: { backgroundColor: 'rgba(8,18,36,0.78)' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  blocked: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 28 },
  blockedText: { color: brand.onInk, textAlign: 'center', maxWidth: 300 },
  retry: { alignSelf: 'center', backgroundColor: brand.sheet },
  meta: { gap: 6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  metaHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 34 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  kind: { color: brand.burgundy, fontFamily: theme.fontFamily.semiBold },
  title: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
});

export default VideoPanel;
