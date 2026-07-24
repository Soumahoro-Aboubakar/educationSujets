import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../../theme/tokens';

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
  },
});

export default Card;
