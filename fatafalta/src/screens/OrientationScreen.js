import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpenCheck,
  ChevronRight,
  FileDown,
  GraduationCap,
  Sparkles,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import theme from '../theme/tokens';

const OPTIONS = [
  {
    id: 'student',
    title: 'Je suis étudiant',
    description: 'Retrouver mes sujets d’examens, devoirs et documents d’études.',
    icon: GraduationCap,
    tone: 'blue',
    route: 'EstablishmentSelection',
  },
  {
    id: 'contest',
    title: 'Je prépare un concours',
    description: 'Consulter et télécharger des sujets de concours pour m’entraîner.',
    icon: FileDown,
    tone: 'indigo',
    route: 'ContestSelection',
  },
  {
    id: 'training',
    title: 'Je veux me former',
    description: 'M’entraîner avec des questions, exercices et tests sur l’application.',
    icon: BookOpenCheck,
    tone: 'sky',
    route: 'TrainingSelection',
  },
];

const OrientationCard = ({ option, index, onPress, entrance }) => {
  const Icon = option.icon;
  const translateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [18 + index * 8, 0],
  });
  const opacity = entrance.interpolate({
    inputRange: [0, 0.55 + index * 0.1, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={option.title}
        onPress={onPress}
        style={({ pressed }) => [styles.card, styles[`card${option.tone}`], pressed && styles.cardPressed]}
      >
        <View style={[styles.iconWrap, styles[`icon${option.tone}`]]}>
          <Icon size={23} color={theme.colors.primary} strokeWidth={2.1} />
        </View>
        <View style={styles.cardChevron}>
          <ChevronRight size={18} color={theme.colors.primary} strokeWidth={2.4} />
        </View>
        <View style={styles.cardCopy}>
          <Text variant="h3" style={styles.cardTitle}>{option.title}</Text>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.cardDescription}>
            {option.description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const OrientationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 560,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 30, paddingBottom: Math.max(insets.bottom, 18) }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.backgroundGlowTop} />
      <View pointerEvents="none" style={styles.backgroundGlowBottom} />

      <View style={styles.hero}>
        <View style={styles.eyebrow}>
          <Sparkles size={13} color={theme.colors.primary} strokeWidth={2.4} />
          <Text variant="overline" color={theme.colors.primaryDark}>Éducation CI</Text>
        </View>
        <Text variant="h1" style={styles.heading}>Que veux-tu faire ?</Text>
        <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
          Choisis l’espace qui correspond à ton besoin.
        </Text>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option, index) => (
          <OrientationCard
            key={option.id}
            option={option}
            index={index}
            entrance={entrance}
            onPress={() => navigation.navigate(option.route)}
          />
        ))}
      </View>

      <Text variant="caption" color={theme.colors.textMuted} style={styles.footer} align="center">
        Tu pourras modifier tes préférences à tout moment.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#F8FAFD',
    overflow: 'hidden',
  },
  backgroundGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    right: -165,
    top: -95,
    backgroundColor: 'rgba(191, 219, 254, 0.36)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    left: -175,
    bottom: 35,
    backgroundColor: 'rgba(224, 231, 255, 0.44)',
  },
  hero: {
    zIndex: 1,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(239, 246, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(191, 219, 254, 0.76)',
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.15,
  },
  subtitle: {
    marginTop: theme.spacing.sm,
    maxWidth: 285,
  },
  options: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.md,
    minHeight: 455,
    zIndex: 1,
  },
  card: {
    minHeight: 141,
    padding: theme.spacing.lg,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.82)',
    overflow: 'hidden',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.065,
    shadowRadius: 22,
    elevation: -3,
  },
  cardblue: { borderColor: 'rgba(191, 219, 254, 0.86)' },
  cardindigo: { borderColor: 'rgba(224, 231, 255, 0.92)' },
  cardsky: { borderColor: 'rgba(186, 230, 253, 0.86)' },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  iconWrap: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconblue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  iconindigo: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  iconsky: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
  },
  cardChevron: {
    position: 'absolute',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardCopy: {
    marginTop: theme.spacing.md,
    paddingRight: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 23,
  },
  cardDescription: {
    marginTop: 4,
    lineHeight: 20,
    fontSize: 13.5,
  },
  footer: {
    zIndex: 1,
    marginTop: theme.spacing.md,
  },
});

export default OrientationScreen;
