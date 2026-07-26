import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text as RNText,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Keyboard,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Check, Search } from 'lucide-react-native';
import theme from '../../theme/tokens';
import Text from './Text';

/**
 * Mobile-optimized CreatableSelect component
 * Allows selecting from existing options or creating new ones
 */
const MetadataSelect = ({
  label,
  placeholder,
  options = [],
  value,
  onChange,
  onCreate,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [creatingError, setCreatingError] = useState(null);

  const selectedOption = options.find(opt => opt._id === value);
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = options.find(opt =>
    opt.name.toLowerCase() === search.toLowerCase().trim()
  );

  const handleSelectOption = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreateOption = async () => {
    const trimmedName = newOptionName.trim();
    
    if (!trimmedName) {
      setCreatingError('Veuillez entrer un nom');
      return;
    }

    if (exactMatch) {
      setCreatingError('Cette option existe déjà');
      return;
    }

    setIsCreating(true);
    setCreatingError(null);

    try {
      const newOption = await onCreate(trimmedName);
      handleSelectOption(newOption._id);
      setNewOptionName('');
    } catch (err) {
      setCreatingError('Erreur lors de la création');
      console.error('Error creating option:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {label && (
          <Text 
            variant="bodyMedium" 
            color={theme.colors.textSecondary}
            style={styles.label}
          >
            {label}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.selectButton,
            {
              borderColor: error ? theme.colors.error : theme.colors.border,
              backgroundColor: disabled ? theme.colors.surfaceRaised : theme.colors.surface,
              opacity: disabled ? 0.6 : 1,
            }
          ]}
          onPress={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        >
          <RNText 
            style={[
              styles.selectButtonText,
              {
                color: selectedOption ? theme.colors.textPrimary : theme.colors.textMuted,
                fontWeight: selectedOption ? '600' : '400',
              }
            ]}
            numberOfLines={1}
          >
            {selectedOption ? selectedOption.name : placeholder}
          </RNText>
          {selectedOption && (
            <TouchableOpacity
              onPress={() => {
                onChange(null);
                setSearch('');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {error && (
          <Text 
            variant="caption" 
            color={theme.colors.error}
            style={styles.errorText}
          >
            {error}
          </Text>
        )}
      </View>

      <Modal
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
        transparent
        animationType="slide"
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <RNText style={styles.modalTitle}>{label}</RNText>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher..."
                placeholderTextColor={theme.colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleSelectOption(item._id)}
                >
                  <RNText style={styles.optionText}>{item.name}</RNText>
                  {value === item._id && (
                    <Check size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !search.trim() ? null : (
                  <View style={styles.emptyState}>
                    <RNText style={styles.emptyStateText}>
                      Aucune option trouvée
                    </RNText>
                  </View>
                )
              }
              style={styles.optionsList}
              keyboardShouldPersistTaps="handled"
            />

            {/* Create New Option */}
            {search.trim() && !exactMatch && (
              <View style={styles.createContainer}>
                {creatingError && (
                  <Text 
                    variant="caption" 
                    color={theme.colors.error}
                    style={{ marginBottom: 8 }}
                  >
                    {creatingError}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    { opacity: isCreating ? 0.6 : 1 }
                  ]}
                  onPress={handleCreateOption}
                  disabled={isCreating}
                >
                  <Plus size={20} color={theme.colors.textInverse} />
                  <RNText style={styles.createButtonText}>
                    {isCreating ? 'Création...' : `Créer "${search.trim()}"`}
                  </RNText>
                </TouchableOpacity>
              </View>
            )}

            {/* Close Button */}
            <View style={styles.closeButtonContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <RNText style={styles.closeButtonText}>Fermer</RNText>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  selectButton: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  errorText: {
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 'auto',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  optionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  createContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  createButton: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textInverse,
  },
  closeButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  closeButton: {
    height: 56,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default MetadataSelect;
