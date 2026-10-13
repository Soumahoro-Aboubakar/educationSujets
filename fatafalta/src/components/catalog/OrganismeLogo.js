import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Text from '../ui/Text';
import { API_BASE_URL } from '../../types/constants';
import theme from '../../theme/tokens';

const { brand } = theme;

/*
 * Logo d'un organisme : image (champ `logo`, administré sur le web) ou, à défaut ou si l'image ne
 * se charge pas, monogramme des deux premiers caractères du nom. Même règle que le site
 * (frontend/src/components/catalog/OrganismeLogo.js) : ENA → EN · Concours Police → CO · INP-HB → IN.
 * Conteneur de taille fixe : aucun décalage de mise en page, image contenue jamais étirée.
 */

// Teintes de la charte (encre, bordeaux, or…) ; texte blanc lisible sur chacune.
const PALETTE = ['#0D1B32', '#6C2838', '#7A5A24', '#14514C', '#2B4A8B', '#53346B', '#2E5A2E', '#9A4421', '#3A3F4B'];

export const monogramOf = (name = '') => {
  const characters = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '');
  return characters ? characters.slice(0, 2).toUpperCase() : '?';
};

const hash = (value) => [...String(value)].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);

/** Adresse affichable : https, ou logo téléversé servi par l'API (/api/organismes/:id/logo). */
const logoUri = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^https:\/\/\S+$/.test(trimmed)) return trimmed;
  if (/^\/api\/\S+$/.test(trimmed)) return `${API_BASE_URL.replace(/\/$/, '')}${trimmed}`;
  return null;
};

const OrganismeLogo = ({ organisme, size = 44, style }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [organisme?.logo]);
  const name = organisme?.nom || organisme?.name || '';
  const uri = !broken ? logoUri(organisme?.logo) : null;
  const radius = Math.round(size * 0.28);

  if (uri) {
    return (
      <View style={[styles.box, styles.imageBox, { width: size, height: size, borderRadius: radius, padding: Math.round(size * 0.12) }, style]}>
        <Image source={{ uri }} resizeMode="contain" onError={() => setBroken(true)} style={styles.image} accessibilityIgnoresInvertColors />
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size, borderRadius: radius, backgroundColor: PALETTE[hash(organisme?.slug || name) % PALETTE.length] }, style]}
    >
      <Text style={[styles.monogram, { fontSize: Math.round(size * 0.34) }]}>{monogramOf(name)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  monogram: {
    color: '#FFFFFF',
    fontFamily: theme.fontFamily.semiBold,
    letterSpacing: 0.4,
  },
});

export default OrganismeLogo;
