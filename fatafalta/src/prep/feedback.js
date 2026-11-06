import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Retours haptiques de la préparation (maquettes A11). Les appels échouent silencieusement
 * (web, appareil sans moteur de vibration).
 */
const safe = (promise) => { promise?.catch?.(() => {}); };

export const haptic = {
  select: () => safe(Haptics.selectionAsync()),
  lift: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  // Seuil franchi, fin de session, célébration : succès puis impact moyen 120 ms après.
  celebrate: () => {
    safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), 120);
  },
};

/**
 * « Réduire les animations » du système, suivi en direct (useReducedMotion de Reanimated
 * ne lit le réglage qu'au démarrage).
 */
export const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((value) => { if (mounted) setReduce(Boolean(value)); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => setReduce(Boolean(value)));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduce;
};
