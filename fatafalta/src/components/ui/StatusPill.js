import { createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';

// Une seule table de correspondance statut → ton, partagée par tous les écrans du compte.

export const STATUS_LABELS = {
  ACTIVE: ['Actif', 'positive'],
  INACTIVE: ['Inactif', 'neutral'],
  EXPIRED: ['Expiré', 'negative'],
  PENDING: ['En attente', 'pending'],
  PROCESSING: ['En cours', 'pending'],
  NONE: ['Aucun abonnement', 'neutral'],
  SUCCEEDED: ['Réussi', 'positive'],
  INITIATED: ['En attente de confirmation', 'pending'],
  FAILED: ['Non abouti', 'negative'],
  CANCELLED: ['Annulé', 'neutral'],
  AVAILABLE: ['Disponible', 'positive'],
  REVERSED: ['Annulée', 'negative'],
  PROCESSED: ['Versé', 'positive'],
};

const StatusPill = ({ status, label, tone }) => {
  const { TONES, styles } = useStyles();
  const [defaultLabel, defaultTone] = Object.prototype.hasOwnProperty.call(STATUS_LABELS, status) ? STATUS_LABELS[status] : ['À vérifier', 'neutral'];
  const palette = TONES[tone || defaultTone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.label, { color: palette.fg }]}>{label || defaultLabel}</Text>
    </View>
  );
};

export default StatusPill;

const useStyles = createThemedStyles(({ colors, brand, theme }) => {
  const TONES = {
    positive: { dot: colors.success, bg: colors.successWash, fg: colors.success },
    pending: { dot: brand.gold, bg: brand.goldWash, fg: brand.goldInk },
    negative: { dot: colors.error, bg: colors.errorWash, fg: colors.error },
    neutral: { dot: brand.inkMuted, bg: brand.paperDim, fg: brand.inkSoft },
  };

  const styles = StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 12,
      lineHeight: 16,
    },
  });
  return { TONES, styles };
});
