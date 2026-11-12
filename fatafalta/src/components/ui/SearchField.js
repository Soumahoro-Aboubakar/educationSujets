import Pressable from './FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

/**
 * Champ de recherche du parcours étudiant.
 * `busy` affiche un indicateur dans le champ pendant qu'une recherche
 * serveur est en cours : les résultats précédents restent visibles.
 */
const SearchField = ({ value, onChangeText, placeholder = 'Rechercher', busy = false, style }) => {
  const { brand, theme } = useTheme();
  const { styles } = useStyles();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.focused, style]}>
      <Search size={17} color={focused ? brand.ink : brand.inkMuted} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={placeholder}
        selectionColor={brand.burgundy}
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
          <X size={17} color={brand.inkSoft} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
};

export default SearchField;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 16,
      paddingRight: 4,
      backgroundColor: brand.sheet,
      borderWidth: 1,
      borderColor: brand.line,
      borderRadius: 14,
      ...theme.shadows.sm,
    },
    focused: {
      borderColor: brand.burgundy,
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      paddingVertical: 10,
      color: brand.ink,
      fontFamily: theme.fontFamily.regular,
      fontSize: 15,
    },
    clear: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: brand.paperDim,
    },
  });
  return { styles };
});
