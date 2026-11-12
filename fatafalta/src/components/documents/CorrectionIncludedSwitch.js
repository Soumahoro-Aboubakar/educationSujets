import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Text from '../ui/Text';

/**
 * Indique que le PDF du sujet contient aussi son corrigé :
 * aucun second fichier n'est alors attendu pour ce sujet.
 */
const CorrectionIncludedSwitch = ({ value, onValueChange, disabled }) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.row}>
    <View style={styles.copy}>
      <Text variant="bodyMedium">Corrigé inclus dans le même PDF</Text>
      <Text variant="caption" color={theme.colors.textMuted} style={styles.help}>
        Activez si ce fichier contient le sujet suivi de son corrigé.
      </Text>
    </View>
    <Switch
      style={{ minWidth: 44, minHeight: 44 }}
      accessibilityLabel="Corrigé inclus dans le même PDF"
      value={Boolean(value)}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor={theme.colors.surface}
    />
  </View>);
};

export default CorrectionIncludedSwitch;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.borderLight,
    },
    copy: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    help: {
      marginTop: theme.spacing.xs,
    },
  });
  return { styles };
});
