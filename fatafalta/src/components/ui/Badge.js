import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import theme from '../../theme/tokens';

/**
 * Badge component for displaying tags, statuses, etc.
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.color
 * @param {string} props.backgroundColor
 * @param {React.ReactNode} props.icon
 */
const Badge = ({
  label,
  color = theme.colors.primary,
  backgroundColor = theme.colors.primaryWash,
  icon,
  style,
}) => {
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text variant="caption" style={[styles.label, { color }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: theme.spacing.xs,
  },
  label: {
    lineHeight: 16, // tighter line height for badge
  },
});

export default Badge;
