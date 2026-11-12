import { useTheme } from '../../theme/ThemeProvider';
import React from 'react';
import { Text as RNText, useWindowDimensions } from 'react-native';

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
  color: colorProp,
  align = 'left',
  style,
  children,
  numberOfLines,
  adjustsFontSizeToFit,
  ...props
}) => {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const color = colorProp === undefined ? theme.colors.textPrimary : colorProp;
  const textStyle = [
    { minWidth: 0 },
    theme.typography[variant],
    { color, textAlign: align },
    style,
  ];

  return (
    <RNText style={textStyle} {...props} numberOfLines={largeText ? undefined : numberOfLines} adjustsFontSizeToFit={largeText ? false : adjustsFontSizeToFit}>
      {children}
    </RNText>
  );
};

export default Text;
