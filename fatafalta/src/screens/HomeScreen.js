import React, { useState, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Library, Sparkles, ArrowRight } from 'lucide-react-native';
import Text from '../components/ui/Text';
import SearchInput from '../components/ui/SearchInput';
import DocumentList from '../components/documents/DocumentList';
import FilterBar from '../components/filters/FilterBar';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import { useDocuments } from '../hooks/useDocuments';
import { useFilterOptions } from '../hooks/useFilterOptions';
import useDownloadStore from '../store/useDownloadStore';
import theme from '../theme/tokens';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

/**
 * Main Home Screen (Library)
 */
const HomeScreen = () => {
  const navigation = useNavigation();
  const bottomSheetRef = useRef(null);
  const downloads = useDownloadStore((state) => state.downloads);

  const [filters, setFilters] = useState({ search: '' });
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length;
  const downloadCount = Object.keys(downloads || {}).length;

  const { data: filterOptions = {} } = useFilterOptions();
  const { data: documentsData, isLoading, refetch, isRefetching } = useDocuments(filters);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, 100], [240, 132], Extrapolation.CLAMP);
    return { height };
  });

  const headerContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 55], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 55], [0, -16], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ search: filters.search });
  };

  const handleRemoveFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
  };

  const openFilters = () => bottomSheetRef.current?.expand();
  const closeFilters = () => bottomSheetRef.current?.close();

  const handleDocumentPress = (doc) => {
    navigation.navigate('DocumentDetail', { documentId: doc._id, document: doc });
  };

  const handleOpenDownloads = () => {
    navigation.navigate('DownloadsTab');
  };

  const ListHeader = (
    <View style={styles.listHeader}>
      <TouchableOpacity style={styles.libraryCard} onPress={handleOpenDownloads} activeOpacity={0.9}>
        <View style={styles.libraryIconWrap}>
          <Library size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">Ma bibliothèque</Text>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.libraryText}>
            {downloadCount > 0
              ? `${downloadCount} document${downloadCount > 1 ? 's' : ''} prêt${downloadCount > 1 ? 's' : ''} à consulter` 
              : 'Retrouvez ici vos PDFs téléchargés et partagés'}
          </Text>
        </View>
        <ArrowRight size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        onRemoveFilter={handleRemoveFilter}
      />
      <View style={styles.resultsHeader}>
        <Text variant="h3">Récemment ajoutés</Text>
        {!isLoading && documentsData?.pagination && (
          <Text variant="caption" color={theme.colors.textMuted}>
            {documentsData.pagination.total} documents
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.headerContent, headerContentStyle]}>
            <View style={styles.badge}>
              <Text variant="overline" color={theme.colors.textInverse}>Ressources éducatives</Text>
            </View>
            <Text variant="h1" color={theme.colors.textInverse} style={styles.title}>
              Éducation CI
            </Text>
            <Text variant="bodyMedium" color={theme.colors.primary100} style={styles.subtitle}>
              Découvrez les documents utiles, puis gardez-les à portée de main.
            </Text>
          </Animated.View>

          <View style={styles.searchContainer}>
            <SearchInput
              value={filters.search}
              onChangeText={(text) => handleFilterChange('search', text)}
              onClear={() => handleFilterChange('search', '')}
              onFilterPress={openFilters}
              filterCount={activeFilterCount}
              placeholder="Rechercher un cours, sujet..."
            />
          </View>
        </SafeAreaView>
      </Animated.View>

      <DocumentList
        documents={documentsData?.data || []}
        isLoading={isLoading}
        isRefreshing={isRefetching}
        onRefresh={refetch}
        onDocumentPress={handleDocumentPress}
        ListHeaderComponent={ListHeader}
        emptyStateTitle="Aucun document"
        emptyStateDescription="Essayez de modifier vos termes de recherche ou vos filtres."
      />

      <FilterBottomSheet
        ref={bottomSheetRef}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onApply={closeFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: theme.radius['2xl'],
    borderBottomRightRadius: theme.radius['2xl'],
    zIndex: 10,
    elevation: 10,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  blob1: {
    position: 'absolute',
    top: -45,
    right: -15,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    transform: [{ scale: 1.4 }],
  },
  blob2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.32)',
    transform: [{ scale: 1.4 }],
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  headerContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    opacity: 0.95,
    maxWidth: width * 0.8,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  listHeader: {
    paddingBottom: theme.spacing.md,
  },
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  libraryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  libraryText: {
    marginTop: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
});

export default HomeScreen;
