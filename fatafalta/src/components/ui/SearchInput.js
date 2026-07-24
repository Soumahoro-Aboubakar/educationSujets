import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import theme from '../../theme/tokens';
import Text from './Text';

/**
 * Search input with filter button
 * @param {Object} props
 */
const SearchInput = ({
  value,
  onChangeText,
  onClear,
  onFilterPress,
  filterCount = 0,
  placeholder = 'Rechercher...',
  style,
}) => {
  return (
    <View style={[styles.container, style, theme.shadows.md]}>
      <View style={styles.iconContainer}>
        <Search size={20} color={theme.colors.textMuted} />
      </View>
      
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value ? (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={theme.hitSlop}
        >
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.divider} />

      <TouchableOpacity
        onPress={onFilterPress}
        style={[
          styles.filterButton,
          filterCount > 0 && styles.filterButtonActive
        ]}
      >
        <SlidersHorizontal
          size={16}
          color={filterCount > 0 ? theme.colors.textInverse : theme.colors.textSecondary}
        />
        {filterCount > 0 && (
          <View style={styles.badge}>
            <Text variant="caption" color={theme.colors.primary} style={styles.badgeText}>
              {filterCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    height: 56,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.medium,
    fontSize: 15,
    color: theme.colors.textPrimary,
    height: '100%',
  },
  clearButton: {
    padding: theme.spacing.sm,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceRaised,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  badge: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export default SearchInput;
