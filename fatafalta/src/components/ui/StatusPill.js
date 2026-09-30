import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from './Text';
import theme from '../../theme/tokens';

const { brand, colors } = theme;

// Une seule table de correspondance statut → ton, partagée par tous les écrans du compte.
const TONES = {
  positive: { dot: colors.success, bg: colors.successWash, fg: '#047857' },
  pending: { dot: brand.gold, bg: brand.goldWash, fg: brand.goldInk },
  negative: { dot: colors.error, bg: colors.errorWash, fg: '#B91C1C' },
  neutral: { dot: brand.inkMuted, bg: brand.paperDim, fg: brand.inkSoft },
};

export const STATUS_LABELS = {
  ACTIVE: ['Actif', 'positive'],
  INACTIVE: ['Inactif', 'neutral'],
  EXPIRED: ['Expiré', 'negative'],
  PENDING: ['En attente', 'pending'],
  NONE: ['Aucun abonnement', 'neutral'],
  SUCCEEDED: ['Réussi', 'positive'],
  INITIATED: ['Initié', 'pending'],
  FAILED: ['Échoué', 'negative'],
  CANCELLED: ['Annulé', 'neutral'],
  AVAILABLE: ['Disponible', 'positive'],
  REVERSED: ['Annulée', 'negative'],
  PROCESSED: ['Versé', 'positive'],
};

const StatusPill = ({ status, label, tone }) => {
  const [defaultLabel, defaultTone] = STATUS_LABELS[status] || [status, 'neutral'];
  const palette = TONES[tone || defaultTone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.label, { color: palette.fg }]}>{label || defaultLabel}</Text>
    </View>
  );
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

export default StatusPill;
