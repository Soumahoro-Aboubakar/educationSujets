import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Award,
  BookOpenCheck,
  ChevronRight,
  FileDown,
  LogIn,
  Sparkles,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import theme from '../theme/tokens';

// ---------------------------------------------------------------------------
// Design tokens for this screen — a "concours officiel" identity: deep navy
// + academic gold, evoking an exam board's seal rather than a generic
// pastel card list. Kept local so the rest of the app's palette is untouched.
// ---------------------------------------------------------------------------
const INK = '#0F1B33';       // deep indigo-navy — hero, headline
const INK_SOFT = '#33456B';  // muted navy for secondary text on light bg
const GOLD = '#CC9A3C';      // academic gold — the one accent to spend boldness on
const GOLD_SOFT = '#F3E4C2';
const BURGUNDY = '#7A2E3B';  // second tag color, used sparingly for variety
const PAPER = '#F4F6FB';     // cool paper background, not cream
const CARD = '#FFFFFF';
const HAIRLINE = '#E4E8F1';

const OPTIONS = [
  {
    id: 'contest',
    tag: 'Archives',
    title: 'Anciens sujets et corrigés',
    description: 'Consulte les anciens sujets de concours et leurs corrigés pour mieux te préparer.',
    icon: FileDown,
    accent: BURGUNDY,
    route: 'ContestSelection',
  },
  {
    id: 'training',
    tag: 'Entraînement',
    title: 'Préparer un concours',
    description: 'Entraîne-toi avec des questions, exercices et tests chronométrés pour réussir.',
    icon: BookOpenCheck,
    accent: GOLD,
    route: 'TrainingSelection',
  },
];

const OrientationCard = ({ option, index, onPress, entrance }) => {
  const Icon = option.icon;
  const press = useRef(new Animated.Value(0)).current;

  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [22 + index * 10, 0],
  });
  const opacity = entrance.interpolate({
    inputRange: [0, 0.5 + index * 0.12, 1],
    outputRange: [0, 0, 1],
  });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });

  const onPressIn = () =>
    Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const onPressOut = () =>
    Animated.spring(press, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={option.title}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.card}
      >
        <View style={[styles.cardAccentBar, { backgroundColor: option.accent }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.iconWrap, { borderColor: `${option.accent}33`, backgroundColor: `${option.accent}14` }]}>
              <Icon size={22} color={option.accent} strokeWidth={2.1} />
            </View>
            <Text style={[styles.cardTag, { color: option.accent }]}>{option.tag.toUpperCase()}</Text>
          </View>

          <Text variant="h3" style={styles.cardTitle}>{option.title}</Text>
          <Text variant="body" color={INK_SOFT} style={styles.cardDescription}>
            {option.description}
          </Text>

          <View style={styles.cardFooterRow}>
            <Text style={[styles.cardCta, { color: option.accent }]}>Découvrir</Text>
            <View style={[styles.cardChevron, { backgroundColor: `${option.accent}14` }]}>
              <ChevronRight size={16} color={option.accent} strokeWidth={2.6} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const OrientationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;
  const seal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(seal, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 9 }),
      Animated.timing(entrance, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [entrance, seal]);

  const sealRotate = seal.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-8deg'] });
  const sealScale = seal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ---------------------------------------------------------------- */}
      {/* Hero — navy banner with the seal as the one signature element    */}
      {/* ---------------------------------------------------------------- */}
      <LinearGradient
        colors={[INK, '#182746']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 22 }]}
      >
        <View pointerEvents="none" style={styles.heroGlow} />

        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrow}>
            <Sparkles size={12} color={GOLD} strokeWidth={2.4} />
            <Text variant="overline" style={styles.eyebrowText}>Éducation CI</Text>
          </View>

          <Animated.View
            style={[
              styles.seal,
              { transform: [{ rotate: sealRotate }, { scale: sealScale }] },
            ]}
          >
            <Award size={20} color={GOLD} strokeWidth={2} />
          </Animated.View>
        </View>

        <Text variant="h1" style={styles.heading}>
          Que veux-tu{'\n'}faire aujourd’hui ?
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Choisis l’espace qui correspond à ton besoin. Tu pourras en changer à tout moment.
        </Text>

      </LinearGradient>

      {/* ---------------------------------------------------------------- */}
      {/* Cards — overlap the hero slightly for a layered, premium feel    */}
      {/* ---------------------------------------------------------------- */}
      <View style={[styles.options, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {OPTIONS.map((option, index) => (
          <OrientationCard
            key={option.id}
            option={option}
            index={index}
            entrance={entrance}
            onPress={() => navigation.navigate(option.route)}
          />
        ))}

        <Text variant="caption" color={INK_SOFT} style={styles.footer} align="center">
          Tu pourras modifier tes préférences à tout moment.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accéder à mon espace"
          onPress={() => navigation.navigate('Login')}
          style={styles.accountLink}
        >
          <LogIn size={17} color={INK} strokeWidth={2.2} />
          <Text variant="bodyMedium" style={styles.accountLinkText}>
            Accéder à mon espace
          </Text>
          <ChevronRight size={16} color={INK} strokeWidth={2.4} />
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: PAPER,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // --- Hero ---
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 56,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -90,
    top: -70,
    backgroundColor: 'rgba(204, 154, 60, 0.16)',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(204, 154, 60, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(204, 154, 60, 0.32)',
  },
  eyebrowText: {
    color: GOLD_SOFT,
    letterSpacing: 0.6,
  },
  seal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(204, 154, 60, 0.55)',
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    maxWidth: 300,
    color: 'rgba(255,255,255,0.66)',
    lineHeight: 20,
  },
  accountLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    backgroundColor: GOLD_SOFT,
    borderWidth: 1,
    borderColor: `${GOLD}66`,
  },
  accountLinkText: {
    color: INK,
    fontSize: 14,
  },

  // --- Cards ---
  options: {
    marginTop: -34,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: HAIRLINE,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 0,
    overflow: 'hidden',
  },
  cardAccentBar: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardTitle: {
    marginTop: theme.spacing.md,
    fontSize: 18,
    lineHeight: 23,
    color: INK,
    fontWeight: '700',
  },
  cardDescription: {
    marginTop: 4,
    lineHeight: 20,
    fontSize: 13.5,
  },
  cardFooterRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardCta: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    marginTop: theme.spacing.sm,
  },
});

export default OrientationScreen;