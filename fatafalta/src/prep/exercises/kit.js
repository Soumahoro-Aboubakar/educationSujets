import { useEffect, useMemo } from 'react';
import { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import core from '../shared/prepCore';
import { brand, colors } from '../theme';

/**
 * Contrat commun des Renderers (§ 11.1) :
 *   <Renderer exercice value onChange phase correction seed compact />
 *   - phase : 'answer' (vierge / en cours / complet) | 'corrected' (après Vérifier) | 'readonly'
 *   - correction : { correct, detail, cle } quand la question est corrigée, sinon null
 *   - seed : graine du mélange (stable à la reprise, nouvelle à la seconde chance)
 * Chaque Renderer propose le geste ET une alternative « toucher puis toucher » (§ 11.11).
 */

export const STATE_COLORS = {
  juste: { bg: colors.successWash, border: colors.success, fg: colors.success },
  faux: { bg: colors.errorWash, border: colors.error, fg: colors.error },
  oublie: { bg: 'transparent', border: colors.success, fg: colors.success, dashed: true },
  neutre: { bg: brand.sheet, border: brand.line, fg: brand.ink },
};

/** Ordre mélangé déterministe d'une liste d'objets { id }. */
export const useShuffled = (items, seed, enabled = true) => useMemo(
  () => (enabled ? core.seededShuffle(items || [], seed) : (items || [])),
  [items, seed, enabled],
);

/** Secousse horizontale (3 oscillations, 300 ms) déclenchée quand `trigger` passe à vrai. */
export const useShake = (trigger) => {
  const x = useSharedValue(0);
  useEffect(() => {
    if (!trigger) return;
    x.value = withSequence(
      withTiming(-7, { duration: 50 }), withTiming(7, { duration: 50 }),
      withTiming(-5, { duration: 50 }), withTiming(5, { duration: 50 }),
      withTiming(-2, { duration: 50 }), withTiming(0, { duration: 50 }),
    );
  }, [trigger, x]);
  return useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
};

export const isCorrected = (phase) => phase === 'corrected' || phase === 'readonly';
