import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Search,
  Sparkles,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import { useOrientationOptions } from '../hooks/useOrientationOptions';
import api from '../services/api';
import { usePreferences } from '../context/PreferencesContext';
import { useIsFocused } from '@react-navigation/native';
import cache from '../services/cache';
import theme from '../theme/tokens';

const SCREEN_CONFIG = {
  establishment: {
    title: "Choisir l'établissement",
    eyebrow: 'Personnalisation',
    subtitle: '',
    placeholder: 'Rechercher',
    empty: 'Aucun établissement avec des sujets disponibles.',
    optionKey: 'universities',
    icon: Building2,
  },
  contest: {
    title: "Choisir le concours",
    eyebrow: 'Sujets de concours',
    subtitle: '',
    placeholder: 'Rechercher',
    empty: 'Aucun concours avec des sujets disponibles.',
    optionKey: 'subjectContests',
    icon: FileText,
  },
  training: {
    title: "Choisir l'entraînement",
    eyebrow: 'Formation interactive',
    subtitle: '',
    placeholder: 'Rechercher',
    empty: 'Aucun entraînement interactif n’est disponible pour le moment.',
    optionKey: 'trainingContests',
    icon: ClipboardList,
  },
};

const compactOption = (option) => ({
  _id: option._id,
  name: option.name,
  abbreviation: option.abbreviation || '',
});

const SelectionScreen = ({ navigation, route }) => {
  const mode = route.name === 'EstablishmentSelection'
    ? 'establishment'
    : route.name === 'TrainingSelection' ? 'training' : 'contest';
  const config = SCREEN_CONFIG[mode];
  const Icon = config.icon;
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useOrientationOptions();
  const { updatePreferences } = usePreferences();
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isFocused = useIsFocused();
  const [localOptions, setLocalOptions] = useState(null);
  const mountedRef = useRef(true);

  const options = localOptions ?? (data?.[config.optionKey] ?? []);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => [option.name, option.abbreviation]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  }, [options, query]);

  const goToLibrary = () => {
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  // Load cached orientation options immediately and trigger a background refresh
  useEffect(() => {
    mountedRef.current = true;
    const loadAndRefresh = async () => {
      try {
        const raw = await cache.load('orientation-options');
        if (!mountedRef.current) return;
        if (raw && raw.payload && raw.payload[config.optionKey]) {
          setLocalOptions(raw.payload[config.optionKey]);
        }
      } catch (e) {
        // ignore cache errors
      }

      // trigger background refresh to get latest data
      try {
        refetch().catch(() => {});
      } catch (e) {
        // ignore
      }
    };

    loadAndRefresh();

    return () => { mountedRef.current = false; };
  }, [config.optionKey, refetch]);

  // If mode is 'contest', fetch contest types from API and show them instead
  useEffect(() => {
    let mounted = true;
    if (mode !== 'contest') return undefined;

    const loadContestTypes = async () => {
      try {
        const res = await api.get('/api/contest-types');
        if (!mounted) return;
        const items = res.data?.data || [];
      //  console.log('Loaded contest types from API', items);
        setLocalOptions(items);
      } catch (e) {
        // ignore — keep existing localOptions if any
      }
    };

    loadContestTypes();
    return () => { mounted = false; };
  }, [mode]);

  // Update displayed options only when screen is focused
  useEffect(() => {
    if (!isFocused) return;
    if (data && data[config.optionKey]) {
      setLocalOptions(data[config.optionKey]);
    }
  }, [isFocused, data, config.optionKey]);

  const handleSelect = async (option) => {
    if (isSaving) return;
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const selection = compactOption(option);
      if (mode === 'establishment') {
        await updatePreferences({
          establishment: selection,
          selectedContentType: 'subjects',
          hasCompletedOrientation: true,
        });
        goToLibrary();
      } else if (mode === 'contest') {
        // When selecting a contest in this mode, selection is actually a contest type
        // Navigate directly to the documents list for that contest type
        navigation.navigate('ContestDocuments', { contest: null, contestType: selection });
      } else {
        await updatePreferences({
          contest: selection,
          selectedContentType: 'training',
          hasCompletedOrientation: true,
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'TrainingSession', params: { contest: selection } }],
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updatePreferences({
        establishment: null,
        contest: null,
        selectedContentType: 'subjects',
        hasCompletedOrientation: true,
      });
      goToLibrary();
    } finally {
      setIsSaving(false);
    }
  };

  const renderOption = ({ item }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sélectionner ${item.name}`}
      onPress={() => handleSelect(item)}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <View style={styles.optionIcon}>
        <Icon size={21} color={theme.colors.primary} strokeWidth={2.15} />
      </View>
      <View style={styles.optionContent}>
        <Text variant="h3" style={styles.optionTitle}>{item.name}</Text>
        <Text variant="caption" color={theme.colors.textSecondary} style={styles.optionMeta}>
          {item.abbreviation || (mode === 'training' ? 'QCM et exercices disponibles' : 'Sujets disponibles')}
          {item.documentCount ? ` · ${item.documentCount} sujet${item.documentCount > 1 ? 's' : ''}` : ''}
          {item.questionCount ? ` · ${item.questionCount} question${item.questionCount > 1 ? 's' : ''}` : ''}
        </Text>
      </View>
      <View style={styles.optionChevron}>
        <ChevronRight size={18} color={theme.colors.primary} strokeWidth={2.4} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          onPress={() => navigation.goBack()}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={21} color={theme.colors.textPrimary} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.eyebrow}>
          <Sparkles size={13} color={theme.colors.primary} />
          <Text variant="overline" color={theme.colors.primaryDark}>{config.eyebrow}</Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text variant="h1" style={styles.title}>{config.title}</Text>
      </View>

      <View style={styles.searchBox}>
        <Search size={19} color={theme.colors.textMuted} strokeWidth={2.1} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={config.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          accessibilityLabel={config.placeholder}
        />
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" color={theme.colors.textSecondary} style={styles.stateText}>Recherche des contenus disponibles…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centerState}>
          <Text variant="h3">Impossible de charger la sélection</Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.stateText}>
            Vérifie ta connexion, puis réessaie.
          </Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text variant="bodyMedium" color={theme.colors.primary}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleOptions}
          renderItem={renderOption}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, visibleOptions.length === 0 && styles.emptyList]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Icon size={23} color={theme.colors.textMuted} /></View>
              <Text variant="h3" align="center">Pas encore de résultat</Text>
              <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.emptyText}>{config.empty}</Text>
            </View>
          }
        />
      )}

      {mode === 'establishment' && (
        <View style={[styles.skipArea, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <Pressable
            onPress={handleSkip}
            disabled={isSaving}
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipPressed]}
          >
            <Text variant="bodyMedium" color={theme.colors.textSecondary}>Ignorer pour le moment</Text>
            <ChevronRight size={17} color={theme.colors.textMuted} />
          </Pressable>
        </View>
      )} 
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFD' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
  },
  backButton: {
    width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  backPressed: { backgroundColor: theme.colors.primaryWash },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  intro: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing['2xl'], paddingBottom: theme.spacing.xl },
  title: { fontSize: 24, lineHeight: 30, letterSpacing: -0.6 },
  subtitle: { marginTop: theme.spacing.sm, maxWidth: 315 },
  searchBox: {
    height: 55, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.base, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderLight,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.045, shadowRadius: 14, elevation: 1,
  },
  searchInput: { flex: 1, height: '100%', fontFamily: theme.fontFamily.medium, fontSize: 15, color: theme.colors.textPrimary },
  listContent: { paddingHorizontal: theme.spacing.lg, paddingBottom: 112, gap: theme.spacing.sm },
  emptyList: { flexGrow: 1 },
  option: {
    minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md,
    borderRadius: 19, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  optionPressed: { backgroundColor: '#F7FAFF', borderColor: theme.colors.primary200, transform: [{ scale: 0.99 }] },
  optionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryWash },
  optionContent: { flex: 1, marginLeft: theme.spacing.md },
  optionTitle: { fontSize: 15.5, lineHeight: 20 },
  optionMeta: { marginTop: 2 },
  optionChevron: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing['3xl'] },
  stateText: { marginTop: theme.spacing.sm },
  retryButton: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primaryWash },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing['4xl'] },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised, marginBottom: theme.spacing.md },
  emptyText: { marginTop: theme.spacing.sm },
  skipArea: { borderTopWidth: 1, borderTopColor: theme.colors.borderLight, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  skipButton: { minHeight: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  skipPressed: { opacity: 0.65 },
});

export default SelectionScreen;
