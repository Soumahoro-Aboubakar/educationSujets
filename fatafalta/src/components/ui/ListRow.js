import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Text from './Text';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Ligne de navigation hiérarchique (organisme, parcours, niveau, matière).
 * Le chevron signale « entrer dans » ; le séparateur est inséré à gauche
 * pour que la surface d'appui couvre toute la largeur.
 */
const ListRow = ({ title, meta, onPress, disabled, trailing, isLast, accessibilityLabel }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel || title}
    disabled={disabled}
    onPress={onPress}
    android_ripple={{ color: brand.pressed }}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <View style={[styles.inner, isLast && styles.innerLast]}>
      <View style={styles.content}>
        <Text variant="h3" style={styles.title} numberOfLines={2}>{title}</Text>
        {meta ? <Text variant="caption" style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      {trailing !== undefined ? trailing : (
        <ChevronRight size={18} color={brand.inkMuted} strokeWidth={2} />
      )}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    paddingLeft: theme.layout.gutter,
  },
  pressed: {
    backgroundColor: brand.pressed,
  },
  inner: {
    minHeight: theme.layout.rowMinHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: 14,
    paddingRight: theme.layout.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  innerLast: {
    borderBottomWidth: 0,
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

export default ListRow;
