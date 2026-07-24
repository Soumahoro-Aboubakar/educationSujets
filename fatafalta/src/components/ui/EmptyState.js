import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import theme from '../../theme/tokens';
import { FileText } from 'lucide-react-native';

/**
 * Empty state component
 */
const EmptyState = ({
  icon: Icon = FileText,
  title = 'Aucun résultat',
  description = 'Nous n’avons rien trouvé correspondant à vos critères.',
  action,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Icon size={30} color={theme.colors.primary} />
      </View>
      <Text variant="h3" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.description}>
        {description}
      </Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: theme.radius['2xl'],
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  description: {
    marginBottom: theme.spacing.xl,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: theme.spacing.md,
  },
});

export default EmptyState;
