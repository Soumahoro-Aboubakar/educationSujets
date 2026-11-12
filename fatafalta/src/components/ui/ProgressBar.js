import { useTheme } from '../../theme/ThemeProvider';
import React from 'react';
import { ProgressBar as PrepProgressBar } from '../../prep/ui/primitives';

/**
 * Progress bar component
 * @param {Object} props
 * @param {number} props.progress - 0 to 1
 */
const ProgressBar = ({ progress = 0, color: colorProp, style }) => {
  const { theme } = useTheme();
  return <PrepProgressBar value={progress} color={colorProp || theme.colors.primary} track={theme.colors.surfaceRaised} height={4} style={[{ width: '100%' }, style]} />;
};

export default ProgressBar;

