import { TouchableOpacity } from './FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { View, TextInput, StyleSheet, } from 'react-native';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';

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
  const { theme } = useTheme();
  const { styles } = useStyles();
  return (
    <View style={[styles.container, style, theme.shadows.md]}>
      <View style={styles.iconContainer}>
        <Search size={20} color={theme.colors.textMuted} />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={placeholder}
        selectionColor={theme.brand.burgundy}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          onPress={onClear}
          style={styles.clearButton}
          hitSlop={theme.hitSlop}
        >
          <X size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.divider} />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Filtres, ${filterCount} actif${filterCount > 1 ? 's' : ''}`}
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

export default SearchInput;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      minHeight: 56,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    iconContainer: {
      paddingHorizontal: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontFamily: theme.fontFamily.medium,
      fontSize: 15,
      color: theme.colors.textPrimary,
      minWidth: 0,
      minHeight: 54,
      paddingVertical: 12,
    },
    clearButton: {
      minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
      padding: theme.spacing.sm,
    },
    divider: {
      width: 1,
      height: 24,
      backgroundColor: theme.colors.border,
      marginHorizontal: 4,
    },
    filterButton: {
      minWidth: 44, minHeight: 44, justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surfaceRaised,
    },
    filterButtonActive: {
      backgroundColor: theme.brand.night,
    },
    badge: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.full,
      minWidth: 18,
      minHeight: 18,
      paddingHorizontal: 4, paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.xs,
    },
    badgeText: {
      fontSize: 10,
      lineHeight: 12,
    },
  });
  return { styles };
});
