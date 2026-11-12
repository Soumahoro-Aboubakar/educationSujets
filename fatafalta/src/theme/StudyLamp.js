import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './ThemeProvider';

/** Halo fixe derrière le bord de la copie : aucun calque animé, aucun flou GPU. */
export default function StudyLamp() {
  const { isDark, brand } = useTheme();
  const id = `studyLamp${useId().replace(/:/g, '')}`;
  if (!isDark) return null;
  return (
    <Svg style={styles.halo} viewBox="0 0 390 160" preserveAspectRatio="none" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id={id} cx="64%" cy="100%" rx="66%" ry="94%">
          <Stop offset="0" stopColor={brand.goldLight} stopOpacity="0.13" />
          <Stop offset="1" stopColor={brand.goldLight} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="390" height="160" fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({ halo: { position: 'absolute', top: -160, left: 0, right: 0, height: 160 } });
