import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Keyboard, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../components/ui/Text';
import SearchInput from '../components/ui/SearchInput';
import DocumentList from '../components/documents/DocumentList';
import FilterBar from '../components/filters/FilterBar';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import { useDocuments } from '../hooks/useDocuments';
import { useFilterOptions } from '../hooks/useFilterOptions';
import theme from '../theme/tokens';

/**
 * Dedicated Search Screen
 */
const SearchScreen = () => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  
  // Wait for transition to finish before auto-focusing
  const [isReady, setIsReady] = useState(false);
  const searchInputRef = useRef(null);

  // Filter state
  const [filters, setFilters] = useState({ search: '' });
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length;

  // Queries
  const { data: filterOptions = {} } = useFilterOptions();
  
  // Only fetch if there's a search term or an active filter to save bandwidth
  const hasActiveQuery = filters.search.length > 2 || activeFilterCount > 0;
  
  const { data: documentsData, isLoading } = useDocuments(hasActiveQuery ? filters : null);

  useEffect(() => {
    // Slight delay to not freeze the navigation transition
    InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
  }, []);

  // Handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: filters.search });
  };

  const handleRemoveFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const openFilters = () => {
    Keyboard.dismiss();
    bottomSheetRef.current?.expand();
  };
  
  const closeFilters = () => bottomSheetRef.current?.close();

  const handleDocumentPress = (doc) => {
    navigation.navigate('DocumentDetail', { documentId: doc._id, document: doc });
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        onRemoveFilter={handleRemoveFilter}
      />
      {hasActiveQuery && !isLoading && documentsData?.pagination && (
        <View style={styles.resultsHeader}>
          <Text variant="caption" color={theme.colors.textMuted}>
            {documentsData.pagination.total} résultats trouvés
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>Recherche</Text>
        <SearchInput
          value={filters.search}
          onChangeText={(text) => handleFilterChange('search', text)}
          onClear={() => handleFilterChange('search', '')}
          onFilterPress={openFilters}
          filterCount={activeFilterCount}
          placeholder="Cours, examens, mots-clés..."
          style={styles.searchInput}
        />
      </View>

      <View style={styles.content}>
        {!hasActiveQuery ? (
          <View style={styles.emptyPrompt}>
            <Text variant="body" color={theme.colors.textMuted} align="center">
              Tapez au moins 3 caractères ou utilisez les filtres pour lancer une recherche.
            </Text>
          </View>
        ) : (
          <DocumentList
            documents={documentsData?.data || []}
            isLoading={isLoading && hasActiveQuery}
            onDocumentPress={handleDocumentPress}
            ListHeaderComponent={ListHeader}
            emptyStateTitle="Aucun résultat"
            emptyStateDescription="Essayez d'autres mots-clés ou modifiez vos filtres."
          />
        )}
      </View>

      <FilterBottomSheet
        ref={bottomSheetRef}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onApply={closeFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    elevation: 0,
    shadowOpacity: 0,
    backgroundColor: theme.colors.surfaceRaised,
  },
  content: {
    flex: 1,
  },
  listHeader: {
    paddingBottom: theme.spacing.sm,
  },
  resultsHeader: {
    paddingHorizontal: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  emptyPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
});

export default SearchScreen;
