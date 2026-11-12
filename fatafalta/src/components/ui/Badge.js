import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';

/**
 * Badge component for displaying tags, statuses, etc.
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.color
 * @param {string} props.backgroundColor
 * @param {React.ReactNode} props.icon
 */
const Badge = ({
  label,
  color: colorProp,
  backgroundColor: backgroundColorProp,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const color = colorProp === undefined ? theme.colors.primary : colorProp;
  const backgroundColor = backgroundColorProp === undefined ? theme.colors.primaryWash : backgroundColorProp;
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text variant="caption" style={[styles.label, { color }]}>
        {label}
      </Text>
    </View>
  );
};

export default Badge;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      alignSelf: 'flex-start',
    },
    iconContainer: {
      marginRight: theme.spacing.xs,
    },
    label: {
      lineHeight: 16, // tighter line height for badge
    },
  });
  return { styles };
});
