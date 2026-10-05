import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Text from '../ui/Text';
import theme from '../../theme/tokens';

const { brand } = theme;

// Logos fournis avec l'application. Un logo saisi dans l'administration (logoUrl) reste prioritaire.
const BUNDLED_LOGOS = {
  wave: require('../../../assets/payment-logos/wave.png'),
};

/** Logo d'un moyen de paiement, ou son initiale s'il n'en a pas. */
const PaymentMethodLogo = ({ code, label = '', logoUrl, size = 24 }) => {
  const source = logoUrl ? { uri: logoUrl } : BUNDLED_LOGOS[code];
  const box = { width: size, height: size, borderRadius: Math.round(size / 4) };

  if (source) {
    return <Image source={source} style={box} resizeMode="contain" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={[box, styles.fallback]}>
      <Text variant="bodyMedium" style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>{label.charAt(0)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.paperDim,
  },
  letter: {
    color: brand.ink,
  },
});

export default PaymentMethodLogo;
