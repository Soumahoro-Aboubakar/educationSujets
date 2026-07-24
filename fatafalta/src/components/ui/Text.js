import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import theme from '../../theme/tokens';

/**
 * Custom Text component that uses the design system typography tokens
 * @param {Object} props
 * @param {'h1'|'h2'|'h3'|'body'|'bodyMedium'|'caption'|'overline'} props.variant - Typography variant
 * @param {string} props.color - Text color (default: theme.colors.textPrimary)
 * @param {string} props.align - Text alignment
 * @param {number} props.numberOfLines - Max lines before truncating
 */
const Text = ({
  variant = 'body',
  color = theme.colors.textPrimary,
  align = 'left',
  style,
  children,
  ...props
}) => {
  const textStyle = [
    theme.typography[variant],
    { color, textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

export default Text;
