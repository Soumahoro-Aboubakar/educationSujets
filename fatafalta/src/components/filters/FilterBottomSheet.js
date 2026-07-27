import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, ActionSheetIOS, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SlidersHorizontal, Building2, Layers, GraduationCap, Calendar, FolderOpen } from 'lucide-react-native';
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
 */
const FilterBottomSheet = React.forwardRef(({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
  onApply,
}, ref) => {
  const snapPoints = useMemo(() => ['70%', '90%'], []);
  const [activeFilter, setActiveFilter] = React.useState(null);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  const handleSelectPress = (def) => {
    const options = filterOptions[def.key] || [];
    if (options.length === 0) return;
    setActiveFilter(def);
  };

  const getSelectedName = (key, value) => {
    if (!value) return '';
    const options = filterOptions[key] || [];
    const opt = options.find(o => o._id === value);
    return opt ? (opt.displayName || opt.name) : '';
  };

  const renderOptionItem = ({ item }) => {
    const isSelected = activeFilter && filters[activeFilter.key] === item._id;
    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => {
          onFilterChange(activeFilter.key, item._id);
          setActiveFilter(null);
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
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <SlidersHorizontal size={20} color={theme.colors.primary} />
            <Text variant="h2" style={styles.title}>Filtres avancés</Text>
          </View>
          <Button
            variant="ghost"
            title="Réinitialiser"
            onPress={onClearFilters}
            textStyle={{ color: theme.colors.textMuted }}
            style={styles.clearButton}
          />
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {FILTER_DEFINITIONS.map((def) => (
            <FilterSelect
              key={def.key}
              label={def.label}
              placeholder={def.placeholder}
              value={getSelectedName(def.key, filters[def.key])}
              icon={ICONS[def.icon]}
              onPress={() => handleSelectPress(def)}
            />
          ))}
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <Button
            title="Appliquer les filtres"
            onPress={onApply}
            style={styles.applyButton}
          />
        </View>
      </View>

      <Modal
        visible={!!activeFilter}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveFilter(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="h2" style={styles.modalTitle}>
              {activeFilter ? activeFilter.label : ''}
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter(null)} style={styles.closeModalBtn}>
              <X size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.optionItem,
              (!activeFilter || !filters[activeFilter.key]) && styles.optionItemSelected
            ]}
            onPress={() => {
              if (activeFilter) onFilterChange(activeFilter.key, '');
              setActiveFilter(null);
            }}
          >
            <Text variant="body" color={(!activeFilter || !filters[activeFilter.key]) ? theme.colors.primary : theme.colors.textPrimary}>
              Toutes les options
            </Text>
            {(!activeFilter || !filters[activeFilter.key]) && <Check size={20} color={theme.colors.primary} />}
          </TouchableOpacity>

          <FlatList
            data={activeFilter ? filterOptions[activeFilter.key] : []}
            keyExtractor={item => item._id}
            renderItem={renderOptionItem}
            contentContainerStyle={styles.modalListContent}
          />
        </SafeAreaView>
      </Modal>
    </BottomSheet>
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
    paddingBottom: theme.spacing['2xl'], // Safe area approx
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  applyButton: {
    width: '100%',
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
  modalListContent: {
    paddingBottom: theme.spacing['4xl'],
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
