import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

import Text from './Text';

/**
 * Premium text input component for forms
 */
const FormInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  icon: Icon,
  error,
  editable = true,
  ...props
}) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  return (
    <>
      {label && (
        <Text 
          variant="bodyMedium" 
          color={theme.colors.textSecondary}
          style={styles.label}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: error ? theme.colors.error : theme.colors.border,
            backgroundColor: editable ? theme.colors.surface : theme.colors.surfaceRaised,
          }
        ]}
        accessibilityLabel={label || placeholder}
        accessibilityHint={error || undefined}
        selectionColor={theme.brand.burgundy}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        {...props}
      />
      {error && (
        <Text 
          variant="caption" 
          color={theme.colors.error}
          style={styles.errorText}
        >
          {error}
        </Text>
      )}
    </>
  );
};

export default FormInput;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    label: {
      marginBottom: 8,
      fontWeight: '600',
    },
    input: {
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      fontSize: 16,
      color: theme.colors.textPrimary,
      fontFamily: theme.fontFamily.regular,
    },
    errorText: {
      marginTop: 6,
    },
  });
  return { styles };
});
