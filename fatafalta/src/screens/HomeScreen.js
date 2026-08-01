import React, { useState, useRef } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Library, ArrowRight, Menu } from 'lucide-react-native';
import Text from '../components/ui/Text';
import SearchInput from '../components/ui/SearchInput';
import DocumentList from '../components/documents/DocumentList';
import FilterBar from '../components/filters/FilterBar';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import AuthContext from '../context/AuthContext';
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
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef(null);
  const downloads = useDownloadStore((state) => state.downloads);
  const { isAuthenticated } = React.useContext(AuthContext);

  const [filters, setFilters] = useState({ search: '' });
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length;
  const downloadCount = Object.keys(downloads || {}).length;

  const { data: filterOptions = {} } = useFilterOptions();
  const { data: documentsData, isLoading, refetch, isRefetching } = useDocuments(filters);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const HEADER_MAX = 240 + insets.top;
  const HEADER_MIN = 132 + insets.top;

  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, 100], [HEADER_MAX, HEADER_MIN], Extrapolation.CLAMP);
    return { height };
  });

  const headerContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 55], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 55], [0, -16], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
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
      <TouchableOpacity style={styles.libraryCard} onPress={handleOpenDownloads} activeOpacity={0.85}>
        <View style={styles.libraryIconWrap}>
          <Library size={20} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3">Ma bibliothèque</Text>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.libraryText}>
            {downloadCount > 0
              ? `${downloadCount} document${downloadCount > 1 ? 's' : ''} prêt${downloadCount > 1 ? 's' : ''} à consulter`
              : 'Retrouvez ici vos PDFs téléchargés et partagés'}
          </Text>
        </View>
        <View style={styles.chevronWrap}>
          <ArrowRight size={16} color={theme.colors.textMuted} strokeWidth={2.2} />
        </View>
      </TouchableOpacity>

      <FilterBar
        filters={filters}
        filterOptions={filterOptions}
        onRemoveFilter={handleRemoveFilter}
      />

      <View style={styles.resultsHeader}>
        <Text variant="h3">Récemment ajoutés</Text>
        {!isLoading && documentsData?.pagination && (
          <View style={styles.countPill}>
            <Text variant="caption" color={theme.colors.textMuted}>
              {documentsData.pagination.total} documents
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient
          colors={['#152B6B', '#1E3A8A', '#3B6FE8']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        <View style={styles.blob1} pointerEvents="none" />
        <View style={styles.blob2} pointerEvents="none" />
        <View style={styles.noiseOverlay} pointerEvents="none" />

        <View style={[styles.headerInner, { paddingTop: insets.top }]}>
          {isAuthenticated && (
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              <Menu size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>
          )}
          <Animated.View style={[styles.headerContent, headerContentStyle, isAuthenticated && { paddingTop: 40 }]}>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
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
        </View>
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
    shadowColor: '#0B1B4D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -20,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    transform: [{ scale: 1.4 }],
  },
  blob2: {
    position: 'absolute',
    bottom: -45,
    left: -25,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(96, 165, 250, 0.28)',
    transform: [{ scale: 1.4 }],
  },
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuButton: {
    position: 'absolute',
    top: 0,
    left: 16,
    zIndex: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#7DD3FC',
  },
  title: {
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    opacity: 0.95,
    maxWidth: width * 0.8,
    lineHeight: 20,
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  libraryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  libraryText: {
    marginTop: 2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  countPill: {
    backgroundColor: theme.colors.surfaceMuted ?? theme.colors.borderLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
});

export default HomeScreen;