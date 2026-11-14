
import { ActivityIndicator, Pressable as NativePressable, TouchableOpacity as NativeTouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import useAsyncAction from '../../hooks/useAsyncAction';

// Adaptateur de comportement uniquement : conserve styles et dimensions des contrôles existants.
const PendingIndicator = () => {
  const { brand } = useTheme();
  return <View pointerEvents="none" style={styles.pending}>
    <View style={[styles.indicator, { backgroundColor: brand.sheet }]}>
      <ActivityIndicator size="small" color={brand.burgundy} />
    </View>
  </View>;
};

const FeedbackPressable = ({ ref, onPress, disabled, loading, accessibilityState, children, style, ...props }) => {
  const [run, pending] = useAsyncAction();
  const busy = Boolean(loading || pending);
  return <NativePressable
    {...props}
    ref={ref}
    disabled={disabled || busy}
    accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled || busy), busy: Boolean(busy || accessibilityState?.busy) }}
    onPress={(event) => { if (!disabled && !busy) return run(onPress, event); }}
    /* Un style-fonction gère déjà son propre état pressé : on n’y superpose rien. */
    style={typeof style === 'function' ? style : (state) => [style, state.pressed && styles.pressed]}
  >
    {(state) => typeof children === 'function' ? children({ ...state, pending: busy }) : <>{children}{busy ? <PendingIndicator /> : null}</>}
  </NativePressable>;
};

export const TouchableOpacity = ({ ref, onPress, disabled, loading, accessibilityState, children, ...props }) => {
  const [run, pending] = useAsyncAction();
  const busy = Boolean(loading || pending);
  return <NativeTouchableOpacity
    {...props}
    ref={ref}
    disabled={disabled || busy}
    accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled || busy), busy }}
    onPress={(event) => { if (!disabled && !busy) return run(onPress, event); }}
  >
    {children}{busy ? <PendingIndicator /> : null}
  </NativeTouchableOpacity>;
};

export default FeedbackPressable;

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  pending: { ...StyleSheet.absoluteFill, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  indicator: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
