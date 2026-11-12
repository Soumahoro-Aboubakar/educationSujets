import Pressable from '../ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { FileText } from 'lucide-react-native';
import Text from '../ui/Text';
import { useReduceMotion } from '../../prep/feedback';
import OrganismeLogo from './OrganismeLogo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Organisme présenté comme une « copie » encadrée, pour la grille du catalogue.
 *
 * Noms longs, traités au cas par cas plutôt que tronqués :
 * - sigle court disponible (≤ 12 caractères, différent du nom) : le sigle devient le titre en
 *   Playfair, le nom complet passe dessous sur 2 lignes ;
 * - sinon le nom complet est le titre, centré, sur 3 lignes au plus, en césure équilibrée, avec un
 *   corps qui diminue par paliers selon la longueur (15 → 14 → 13 pt) ;
 * - le nom complet reste toujours lu en entier par le lecteur d'écran.
 * Le pied (nombre de sujets) est aligné en bas : toutes les cartes d'une rangée ont la même hauteur.
 */
const sizeFor = (length) => (length > 40 ? 13 : length > 24 ? 14 : 15);

const OrganismCard = ({ organisme, meta, onPress, disabled }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const rawName = String(organisme?.name || organisme?.nom || '').trim();
  // Un sigle saisi en minuscules (« inphb ») s'affiche en capitales.
  const name = /^[a-z0-9-]{2,8}$/.test(rawName) ? rawName.toUpperCase() : rawName;
  const abbr = String(organisme?.abbreviation || '').trim();
  const hasSigle = Boolean(abbr) && abbr.length <= 12 && abbr.toLocaleLowerCase() !== name.toLocaleLowerCase();
  // Nom court (sigle ou mot unique) : même traitement typographique qu'un sigle.
  const shortName = !hasSigle && name.length <= 14 && !/\s/.test(name);
  const title = hasSigle ? abbr : name;
  const size = sizeFor(title.length);
  const reduce = useReduceMotion();
  const pressed = useSharedValue(0);
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: reduce ? 1 : 1 - pressed.value * 0.03 }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={[name, hasSigle ? abbr : null, meta].filter(Boolean).join(', ')}
      disabled={disabled}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      onPressIn={() => { pressed.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }); }}
      style={[styles.card, scale]}
    >
      <View style={styles.logoRing}>
        <OrganismeLogo organisme={organisme} size={52} />
      </View>
      <View style={styles.text}>
        {shortName ? (
          <Text style={styles.sigle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{name}</Text>
        ) : hasSigle ? (
          <>
            <Text style={styles.sigle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{abbr}</Text>
            <Text variant="caption" style={styles.fullName} numberOfLines={2} textBreakStrategy="balanced" android_hyphenationFrequency="normal">{name}</Text>
          </>
        ) : (
          <Text
            style={[styles.name, { fontSize: size, lineHeight: Math.round(size * 1.32) }]}
            numberOfLines={3}
            textBreakStrategy="balanced"
            android_hyphenationFrequency="normal"
          >
            {name}
          </Text>
        )}
      </View>
      {meta ? (
        <View style={styles.meta}>
          <FileText size={12} color={brand.burgundy} strokeWidth={2.2} />
          <Text variant="caption" style={styles.metaText} numberOfLines={1}>{meta}</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

export default OrganismCard;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 172,
      alignItems: 'center',
      paddingTop: 18,
      paddingBottom: 14,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: brand.sheet,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: brand.line,
      ...theme.shadows.soft,
    },
    logoRing: {
      padding: 4,
      borderRadius: 20,
      backgroundColor: brand.paper,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: brand.line,
    },
    text: {
      alignSelf: 'stretch',
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 12,
    },
    sigle: {
      color: brand.ink,
      fontFamily: theme.fontFamily.serif,
      fontVariant: ['lining-nums'],
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },
    fullName: {
      marginTop: 3,
      color: brand.inkSoft,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 16,
    },
    name: {
      color: brand.ink,
      fontFamily: theme.fontFamily.semiBold,
      letterSpacing: -0.15,
      textAlign: 'center',
    },
    meta: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minHeight: 26,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 13,
      backgroundColor: brand.burgundyWash,
    },
    metaText: {
      flexShrink: 1,
      textAlign: 'center',
      color: brand.burgundy,
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 12,
    },
  });
  return { styles };
});
