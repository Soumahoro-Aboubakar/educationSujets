import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import Text from './Text';
import theme from '../../theme/tokens';

/**
 * Custom Button component
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'accent'} props.variant
 * @param {boolean} props.loading
 * @param {boolean} props.disabled
 * @param {React.ReactNode} props.icon
 */
const Button = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  title,
  onPress,
  style,
  textStyle,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceRaised;
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.surface;
      case 'ghost': return 'transparent';
      case 'accent': return theme.colors.accent; // for CTAs
      default: return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'accent':
        return theme.colors.textInverse;
      case 'secondary':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.textInverse;
    }
  };

  const getBorderColor = () => {
    if (disabled) return theme.colors.border;
    switch (variant) {
      case 'secondary': return theme.colors.border;
      default: return 'transparent';
    }
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      borderWidth: variant === 'secondary' || disabled ? 1 : 0,
    },
    variant === 'primary' && !disabled ? theme.shadows.sm : null,
    variant === 'accent' && !disabled ? theme.shadows.card : null,
    style,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title && (
            <Text
              variant="bodyMedium"
              color={getTextColor()}
              style={[styles.text, textStyle]}
            >
              {title}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;
