import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Building2, ClipboardList, FileText, SearchX } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import ListRow from '../components/ui/ListRow';
import SearchField from '../components/ui/SearchField';
import StateView from '../components/ui/StateView';
import { SkeletonRows } from '../components/ui/Skeleton';
import { useOrientationOptions } from '../hooks/useOrientationOptions';
import { fetchPublishedOrganismes } from '../services/catalog';
import { usePreferences } from '../context/PreferencesContext';
import cache from '../services/cache';
import theme from '../theme/tokens';

const { brand } = theme;

// La recherche n'apparaît que lorsque la liste est assez longue pour la justifier.
const SEARCH_THRESHOLD = 6;

const CONFIG = {
  establishment: {
    title: 'Ton établissement',
    eyebrow: 'Personnalisation',
    subtitle: 'Pour te montrer les ressources qui te correspondent.',
    empty: 'Aucun établissement avec des sujets disponibles.',
    noun: ['établissement', 'établissements'],
    key: 'universities',
    icon: Building2,
  },
  contest: {
    title: 'Choisis un organisme',
    eyebrow: 'Anciens sujets',
    subtitle: 'L’organisme qui a organisé le concours ou l’examen.',
    empty: 'Aucun organisme avec des sujets publiés n’est disponible.',
    noun: ['organisme', 'organismes'],
    key: null,
    icon: FileText,
  },
  training: {
    title: 'Choisis un entraînement',
    eyebrow: 'Formation interactive',
    subtitle: 'Le concours sur lequel tu souhaites t’entraîner.',
    empty: 'Aucun entraînement interactif n’est disponible pour le moment.',
    noun: ['concours', 'concours'],
    key: 'trainingContests',
    icon: ClipboardList,
  },
};

const compact = (option) => ({
  _id: option._id,
  name: option.name || option.nom,
  abbreviation: option.abbreviation || '',
});

const plural = (count, [singular, pluralForm]) => `${count} ${count > 1 ? pluralForm : singular}`;

const SelectionScreen = ({ navigation, route }) => {
  const mode = route.name === 'EstablishmentSelection'
    ? 'establishment'
    : route.name === 'TrainingSelection' ? 'training' : 'contest';
  const config = CONFIG[mode];
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useOrientationOptions();
  const { updatePreferences } = usePreferences();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const mounted = useRef(true);
  const catalogMode = mode === 'contest' || mode === 'establishment';

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(false);
    try {
      const result = await fetchPublishedOrganismes({ limit: 100 });
      if (mounted.current) setCatalog(result.data);
    } catch (error) {
      if (mounted.current) setCatalogError(true);
    } finally {
      if (mounted.current) setCatalogLoading(false);
    }
  }, []);

  const options = catalogMode ? (catalog ?? []) : (local ?? (data?.[config.key] ?? []));

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return options;
    return options.filter((option) => [option.name, option.nom, option.abbreviation]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase().includes(normalized)));
  }, [options, query]);

  useEffect(() => {
    mounted.current = true;
    if (catalogMode) return () => { mounted.current = false; };

    (async () => {
      try {
        const raw = await cache.load('orientation-options');
        if (mounted.current && raw?.payload?.[config.key]) setLocal(raw.payload[config.key]);
      } catch (error) {
        // Le cache est facultatif : la requête réseau prend le relais.
      }
      refetch().catch(() => {});
    })();

    return () => { mounted.current = false; };
  }, [catalogMode, config.key, refetch]);

  // Rafraîchit au retour sur l'écran ; la liste déjà affichée reste visible.
  useFocusEffect(useCallback(() => {
    if (catalogMode) loadCatalog();
    return undefined;
  }, [catalogMode, loadCatalog]));

  const select = async (item) => {
    if (saving) return;
    setSaving(true);
    Haptics.selectionAsync().catch(() => {});
    try {
      const selection = compact(item);
      if (catalogMode) {
        if (mode === 'establishment') {
          updatePreferences({
            establishment: selection,
            selectedContentType: 'subjects',
            hasCompletedOrientation: true,
          }).catch(() => {});
        }
        navigation.navigate('ParcoursTypeSelection', { organisme: item });
      } else {
        await updatePreferences({
          contest: selection,
          selectedContentType: 'training',
          hasCompletedOrientation: true,
        });
        navigation.reset({ index: 0, routes: [{ name: 'TrainingSession', params: { contest: selection } }] });
      }
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updatePreferences({
        establishment: null,
        contest: null,
        selectedContentType: 'subjects',
        hasCompletedOrientation: true,
      });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } finally {
      setSaving(false);
    }
  };

  const hasData = catalogMode ? catalog !== null : options.length > 0;
  const loading = (catalogMode ? catalogLoading : isLoading) && !hasData;
  const error = (catalogMode ? catalogError : isError) && !options.length;
  const retry = catalogMode ? loadCatalog : refetch;
  const showSearch = options.length > SEARCH_THRESHOLD || Boolean(query);

  const describe = (item) => {
    const parts = [];
    if (item.abbreviation && item.abbreviation !== item.name) parts.push(item.abbreviation);
    if (item.subjectCount) parts.push(plural(item.subjectCount, ['sujet', 'sujets']));
    if (!parts.length) parts.push(mode === 'training' ? 'QCM et exercices' : 'Sujets publiés');
    return parts.join(' · ');
  };

  const renderContent = () => {
    if (loading) return <SkeletonRows count={6} />;
    if (error) {
      return (
        <StateView
          icon={config.icon}
          title="Connexion impossible"
          description="Vérifie ta connexion Internet puis réessaie."
          onRetry={retry}
        />
      );
    }

    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.list,
          mode === 'establishment' && styles.listWithFooter,
          !visible.length && styles.listEmpty,
        ]}
        ListHeaderComponent={visible.length ? (
          <Text variant="overline" style={styles.count}>
            {plural(visible.length, config.noun)}
          </Text>
        ) : null}
        renderItem={({ item, index }) => (
          <ListRow
            title={item.name || item.nom}
            meta={describe(item)}
            disabled={saving}
            isLast={index === visible.length - 1}
            onPress={() => select(item)}
          />
        )}
        ListEmptyComponent={query ? (
          <StateView
            icon={SearchX}
            title="Aucun résultat"
            description={`Rien ne correspond à « ${query.trim()} ». Vérifie l’orthographe ou essaie un sigle.`}
          />
        ) : (
          <StateView icon={config.icon} title="Rien pour le moment" description={config.empty} />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        eyebrow={config.eyebrow}
        title={config.title}
        subtitle={config.subtitle}
      />

      {showSearch ? (
        <View style={styles.searchBar}>
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={`Rechercher un ${config.noun[0]} ou un sigle`}
          />
        </View>
      ) : null}

      <View style={styles.body}>{renderContent()}</View>

      {mode === 'establishment' ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={skip}
            style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
          >
            <Text variant="bodyMedium" style={styles.skipLabel}>Ignorer pour le moment</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  searchBar: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.base,
  },
  body: {
    flex: 1,
  },
  list: {
    paddingBottom: theme.spacing['2xl'],
  },
  listWithFooter: {
    paddingBottom: 96,
  },
  listEmpty: {
    flexGrow: 1,
  },
  count: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    color: brand.inkSoft,
  },
  footer: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.sm,
    backgroundColor: brand.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  skip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
  },
  skipPressed: {
    backgroundColor: brand.pressed,
  },
  skipLabel: {
    color: brand.inkSoft,
    fontSize: 15,
  },
});

export default SelectionScreen;
