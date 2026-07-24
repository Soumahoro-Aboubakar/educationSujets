import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import theme from '../../theme/tokens';

/**
 * Progress bar component
 * @param {Object} props
 * @param {number} props.progress - 0 to 1
 */
const ProgressBar = ({ progress = 0, color = theme.colors.primary, style }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${progress * 100}%`, { duration: 200 }),
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 4,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  bar: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
});

export default ProgressBar;
