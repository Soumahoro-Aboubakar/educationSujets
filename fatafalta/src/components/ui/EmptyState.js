import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Button from './Button';
import theme from '../../theme/tokens';

/**
 * Empty state component
 */
const EmptyState = ({
  icon: Icon = null,
  title = 'Aucun résultat',
  description = "Nous n'avons rien trouvé correspondant à vos critères.",
  action,
  style,
}) => {
  const renderIcon = () => {
    if (!Icon) {
      // Fallback: render a simple text icon
      return (
        <Text style={{ fontSize: 30, color: theme.colors.primary }}>📄</Text>
      );
    }
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    if (typeof Icon === 'function') {
      return <Icon size={30} color={theme.colors.primary} />;
    }
    // If Icon is not valid, use fallback
    return (
      <Text style={{ fontSize: 30, color: theme.colors.primary }}>📄</Text>
    );
  };

  const renderAction = () => {
    if (!action) return null;
    // Support both React elements and { label, onPress } objects
    if (React.isValidElement(action)) {
      return <View style={styles.actionContainer}>{action}</View>;
    }
    if (action.label && action.onPress) {
      return (
        <View style={styles.actionContainer}>
          <Button
            title={action.label}
            variant="primary"
            onPress={action.onPress}
          />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {renderIcon()}
      </View>
      <Text variant="h3" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.description}>
        {description}
      </Text>
      {renderAction()}
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
