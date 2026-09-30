import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import theme from '../../theme/tokens';

/**
 * Animated Skeleton loader
 * @param {Object} props
 * @param {number|string} props.width
 * @param {number|string} props.height
 * @param {number} props.borderRadius
 */
const Skeleton = ({
  width = '100%',
  height = 20,
  borderRadius = theme.radius.sm,
  style,
}) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * Squelette d'une liste de ListRow : même géométrie que les lignes réelles,
 * pour que le contenu remplace le squelette sans décalage visuel.
 */
const ROW_WIDTHS = ['72%', '58%', '80%', '64%', '52%', '70%'];

export const SkeletonRows = ({ count = 5, withMeta = true }) => (
  <View accessibilityLabel="Chargement" accessible>
    {ROW_WIDTHS.slice(0, count).map((width, index) => (
      <View key={index} style={styles.row}>
        <View style={styles.rowContent}>
          <Skeleton width={width} height={15} borderRadius={4} style={styles.brandTone} />
          {withMeta ? <Skeleton width="34%" height={11} borderRadius={4} style={[styles.brandTone, styles.meta]} /> : null}
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.skeleton,
    overflow: 'hidden',
  },
  brandTone: {
    backgroundColor: theme.brand.skeleton,
  },
  row: {
    paddingLeft: theme.layout.gutter,
  },
  rowContent: {
    minHeight: theme.layout.rowMinHeight,
    justifyContent: 'center',
    paddingVertical: 14,
    paddingRight: theme.layout.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.brand.line,
  },
  meta: {
    marginTop: 8,
  },
});

export default Skeleton;
