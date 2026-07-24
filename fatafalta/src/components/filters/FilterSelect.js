import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Text from '../ui/Text';
import theme from '../../theme/tokens';

/**
 * Filter select button (opens a modal or action sheet natively)
 */
const FilterSelect = ({
  label,
  value,
  placeholder,
  icon: Icon,
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <Text variant="caption" color={theme.colors.textSecondary} style={styles.label}>
        {label}
      </Text>
      <TouchableOpacity
        style={styles.select}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.left}>
          {Icon && <Icon size={16} color={value ? theme.colors.primary : theme.colors.textMuted} />}
          <Text
            variant="bodyMedium"
            color={value ? theme.colors.textPrimary : theme.colors.textMuted}
            style={styles.value}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
        </View>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  value: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});

export default FilterSelect;
