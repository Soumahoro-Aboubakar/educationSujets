import React from 'react';
import { StatusBar } from 'react-native';
import { useTheme } from './ThemeProvider';

export default function ThemeStatusBar({ barStyle = 'light-content', ...props }) {
  const { isDark } = useTheme();
  return <StatusBar {...props} barStyle={isDark ? 'light-content' : barStyle} />;
}
