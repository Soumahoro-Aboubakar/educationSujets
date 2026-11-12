import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileText } from 'lucide-react-native';
import Text from './Text';
import Button from './Button';

/**
 * Empty state component
 */
const EmptyState = ({
  icon: Icon = null,
  title = 'Aucun résultat',
  description = "Aucun résultat ne correspond à vos critères. Modifiez votre recherche ou vos filtres.",
  action,
  style,
}) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const renderIcon = () => {
    if (!Icon) {
      return <FileText size={30} color={theme.colors.primary} strokeWidth={2} />;
    }
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    if (typeof Icon === 'function' || Icon?.$$typeof) {
      return <Icon size={30} color={theme.colors.primary} strokeWidth={2} />;
    }
    return <FileText size={30} color={theme.colors.primary} strokeWidth={2} />;
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

export default EmptyState;

const useStyles = createThemedStyles(({ theme }) => {
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
      borderRadius: theme.radius.full,
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
  return { styles };
});
