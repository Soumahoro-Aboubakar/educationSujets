import { TouchableOpacity } from './FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { View, StyleSheet, } from 'react-native';

/**
 * Base Card component with shadow and radius
 * @param {Object} props
 * @param {boolean} props.onPress - If provided, makes the card pressable
 */
const Card = ({
  children,
  style,
  onPress,
  shadow = 'sm',
  ...props
}) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const cardStyle = [
    styles.card,
    theme.shadows[shadow],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.95}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

export default Card;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      overflow: 'hidden',
    },
  });
  return { styles };
});
