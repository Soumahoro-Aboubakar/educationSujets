import React from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Download, FileText, UserRound } from 'lucide-react-native';
import Text from '../components/ui/Text';
import OrientationArt, { OrientationBackdrop } from '../components/illustrations/OrientationArt';
import theme from '../theme/tokens';

const { brand } = theme;

// Filet aux couleurs nationales, discret rappel du contexte ivoirien.
const FLAG = ['#F77F00', '#FFFFFF', '#009E60'];

/**
 * Premier écran vu par l'utilisateur : une seule promesse, une action principale
 * évidente, deux raccourcis. Tout tient dans la hauteur de l'écran, sans défilement.
 */
const OrientationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // Retour tactile immédiat : l'appui est ressenti avant même la transition.
  const go = (route) => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate(route);
  };
  const openArchives = () => go('ContestSelection');
  const openDownloads = () => go('Downloads');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <OrientationBackdrop />

      <View style={[styles.brand, { paddingTop: insets.top + theme.spacing.base }]}>
        <View style={styles.flag}>
          {FLAG.map((color) => <View key={color} style={[styles.flagBand, { backgroundColor: color }]} />)}
        </View>
        <Text variant="overline" style={styles.brandName}>Fatafalta</Text>
      </View>

      {/* L'illustration occupe l'espace libre : ni vide, ni rognage selon l'écran. */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.art}>
        <OrientationArt />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(120)} style={styles.hero}>
        <Text variant="h1" style={styles.heading} accessibilityRole="header">
          Les anciens sujets,{'\n'}à portée de main.
        </Text>
        <Text variant="body" style={styles.subtitle}>Concours et examens, avec leurs corrigés.</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(420).delay(200)}
        style={[styles.panel, { paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.sm }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explorer les anciens sujets"
          onPress={openArchives}
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
        >
          <View style={styles.primaryIcon}>
            <FileText size={20} color={brand.ink} strokeWidth={1.9} />
          </View>
          <Text variant="bodyMedium" style={styles.primaryLabel}>Explorer les sujets</Text>
          <ChevronRight size={20} color={brand.onInk} strokeWidth={2.2} />
        </Pressable>

        <View style={styles.shortcuts}>
          <Shortcut icon={Download} label="Téléchargements" onPress={openDownloads} />
          <Shortcut icon={UserRound} label="Mon espace" onPress={() => navigation.navigate('MainTabs', { screen: 'AppTabs', params: { screen: 'AccountTab' } })} />
        </View>
      </Animated.View>
    </View>
  );
};

const Shortcut = ({ icon: Icon, label, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
  >
    <Icon size={18} color={brand.ink} strokeWidth={1.9} />
    <Text variant="bodyMedium" style={styles.shortcutLabel} numberOfLines={1}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.ink,
  },
  art: {
    flex: 1,
    minHeight: 120,
    marginVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.layout.gutter,
  },
  flag: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 1,
  },
  flagBand: {
    width: 7,
    height: 3,
  },
  brandName: {
    color: brand.onInk,
    letterSpacing: 1.4,
  },
  hero: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing.xl,
  },
  heading: {
    color: brand.onInk,
    fontFamily: theme.fontFamily.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    color: brand.onInkSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
    backgroundColor: brand.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  primary: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: 10,
    paddingRight: theme.spacing.base,
    backgroundColor: brand.ink,
    borderRadius: theme.radius.lg,
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: brand.onInkAccent,
  },
  primaryLabel: {
    flex: 1,
    color: brand.onInk,
    fontSize: 16,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  shortcut: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.lineStrong,
    borderRadius: theme.radius.lg,
  },
  shortcutPressed: {
    backgroundColor: brand.paperDim,
  },
  shortcutLabel: {
    flexShrink: 1,
    color: brand.ink,
    fontSize: 14,
  },
});

export default OrientationScreen;
