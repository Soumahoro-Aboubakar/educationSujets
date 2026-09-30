import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Text from './Text';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Bouton du parcours étudiant : `primary` (encre pleine) pour l'action principale d'un écran,
 * `secondary` (contour) pour l'alternative. Une seule action primaire par vue.
 */
const ActionButton = ({ title, onPress, variant = 'primary', icon: Icon, loading, disabled, style, accessibilityLabel }) => {
  const primary = variant === 'primary';
  const color = primary ? brand.onInk : brand.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : (
        <>
          {Icon ? <Icon size={18} color={color} strokeWidth={1.9} /> : null}
          <Text variant="bodyMedium" style={[styles.label, { color }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
  },
  primary: {
    backgroundColor: brand.ink,
  },
  primaryPressed: {
    opacity: 0.88,
  },
  secondary: {
    borderWidth: 1,
    borderColor: brand.lineStrong,
  },
  secondaryPressed: {
    backgroundColor: brand.pressed,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
  },
});

export default ActionButton;
