import { useCallback, useRef, useState } from 'react';
import { useAnimatedReaction, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotion } from '../feedback';

/**
 * Suivi du défilement d'un écran qui porte une vidéo en tête : sait si la vidéo est sortie de
 * l'écran (pour la barre « vidéo en cours ») et ramène à la vidéo ou au contenu à lire.
 * Le défilement reste sur le thread UI ; React n'est prévenu qu'au franchissement du seuil.
 * Un écran qui a déjà son propre gestionnaire de défilement (lecteur de leçon) passe sa référence
 * de ScrollView et écrit lui-même la position dans `y` depuis son gestionnaire.
 */
const useVideoScroll = ({ scrollRef: externalRef } = {}) => {
  const reduce = useReduceMotion();
  const ownRef = useRef(null);
  const scrollRef = externalRef || ownRef;
  const y = useSharedValue(0);
  // Seuil : la moitié de l'image vidéo (16:9) est passée sous le haut de l'écran.
  const threshold = useSharedValue(-1);
  const panelTop = useRef(0);
  const anchors = useRef({});
  const [panelOut, setPanelOut] = useState(false);

  const onScroll = useAnimatedScrollHandler((e) => { y.set(e.contentOffset.y); });
  useAnimatedReaction(
    () => threshold.get() > 0 && y.get() > threshold.get(),
    (out, previous) => { if (out !== previous) scheduleOnRN(setPanelOut, out); },
  );

  const onPanelLayout = useCallback((e) => {
    const { y: top, width } = e.nativeEvent.layout;
    panelTop.current = top;
    threshold.set(top + (width * 9) / 16 / 2);
  }, [threshold]);

  /** Mémorise la position d'un repère (« lessons », « epreuves »…) pour y conduire le lecteur. */
  const anchor = useCallback((name) => (e) => { anchors.current[name] = e.nativeEvent.layout.y; }, []);

  const scrollToPanel = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, panelTop.current - 16), animated: !reduce });
  }, [reduce, scrollRef]);
  const scrollToAnchor = useCallback((name) => {
    const target = anchors.current[name];
    if (target != null) scrollRef.current?.scrollTo({ y: Math.max(0, target - 12), animated: !reduce });
  }, [reduce, scrollRef]);

  return { scrollRef, onScroll, y, panelOut, onPanelLayout, anchor, scrollToPanel, scrollToAnchor };
};

export default useVideoScroll;
