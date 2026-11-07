import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Text from '../../components/ui/Text';
import { brand, motion, theme } from '../theme';
import { haptic, useReduceMotion } from '../feedback';

/**
 * Bascule de version d'un cours de langue, dans l'en-tête sur l'encre (écran Module et lecteur de
 * leçon) : « FR » = cours expliqué en français (par défaut), « EN » = cours dans la langue étudiée.
 * Même geste que la barre d'onglets : une pastille ivoire glisse sous la version choisie.
 */
const LANGUES = {
  fr: { court: 'FR', nom: 'Cours expliqué en français' },
  en: { court: 'EN', nom: 'Course in English' },
  es: { court: 'ES', nom: 'Curso en español' },
  de: { court: 'DE', nom: 'Kurs auf Deutsch' },
};
const ITEM = 44; // cible tactile ≥ 44 pt (hauteur 36 + marge tactile verticale)

const LangToggle = ({ value, versions, onChange }) => {
  const reduce = useReduceMotion();
  const index = Math.max(0, versions.indexOf(value));
  const x = useSharedValue(index * ITEM);
  useEffect(() => {
    x.set(reduce ? index * ITEM : withSpring(index * ITEM, motion.sheet));
  }, [index, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Langue du cours">
      <Animated.View style={[styles.pill, pill]} />
      {versions.map((v) => {
        const on = v === value;
        const lang = LANGUES[v] || { court: v.toUpperCase(), nom: v };
        return (
          <Pressable
            key={v}
            onPress={() => { if (!on) { haptic.select(); onChange(v); } }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={lang.nom}
            hitSlop={{ top: 6, bottom: 6 }}
            style={styles.item}
          >
            <Text variant="caption" style={[styles.label, on && styles.labelOn]}>{lang.court}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  pill: { position: 'absolute', top: 3, left: 3, width: ITEM, height: 36, borderRadius: 18, backgroundColor: brand.paper },
  item: { width: ITEM, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: theme.fontFamily.semiBold, letterSpacing: 0.6, color: brand.onInkSoft },
  labelOn: { color: brand.ink },
});

export default LangToggle;
