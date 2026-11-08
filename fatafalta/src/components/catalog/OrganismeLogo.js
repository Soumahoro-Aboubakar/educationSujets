import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useReducedMotion } from 'react-native-reanimated';
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

/** Les références storage passent par l'API, qui redirige vers l'image signée. */
const logoUri = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^https:\/\/\S+$/.test(trimmed)) return trimmed;
  if (/^\/api\/\S+$/.test(trimmed)) return `${API_BASE_URL.replace(/\/$/, '')}${trimmed}`;
  const stored = /^storage:documents\/organismes\/([A-Za-z0-9_-]+)\/[^\s]+$/.exec(trimmed);
  if (stored) return `${API_BASE_URL.replace(/\/$/, '')}/api/organismes/${stored[1]}/logo`;
  return null;
};

const OrganismeLogo = ({ organisme, size = 44, style }) => {
  const reduceMotion = useReducedMotion();
  const [failedLogo, setFailedLogo] = useState(null);
  const logo = organisme?.logo;
  // La référence brute inclut le nom horodaté : nouveau fichier = nouvelle entrée du cache.
  const cacheKey = typeof logo === 'string' ? `organisme-logo:${logo}` : null;
  const name = organisme?.nom || organisme?.name || '';
  const uri = failedLogo !== logo ? logoUri(logo) : null;
  const radius = Math.round(size * 0.28);

  if (uri) {
    return (
      <View style={[styles.box, styles.imageBox, { width: size, height: size, borderRadius: radius, padding: Math.round(size * 0.12) }, style]}>
        <Image
          key={cacheKey}
          source={{ uri, cacheKey }}
          cachePolicy="memory-disk"
          recyclingKey={cacheKey}
          contentFit="contain"
          transition={reduceMotion ? 0 : 120}
          onError={() => setFailedLogo(logo)}
          style={styles.image}
          accessibilityIgnoresInvertColors
        />
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
