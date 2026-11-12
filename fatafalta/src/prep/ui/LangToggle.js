import Pressable from '../../components/ui/FeedbackPressable';
import { createThemedStyles } from '../../theme/ThemeProvider';
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Text from '../../components/ui/Text';
import { motion } from '../theme';
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
const ITEM = 44;

const LangToggle = ({ value, versions, onChange }) => {
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const { fontScale } = useWindowDimensions();
  const itemWidth = Math.max(ITEM, Math.ceil(30 * fontScale));
  const index = Math.max(0, versions.indexOf(value));
  const x = useSharedValue(index * itemWidth);
  useEffect(() => {
    x.set(reduce ? index * itemWidth : withSpring(index * itemWidth, motion.sheet));
  }, [index, itemWidth, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Langue du cours">
      <Animated.View style={[styles.pill, { width: itemWidth }, pill]} />
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
            style={[styles.item, { width: itemWidth }]}
          >
            <Text variant="caption" style={[styles.label, on && styles.labelOn]}>{lang.court}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default LangToggle;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', padding: 3, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
    pill: { position: 'absolute', top: 3, left: 3, width: ITEM, bottom: 3, borderRadius: 18, backgroundColor: brand.paper },
    item: { width: ITEM, minHeight: 44, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: theme.fontFamily.semiBold, letterSpacing: 0.6, color: brand.onInkSoft },
    labelOn: { color: brand.ink },
  });
  return { styles };
});
