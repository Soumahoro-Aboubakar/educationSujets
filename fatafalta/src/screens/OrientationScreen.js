import Pressable from '../components/ui/FeedbackPressable';
import StatusBar from '../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';

import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Download, UserRound } from 'lucide-react-native';
import Text from '../components/ui/Text';
import BrandMark from '../components/brand/BrandMark';
import OrientationArt, { OrientationBackdrop } from '../components/illustrations/OrientationArt';

import { PrepButton } from '../prep/ui/primitives';
import { CopyMargin } from '../prep/components/StudyPresentation';

// Filet aux couleurs nationales, discret rappel du contexte ivoirien.

/**
 * Premier écran vu par l'utilisateur : une seule promesse, une action principale
 * évidente, deux raccourcis. Le contenu défile avec le texte système.
 */
const OrientationScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { styles, FLAG } = useStyles();
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
        <BrandMark size={28} variant="onDark" />
        <Text variant="bodyMedium" style={styles.brandName}>Fatafalta</Text>
        <View style={styles.flag}>
          {FLAG.map((color) => <View key={color} style={[styles.flagBand, { backgroundColor: color }]} />)}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* L'illustration occupe l'espace libre : ni vide, ni rognage selon l'écran. */}
      <View style={styles.art}>
        <OrientationArt />
      </View>

      <View style={styles.hero}>
        <Text variant="h1" style={styles.heading} accessibilityRole="header">
          Les anciens sujets,{'\n'}à portée de main.
        </Text>
        <Text variant="body" style={styles.subtitle}>Concours et examens, avec leurs corrigés.</Text>
      </View>

      <View
        style={[styles.panel, { paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.sm }]}
      >
        <CopyMargin style={{ left: 12, top: 24, bottom: 24 }} />
        <PrepButton title="Explorer les sujets" icon={ChevronRight} onPress={openArchives} accessibilityLabel="Explorer les anciens sujets" />

        <View style={styles.shortcuts}>
          <Shortcut icon={Download} label="Téléchargements" onPress={openDownloads} />
          <Shortcut icon={UserRound} label="Mon espace" onPress={() => navigation.navigate('MainTabs', { screen: 'AccountTab' })} />
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const Shortcut = ({ icon: Icon, label, onPress }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
  >
    <Icon size={18} color={brand.ink} strokeWidth={1.9} />
    <Text variant="bodyMedium" style={styles.shortcutLabel}>{label}</Text>
  </Pressable>);
};

export default OrientationScreen;

const useStyles = createThemedStyles(({ countryFlag, brand, theme }) => {
  const FLAG = [countryFlag.orange, brand.onInk, countryFlag.green];

  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
      flex: 1,
      backgroundColor: brand.night,
    },
    scroll: { flexGrow: 1, justifyContent: 'flex-end' },
    art: {
      height: 240,
      marginVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.layout.gutter,
    },
    flag: {
      marginLeft: theme.spacing.xs,
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
      fontFamily: theme.fontFamily.bold,
      fontSize: 17,
      letterSpacing: -0.4,
    },
    hero: {
      paddingHorizontal: theme.layout.gutter,
      paddingBottom: theme.spacing.xl,
    },
    heading: {
      color: brand.onInk,
      fontFamily: theme.fontFamily.serif,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: theme.spacing.sm,
      color: brand.onInkSoft,
      fontSize: 15,
      lineHeight: 22,
    },
    panel: {
      paddingHorizontal: 32,
      paddingTop: 28,
      backgroundColor: brand.paper,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },

    shortcuts: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    shortcut: {
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
  return { FLAG, styles };
});
