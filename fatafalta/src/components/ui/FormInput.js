import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import theme from '../../theme/tokens';
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

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontFamily: 'Inter',
  },
  errorText: {
    marginTop: 6,
  },
});

export default FormInput;
