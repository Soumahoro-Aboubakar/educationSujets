import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import Text from './Text';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * État plein écran (erreur ou liste vide) du parcours étudiant.
 * Une erreur réseau propose toujours une action explicite : un bouton,
 * pas un lien souligné difficile à identifier comme appuyable.
 */
const StateView = ({ icon: Icon, title, description, onRetry, retryLabel = 'Réessayer', style }) => (
  <View style={[styles.container, style]}>
    {Icon ? (
      <View style={styles.icon}>
        <Icon size={24} color={brand.inkSoft} strokeWidth={1.6} />
      </View>
    ) : null}
    <Text variant="h3" align="center" style={styles.title}>{title}</Text>
    {description ? (
      <Text variant="body" align="center" style={styles.description}>{description}</Text>
    ) : null}
    {onRetry ? (
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        <RotateCcw size={15} color={brand.ink} strokeWidth={2} />
        <Text variant="bodyMedium" style={styles.retryLabel}>{retryLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
    paddingVertical: theme.spacing['2xl'],
  },
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.base,
    borderRadius: theme.radius.full,
    backgroundColor: brand.paperDim,
  },
  title: {
    color: brand.ink,
  },
  description: {
    maxWidth: 290,
    marginTop: 6,
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    minHeight: theme.layout.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: brand.lineStrong,
    borderRadius: theme.radius.full,
  },
  retryPressed: {
    backgroundColor: brand.pressed,
  },
  retryLabel: {
    color: brand.ink,
    fontSize: 14,
  },
});

export default StateView;
