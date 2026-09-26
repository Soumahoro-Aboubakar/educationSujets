import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowUpRight, Layers3 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import theme from '../theme/tokens';
import { fetchPublishedMatieres, fetchPublishedNoeuds } from '../services/catalog';

const NAVY = '#0D1B32';
const NAVY_SOFT = '#4F5E72';
const SURFACE = '#FCFAF5';
const GOLD = '#B48A48';
const BURGUNDY = '#6C2838';
const LINE = '#DED8CC';

const labelOf = (item) => item?.nom || item?.name || '';

const DynamicCatalogScreen = ({ navigation, route }) => {
  const organisme = route.params?.organisme || null;
  const parcoursType = route.params?.parcoursType || null;
  const levels = organisme?.structure?.niveaux || [];
  const [path, setPath] = useState([]);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const insets = useSafeAreaInsets();

  const leaf = path.at(-1) || null;
  const isMatterStep = path.length === levels.length;
  const currentLevel = isMatterStep
    ? { libelleSingulier: 'Matière', libellePluriel: 'Matières' }
    : levels[path.length];

  const loadItems = useCallback(async (requestedPage = 1, append = false) => {
    if (!organisme?._id || !levels.length) {
      setItems([]);
      setLoading(false);
      setError('La structure de cet organisme est indisponible.');
      return;
    }

    const currentRequest = ++requestId.current;
    const setLoader = append ? setLoadingMore : setLoading;
    setLoader(true);
    setError('');
    try {
      const result = isMatterStep
        ? await fetchPublishedMatieres({
          organismeId: organisme._id,
          parcoursTypeId: parcoursType?._id,
          noeudId: leaf?._id,
          page: requestedPage,
          limit: 50,
        })
        : await fetchPublishedNoeuds({
          organismeId: organisme._id,
          parcoursTypeId: parcoursType?._id,
          parentId: leaf?._id || 'root',
          page: requestedPage,
          limit: 50,
        });

      if (currentRequest !== requestId.current) return;
      setItems((current) => append ? [...current, ...result.data] : result.data);
      setPage(requestedPage);
      setHasNextPage(Boolean(result.pagination?.pages > requestedPage));
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError('Impossible de charger le catalogue. Vérifie ta connexion puis réessaie.');
      if (!append) setItems([]);
    } finally {
      if (currentRequest === requestId.current) setLoader(false);
    }
  }, [isMatterStep, leaf?._id, levels.length, organisme?._id, parcoursType?._id]);

  useEffect(() => {
    setPath([]);
  }, [organisme?._id, parcoursType?._id]);

  useFocusEffect(
    useCallback(() => {
      loadItems(1, false);
      return undefined;
    }, [loadItems])
  );

  const selectItem = (item) => {
    if (isMatterStep) {
      navigation.navigate('ContestDocuments', {
        organisme,
        parcoursType,
        noeud: leaf,
        matiere: item,
        taxonomyPath: path,
      });
      return;
    }
    setPath((current) => [...current, item]);
  };

  const goBack = () => {
    if (path.length) {
      setPath((current) => current.slice(0, -1));
      return;
    }
    navigation.goBack();
  };

  const title = useMemo(() => {
    if (isMatterStep) return currentLevel.libellePluriel;
    return labelOf(path.at(-1)) || organisme?.nom || organisme?.name || 'Catalogue';
  }, [currentLevel?.libellePluriel, isMatterStep, organisme?.name, organisme?.nom, path]);
  const sourceName = parcoursType?.nom || organisme?.nom || organisme?.name || 'Catalogue';
  const breadcrumb = path.map(labelOf).filter(Boolean).join('  /  ');
  const emptyDescription = `Aucune ${String(currentLevel?.libellePluriel || 'entrée').toLocaleLowerCase()} avec des sujets publiés n’est disponible.`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.hero, { paddingTop: insets.top + theme.spacing.base }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={theme.hitSlop}
          >
            <ArrowLeft size={21} color="#FFFFFF" strokeWidth={1.9} />
          </Pressable>

          <View style={styles.brandLockup}>
            <View style={styles.brandRule} />
            <Text variant="overline" style={styles.brandName}>Éducation CI</Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text variant="overline" style={styles.sourceName} numberOfLines={1}>{sourceName}</Text>
          <Text variant="h1" style={styles.heading} numberOfLines={2}>{title}</Text>
          <Text variant="body" style={styles.introduction}>
            Choisis {String(currentLevel?.libelleSingulier || 'un élément').toLocaleLowerCase()} pour poursuivre.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={BURGUNDY} />
          <Text variant="caption" style={styles.stateText}>Mise à jour du catalogue…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Layers3 size={31} color={BURGUNDY} strokeWidth={1.45} />
          <Text variant="h3" style={styles.stateTitle}>Catalogue indisponible</Text>
          <Text variant="body" style={styles.stateText} align="center">{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réessayer"
            onPress={() => loadItems(1, false)}
            style={styles.retryButton}
          >
            <Text variant="bodyMedium" style={styles.retryLabel}>Réessayer</Text>
            <ArrowUpRight size={16} color={BURGUNDY} strokeWidth={1.9} />
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {breadcrumb ? (
            <View style={styles.breadcrumb}>
              <Text variant="caption" style={styles.breadcrumbLabel} numberOfLines={1}>{breadcrumb}</Text>
            </View>
          ) : null}

          {items.length ? (
            <>
              <View style={styles.listHeader}>
                <Text variant="overline" style={styles.listEyebrow}>{currentLevel?.libellePluriel || 'Sélection disponible'}</Text>
                <View style={styles.listRule} />
              </View>

              {items.map((item, index) => (
                <Pressable
                  key={item._id}
                  onPress={() => selectItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choisir ${labelOf(item)}`}
                  android_ripple={{ color: 'rgba(13, 27, 50, 0.05)' }}
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                >
                  <Text style={styles.optionIndex}>{String(index + 1).padStart(2, '0')}</Text>
                  <View style={styles.optionContent}>
                    <Text variant="h3" style={styles.optionTitle}>{labelOf(item)}</Text>
                    {item.subjectCount ? (
                      <Text variant="caption" style={styles.optionMeta}>
                        {item.subjectCount} sujet{item.subjectCount > 1 ? 's' : ''} publié{item.subjectCount > 1 ? 's' : ''}
                      </Text>
                    ) : (
                      <Text variant="caption" style={styles.optionMeta}>{currentLevel?.libelleSingulier || 'Élément'} disponible</Text>
                    )}
                  </View>
                  <ArrowUpRight size={19} color={BURGUNDY} strokeWidth={1.75} />
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Layers3 size={31} color={BURGUNDY} strokeWidth={1.45} />
              <Text variant="h3" style={styles.stateTitle} align="center">Aucun contenu disponible</Text>
              <Text variant="body" style={styles.stateText} align="center">{emptyDescription}</Text>
            </View>
          )}

          {hasNextPage ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Charger plus"
              disabled={loadingMore}
              onPress={() => loadItems(page + 1, true)}
              style={({ pressed }) => [styles.loadMore, pressed && styles.loadMorePressed]}
            >
              {loadingMore ? <ActivityIndicator size="small" color={BURGUNDY} /> : null}
              <Text variant="bodyMedium" style={styles.loadMoreLabel}>Charger plus</Text>
              <ArrowUpRight size={16} color={BURGUNDY} strokeWidth={1.9} />
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  backPressed: {
    opacity: 0.62,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandRule: {
    width: 18,
    height: 2,
    backgroundColor: GOLD,
  },
  brandName: {
    color: '#F4E6C8',
    fontSize: 10,
    letterSpacing: 1.25,
  },
  heroCopy: {
    marginTop: theme.spacing.xl,
  },
  sourceName: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  heading: {
    marginTop: theme.spacing.sm,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  introduction: {
    maxWidth: 320,
    marginTop: theme.spacing.sm,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  breadcrumb: {
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  breadcrumbLabel: {
    color: NAVY_SOFT,
    fontSize: 12,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  listEyebrow: {
    color: NAVY_SOFT,
    fontSize: 10,
    letterSpacing: 1.05,
    textTransform: 'uppercase',
  },
  listRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
  },
  option: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  optionPressed: {
    backgroundColor: 'rgba(13, 27, 50, 0.035)',
  },
  optionIndex: {
    width: 34,
    color: BURGUNDY,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 1.05,
  },
  optionContent: {
    flex: 1,
    paddingRight: theme.spacing.base,
  },
  optionTitle: {
    color: NAVY,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 21,
  },
  optionMeta: {
    marginTop: 3,
    color: NAVY_SOFT,
    fontSize: 12,
    lineHeight: 17,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['3xl'],
    backgroundColor: SURFACE,
  },
  emptyState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  stateTitle: {
    marginTop: theme.spacing.base,
    color: NAVY,
    textAlign: 'center',
  },
  stateText: {
    marginTop: theme.spacing.sm,
    color: NAVY_SOFT,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.lg,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BURGUNDY,
  },
  retryLabel: {
    color: BURGUNDY,
    fontSize: 14,
  },
  loadMore: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: theme.spacing.xl,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BURGUNDY,
  },
  loadMorePressed: {
    opacity: 0.62,
  },
  loadMoreLabel: {
    color: BURGUNDY,
    fontSize: 14,
  },
});

export default DynamicCatalogScreen;
