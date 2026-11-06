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

/** Grille de cartes en chargement (organismes). */
export const SkeletonGrid = ({ count = 6, columns = 2 }) => (
  <View accessibilityLabel="Chargement" accessible style={styles.grid}>
    {Array.from({ length: count }, (_, index) => (
      <View key={index} style={[styles.gridCell, { width: `${100 / columns}%` }]}>
        <View style={styles.gridCard}>
          <Skeleton width={52} height={52} borderRadius={16} style={styles.brandTone} />
          <Skeleton width="78%" height={14} borderRadius={4} style={[styles.brandTone, { marginTop: 16 }]} />
          <Skeleton width="52%" height={11} borderRadius={4} style={[styles.brandTone, { marginTop: 8 }]} />
        </View>
      </View>
    ))}
  </View>
);

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
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: 10,
  },
  rowContent: {
    minHeight: 72,
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: theme.brand.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.brand.line,
  },
  meta: {
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.layout.gutter - 6,
    paddingTop: theme.spacing.base,
  },
  gridCell: {
    padding: 6,
  },
  gridCard: {
    height: 176,
    alignItems: 'center',
    paddingTop: 18,
    borderRadius: 20,
    backgroundColor: theme.brand.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.brand.line,
  },
});

export default Skeleton;
