import Pressable from './FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Text from './Text';

/**
 * Ligne de navigation hiérarchique (organisme, parcours, niveau, matière) : chaque élément est
 * une carte encadrée (« copie » distincte), le chevron bordeaux signale « entrer dans ».
 * Les intitulés longs passent sur 3 lignes avec césure équilibrée plutôt que d'être tronqués.
 */
const ListRow = ({ title, meta, onPress, disabled, leading, trailing, accessibilityLabel }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.row}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || [title, meta].filter(Boolean).join(', ')}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: brand.pressed, borderless: false }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {({ pending }) => <>
      {leading || null}
      <View style={styles.content}>
        <Text variant="h3" style={styles.title} numberOfLines={3} textBreakStrategy="balanced" android_hyphenationFrequency="normal">{title}</Text>
        {meta ? <Text variant="caption" style={styles.meta} numberOfLines={2}>{meta}</Text> : null}
      </View>
      {pending ? <View style={styles.chevron}><ActivityIndicator size="small" color={brand.burgundy} /></View> : trailing !== undefined ? trailing : (
        <View style={styles.chevron}><ChevronRight size={16} color={brand.burgundy} strokeWidth={2.2} /></View>
      )}
      </>}
    </Pressable>
  </View>);
};

export default ListRow;

const useStyles = createThemedStyles(({ theme, brand }) => {
  const styles = StyleSheet.create({
    row: {
      paddingHorizontal: theme.layout.gutter,
      paddingBottom: 10,
    },
    card: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingLeft: 16,
      paddingRight: 14,
      borderRadius: 18,
      backgroundColor: brand.sheet,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: brand.line,
      overflow: 'hidden',
      ...theme.shadows.soft,
    },
    pressed: {
      backgroundColor: brand.paperDim,
      transform: [{ scale: 0.985 }],
    },
    chevron: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.burgundyWash,
    },
    content: {
      flex: 1,
    },
    title: {
      color: brand.ink,
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 16,
      lineHeight: 21,
      letterSpacing: -0.2,
    },
    meta: {
      marginTop: 2,
      color: brand.inkSoft,
      fontFamily: theme.fontFamily.regular,
      fontSize: 13,
    },
  });
  return { styles };
});
