import Pressable from '../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../components/ui/Text';
import { haptic, useReduceMotion } from '../prep/feedback';

const BAR_HEIGHT = 64;
const INSET = 6;
const SPRING = { damping: 20, stiffness: 240, mass: 0.9 };

/**
 * Onglet : l'icône glisse légèrement à gauche et le libellé apparaît dans la pastille active ;
 * inactif, l'icône seule, en ivoire atténué. `progress` = 1 quand l'onglet est actif.
 */
const TabItem = ({ route, label, Icon, focused, badge, onPress, onLongPress, reduce, largeText }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const progress = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    progress.value = reduce ? withTiming(focused ? 1 : 0, { duration: 120 }) : withSpring(focused ? 1 : 0, SPRING);
  }, [focused, reduce, progress]);

  const color = focused ? brand.burgundy : 'rgba(255,255,255,0.62)';

  const content = useAnimatedStyle(() => ({
    transform: [{ scale: reduce ? 1 : 1 - press.value * 0.08 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: reduce ? 0 : interpolate(progress.value, [0, 1], [-6, 0]) }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label}${badge ? ', révisions à faire' : ''}`}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { press.value = withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }); }}
      style={styles.item}
      testID={`tab-${route.name}`}
    >
      <Animated.View style={[styles.itemContent, content]}>
        <View>
          <Icon size={21} color={color} strokeWidth={focused ? 2.2 : 1.9} />
          {badge ? <View style={[styles.badge, focused ? styles.badgeOn : styles.badgeOff]} /> : null}
        </View>
        {!largeText ? <Animated.View style={[styles.labelWrap, !focused && { display: 'none' }, labelStyle]}>
          <Text variant="caption" style={styles.label} numberOfLines={1}>{label}</Text>
        </Animated.View> : null}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Barre d'onglets « capsule d'encre » : flotte au-dessus du papier, une pastille ivoire glisse
 * (ressort amorti) sous l'onglet actif et porte son libellé. Haptique à chaque changement.
 * Masquée quand le clavier est ouvert (Android) pour ne pas remonter au-dessus de lui.
 */
const PremiumTabBar = ({ state, descriptors, navigation, icons, badges = {} }) => {
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const count = state.routes.length;
  const slot = width ? (width - INSET * 2) / count : 0;
  const x = useSharedValue(state.index * slot);
  const stretch = useSharedValue(0);

  useEffect(() => {
    if (!slot) return;
    const target = state.index * slot;
    if (reduce) { x.value = target; return; }
    // Léger étirement pendant le trajet : la pastille « coule » d'un onglet à l'autre.
    stretch.value = withTiming(1, { duration: 120 }, () => { stretch.value = withSpring(0, SPRING); });
    x.value = withSpring(target, SPRING);
  }, [state.index, slot, reduce, x, stretch]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const pill = useAnimatedStyle(() => ({
    width: slot,
    transform: [{ translateX: x.value }, { scaleX: 1 + stretch.value * 0.06 }],
  }));

  if (keyboard) return null;
  const activeOptions = descriptors[state.routes[state.index].key].options;
  const activeLabel = typeof activeOptions.tabBarLabel === 'string' ? activeOptions.tabBarLabel : activeOptions.title ?? state.routes[state.index].name;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {largeText ? <Text variant="caption" style={styles.activeLabel} accessible={false}>{activeLabel}</Text> : null}
      <View style={styles.capsule} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        <View style={styles.sheen} pointerEvents="none" />
        {slot ? (
          <Animated.View style={[styles.pill, pill]} pointerEvents="none">
            <View style={styles.pillInner} />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.select();
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return (
            <TabItem
              key={route.key}
              route={route}
              label={label}
              Icon={icons[route.name]}
              focused={focused}
              badge={badges[route.name]}
              onPress={onPress}
              onLongPress={onLongPress}
              reduce={reduce}
              largeText={largeText}
            />
          );
        })}
      </View>
    </View>
  );
};

export default PremiumTabBar;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    activeLabel: { textAlign: 'center', color: brand.inkSoft, marginBottom: 6 },
    wrap: {
      ...theme.layout.readingFrame,
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: brand.paper,
    },
    capsule: {
      height: BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: INSET,
      borderRadius: BAR_HEIGHT / 2,
      backgroundColor: brand.night,
      overflow: 'hidden',
      shadowColor: brand.night,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    sheen: {
      position: 'absolute',
      left: 24,
      right: 24,
      top: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    pill: {
      position: 'absolute',
      left: INSET,
      top: INSET,
      bottom: INSET,
      paddingHorizontal: 2,
    },
    pillInner: {
      flex: 1,
      borderRadius: (BAR_HEIGHT - INSET * 2) / 2,
      backgroundColor: brand.paper,
    },
    item: {
      flex: 1,
      height: BAR_HEIGHT - INSET * 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelWrap: {
      marginLeft: 6,
      flexShrink: 1,
      overflow: 'hidden',
    },
    label: {
      color: brand.burgundy,
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 13,
      letterSpacing: -0.1,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -3,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    badgeOn: {
      backgroundColor: brand.burgundySolid,
      borderColor: brand.paper,
    },
    badgeOff: {
      backgroundColor: brand.goldLight,
      borderColor: brand.ink,
    },
  });
  return { styles };
});
