import React from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import Text from '../ui/Text';
import theme from '../../theme/tokens';
import { FILTER_DEFINITIONS } from '../../types/constants';

/**
 * Horizontal scrollable bar of active filters
 */
const FilterBar = ({ filters, filterOptions, onRemoveFilter }) => {
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value
  );

  if (activeFilters.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeFilters.map(([key, value]) => {
          const def = FILTER_DEFINITIONS.find((d) => d.key === key);
          if (!def) return null;

          const options = filterOptions[key] || [];
          const opt = options.find((o) => o._id === value);
          const displayValue = opt ? (opt.displayName || opt.name) : '';

          if (!displayValue) return null;

          return (
            <View key={key} style={styles.chip}>
              <Text variant="caption" color={theme.colors.primaryDark} style={styles.chipText}>
                {def.label}: {displayValue}
              </Text>
              <TouchableOpacity
                onPress={() => onRemoveFilter(key)}
                hitSlop={theme.hitSlop}
                style={styles.closeBtn}
              >
                <X size={14} color={theme.colors.primaryDark} />
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary100,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
  },
  chipText: {
    marginRight: theme.spacing.xs,
  },
  closeBtn: {
    backgroundColor: theme.colors.primary200,
    borderRadius: theme.radius.full,
    padding: 2,
  },
});

export default FilterBar;
