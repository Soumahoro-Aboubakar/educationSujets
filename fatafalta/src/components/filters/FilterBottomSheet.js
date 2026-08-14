import React, { useMemo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SlidersHorizontal, Building2, Layers, GraduationCap, Calendar, FolderOpen, Search } from 'lucide-react-native';
import Text from '../ui/Text';
import Button from '../ui/Button';
import FilterSelect from './FilterSelect';
import theme from '../../theme/tokens';
import { FILTER_DEFINITIONS } from '../../types/constants';
import { Modal, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { X, Check } from 'lucide-react-native';

// Map string icon names to Lucide components
const ICONS = {
  'building-2': Building2,
  'layers': Layers,
  'graduation-cap': GraduationCap,
  'calendar': Calendar,
  'folder-open': FolderOpen,
};

/**
 * Bottom sheet for advanced filters
 *
 * UX: les sélections sont conservées dans un état "brouillon" (draftFilters)
 * tant que l'utilisateur n'a pas appuyé sur "Appliquer". Fermer le sheet
 * autrement (backdrop, swipe vers le bas) abandonne le brouillon.
 */
const FilterBottomSheet = React.forwardRef(({
  filters,
  filterOptions,
  onApply, // (draftFilters) => void — appelé uniquement quand l'utilisateur valide
}, ref) => {
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const [activeFilter, setActiveFilter] = React.useState(null);
  const [optionSearch, setOptionSearch] = useState('');
  const innerSheetRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);

  useImperativeHandle(ref, () => ({
    expand: () => {
      // On resynchronise toujours le brouillon sur les filtres réellement
      // appliqués à chaque ouverture : ça garantit qu'un brouillon abandonné
      // précédemment (fermeture via backdrop/swipe) ne réapparaît jamais.
      setDraftFilters(filters);
      setIsOpen(true);
      setTimeout(() => innerSheetRef.current?.expand?.(), 60);
    },
    close: () => {
      innerSheetRef.current?.close?.();
    },
  }));

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        // Un tap sur le fond ferme le sheet SANS appliquer le brouillon.
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSelectPress = (def) => {
    const options = filterOptions[def.key] || [];
    if (options.length === 0) return;
    setOptionSearch('');
    setActiveFilter(def);
  };

  const closeOptionModal = () => {
    setOptionSearch('');
    setActiveFilter(null);
  };

  // Modifie uniquement le brouillon — jamais les filtres réellement appliqués
  const handleDraftChange = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getSelectedName = (key, value) => {
    if (!value) return '';
    const options = filterOptions[key] || [];
    const opt = options.find(o => o._id === value);
    return opt ? (opt.displayName || opt.name) : '';
  };

  const handleReset = () => {
    // Ne réinitialise que le brouillon ; la recherche texte (hors sheet) est conservée.
    setDraftFilters((prev) => ({ search: prev.search }));
  };

  const handleApply = () => {
    onApply && onApply(draftFilters);
    innerSheetRef.current?.close?.();
  };

  // Nombre de filtres modifiés dans le brouillon par rapport aux filtres appliqués,
  // affiché en badge sur le bouton "Appliquer" pour donner un retour clair.
  const changedCount = FILTER_DEFINITIONS.reduce(
    (acc, def) => acc + ((draftFilters[def.key] || '') !== (filters[def.key] || '') ? 1 : 0),
    0
  );

  const isUniversityFilter = activeFilter?.key === 'university';

  const filteredOptions = useMemo(() => {
    if (!activeFilter) return [];
    const options = filterOptions[activeFilter.key] || [];
    if (isUniversityFilter && optionSearch.trim()) {
      const q = optionSearch.trim().toLowerCase();
      return options.filter((o) => {
        const name = (o.displayName || o.name || '').toLowerCase();
        const abbr = (o.abbreviation || '').toLowerCase();
        return name.includes(q) || abbr.includes(q);
      });
    }
    return options;
  }, [activeFilter, filterOptions, optionSearch, isUniversityFilter]);

  const renderOptionItem = ({ item }) => {
    const isSelected = activeFilter && draftFilters[activeFilter.key] === item._id;
    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => {
          handleDraftChange(activeFilter.key, item._id);
          closeOptionModal();
        }}
      >
        <Text variant="body" color={isSelected ? theme.colors.primary : theme.colors.textPrimary}>
          {item.displayName || item.name}
        </Text>
        {isSelected && <Check size={20} color={theme.colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          // Bouton retour Android : même comportement que le backdrop → abandon du brouillon.
          innerSheetRef.current?.close?.();
        }}
      >
        <View style={{ flex: 1 }}>
          <BottomSheet
            ref={innerSheetRef}
            index={0}
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose
            // Allow panning gestures that start from the scroll content to be
            // forwarded to the sheet (required so a downward scroll at the
            // top of the list triggers the pan-down-to-close behaviour).
            enableContentPanningGesture
            // Avec BottomSheetScrollView ci-dessous, un scroll vers le bas quand le
            // contenu est déjà en haut déclenche automatiquement le geste de
            // pan-down-to-close (animation de fermeture incluse) grâce à
            // enablePanDownToClose. On rend le seuil un peu plus permissif pour
            // que le closing se déclenche naturellement dès qu'on "tire" vers le bas.
            overDragResistanceFactor={1.5}
            backgroundStyle={styles.background}
            handleIndicatorStyle={styles.indicator}
            style={styles.sheet}
            onChange={(idx) => {
              if (idx === -1) setIsOpen(false);
            }}
          >
            <View style={styles.container}>
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <SlidersHorizontal size={20} color={theme.colors.primary} />
                  <Text variant="h2" style={styles.title}>Filtres avancés</Text>
                </View>
                <Button
                  variant="primary"
                  title="Appliquer"
                  onPress={handleApply}
                  style={styles.clearButton}
                />
              </View>

              <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
                {FILTER_DEFINITIONS.map((def) => (
                  <FilterSelect
                    key={def.key}
                    label={def.label}
                    placeholder={def.placeholder}
                    value={getSelectedName(def.key, draftFilters[def.key])}
                    icon={ICONS[def.icon]}
                    onPress={() => handleSelectPress(def)}
                  />
                ))}
              </BottomSheetScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleApply}
                  style={styles.applyButton}
                >
                  <Check size={20} color="#fff" strokeWidth={2.5} />
                  <Text variant="bodyMedium" color="#fff" style={styles.applyButtonText}>
                    Appliquer les filtres
                  </Text>
                  {changedCount > 0 && (
                    <View style={styles.applyBadge}>
                      <Text variant="caption" color={theme.colors.primary} style={styles.applyBadgeText}>
                        {changedCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BottomSheet>

          {/* Modal d'options pour le filtre actif */}
          <Modal
            visible={!!activeFilter}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={closeOptionModal}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text variant="h2" style={styles.modalTitle}>
                  {activeFilter ? activeFilter.label : ''}
                </Text>
                <TouchableOpacity onPress={closeOptionModal} style={styles.closeModalBtn}>
                  <X size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {isUniversityFilter && (
                <View style={styles.searchWrap}>
                  <Search size={18} color={theme.colors.textMuted} />
                  <TextInput
                    value={optionSearch}
                    onChangeText={setOptionSearch}
                    placeholder="Rechercher une université..."
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {optionSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setOptionSearch('')}>
                      <X size={18} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.optionItem,
                  (!activeFilter || !draftFilters[activeFilter.key]) && styles.optionItemSelected
                ]}
                onPress={() => {
                  if (activeFilter) handleDraftChange(activeFilter.key, '');
                  closeOptionModal();
                }}
              >
                <Text variant="body" color={(!activeFilter || !draftFilters[activeFilter.key]) ? theme.colors.primary : theme.colors.textPrimary}>
                  Toutes les options
                </Text>
                {(!activeFilter || !draftFilters[activeFilter.key]) && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>

              <FlatList
                data={filteredOptions}
                keyExtractor={item => item._id}
                renderItem={renderOptionItem}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalListContent}
                ListEmptyComponent={
                  isUniversityFilter && optionSearch ? (
                    <View style={styles.emptyState}>
                      <Text variant="body" color={theme.colors.textMuted}>
                        Aucune université ne correspond à « {optionSearch} »
                      </Text>
                    </View>
                  ) : null
                }
              />
            </SafeAreaView>
          </Modal>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius['2xl'],
    borderTopRightRadius: theme.radius['2xl'],
  },
  indicator: {
    backgroundColor: theme.colors.border,
    width: 40,
  },
  container: {
    flex: 1,
  },
  sheet: {
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  clearButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    width: '100%',
    paddingVertical: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  applyButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  applyBadge: {
    backgroundColor: '#fff',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  applyBadgeText: {
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
  },
  closeModalBtn: {
    padding: theme.spacing.xs,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  modalListContent: {
    paddingBottom: theme.spacing['4xl'],
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  optionItemSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
});

export default FilterBottomSheet;