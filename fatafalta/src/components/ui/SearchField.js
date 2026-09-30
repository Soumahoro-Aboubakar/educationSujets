import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Champ de recherche du parcours étudiant.
 * `busy` affiche un indicateur dans le champ pendant qu'une recherche
 * serveur est en cours : les résultats précédents restent visibles.
 */
const SearchField = ({ value, onChangeText, placeholder = 'Rechercher', busy = false, style }) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.focused, style]}>
      <Search size={17} color={focused ? brand.ink : brand.inkMuted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={brand.inkMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
      />
      {busy ? (
        <ActivityIndicator size="small" color={brand.inkMuted} />
      ) : value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          hitSlop={theme.hitSlop}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <X size={13} color={brand.paper} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: brand.line,
    borderRadius: theme.radius.md,
  },
  focused: {
    borderColor: brand.ink,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: brand.ink,
    fontFamily: theme.fontFamily.regular,
    fontSize: 15,
  },
  clear: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: brand.inkMuted,
  },
});

export default SearchField;
