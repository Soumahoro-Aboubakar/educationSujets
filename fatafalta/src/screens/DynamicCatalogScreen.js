import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Layers3 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import ListRow from '../components/ui/ListRow';
import StateView from '../components/ui/StateView';
import { SkeletonRows } from '../components/ui/Skeleton';
import theme from '../theme/tokens';
import { fetchPublishedMatieres, fetchPublishedNoeuds } from '../services/catalog';

const { brand } = theme;

const labelOf = (item) => item?.nom || item?.name || '';
const MATTER_LEVEL = { libelleSingulier: 'Matière', libellePluriel: 'Matières' };

const DynamicCatalogScreen = ({ navigation, route }) => {
  const organisme = route.params?.organisme || null;
  const parcoursType = route.params?.parcoursType || null;
  const levels = organisme?.structure?.niveaux || [];
  const [path, setPath] = useState([]);
  const [items, setItems] = useState([]);
  // Niveau auquel appartiennent `items` : évite d'afficher, pendant une image,
  // le contenu du niveau précédent lors d'un changement de niveau.
  const [itemsKey, setItemsKey] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  // Chaque niveau déjà visité est conservé : remonter d'un cran est instantané.
  const levelCache = useRef(new Map());
  const direction = useRef('forward');
  const insets = useSafeAreaInsets();

  const leaf = path.at(-1) || null;
  const isMatterStep = path.length === levels.length;
  const currentLevel = isMatterStep ? MATTER_LEVEL : levels[path.length];
  const levelKey = `${parcoursType?._id || 'all'}:${leaf?._id || 'root'}:${isMatterStep ? 'm' : 'n'}`;

  const loadItems = useCallback(async (requestedPage = 1, append = false) => {
    if (!organisme?._id || !levels.length) {
      setItems([]);
      setItemsKey(levelKey);
      setLoading(false);
      setError('La structure de cet organisme est indisponible.');
      return;
    }

    const currentRequest = ++requestId.current;
    const cached = !append && levelCache.current.get(levelKey);
    if (append) setLoadingMore(true);
    else if (cached) {
      // Affichage immédiat du niveau connu, rafraîchi silencieusement.
      setItems(cached.items);
      setItemsKey(levelKey);
      setPage(cached.page);
      setHasNextPage(cached.hasNextPage);
      setLoading(false);
    } else setLoading(true);
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
      const nextHasPage = Boolean(result.pagination?.pages > requestedPage);
      setItems((current) => {
        const nextItems = append ? [...current, ...result.data] : result.data;
        levelCache.current.set(levelKey, { items: nextItems, page: requestedPage, hasNextPage: nextHasPage });
        return nextItems;
      });
      setItemsKey(levelKey);
      setPage(requestedPage);
      setHasNextPage(nextHasPage);
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      // Une erreur de rafraîchissement ne masque pas un niveau déjà affiché.
      if (!cached || append) setError('Le catalogue n’a pas pu être chargé. Vérifie ta connexion puis réessaie.');
      if (!append && !cached) {
        setItems([]);
        setItemsKey(levelKey);
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [isMatterStep, leaf?._id, levelKey, levels.length, organisme?._id, parcoursType?._id]);

  useEffect(() => {
    levelCache.current.clear();
    setPath([]);
  }, [organisme?._id, parcoursType?._id]);

  useFocusEffect(
    useCallback(() => {
      loadItems(1, false);
      return undefined;
    }, [loadItems])
  );

  const goToDepth = useCallback((depth) => {
    direction.current = 'back';
    setPath((current) => current.slice(0, depth));
  }, []);

  // Le retour matériel Android remonte d'un niveau dans le catalogue
  // avant de quitter l'écran, comme le bouton retour de l'en-tête.
  useFocusEffect(
    useCallback(() => {
      if (!path.length) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToDepth(path.length - 1);
        return true;
      });
      return () => subscription.remove();
    }, [goToDepth, path.length])
  );

  // Le geste de retour iOS quitterait tout le catalogue : désactivé en profondeur.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: path.length === 0 });
  }, [navigation, path.length]);

  const selectItem = (item) => {
    Haptics.selectionAsync().catch(() => {});
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
    direction.current = 'forward';
    setPath((current) => [...current, item]);
  };

  const goBack = () => {
    if (path.length) {
      goToDepth(path.length - 1);
      return;
    }
    navigation.goBack();
  };

  const sourceName = [organisme?.nom || organisme?.name, parcoursType?.nom]
    .filter(Boolean)
    .join(' · ');
  const totalSteps = levels.length + 1;
  const emptyDescription = useMemo(
    () => `Aucune ${String(currentLevel?.libelleSingulier || 'entrée').toLocaleLowerCase()} n’a encore de sujets publiés ici.`,
    [currentLevel?.libelleSingulier]
  );

  const entering = (direction.current === 'back' ? FadeInLeft : FadeInRight).duration(220);

  const renderContent = () => {
    if (loading || itemsKey !== levelKey) return <SkeletonRows count={5} />;
    if (error && !items.length) {
      return (
        <StateView
          icon={Layers3}
          title="Connexion impossible"
          description={error}
          onRetry={() => loadItems(1, false)}
        />
      );
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) },
          !items.length && styles.listEmpty,
        ]}
        ListHeaderComponent={items.length ? (
          <Text variant="overline" style={styles.count}>
            {items.length}{hasNextPage ? '+' : ''} {String(items.length > 1 ? currentLevel?.libellePluriel : currentLevel?.libelleSingulier).toLocaleLowerCase()}
          </Text>
        ) : null}
        renderItem={({ item, index }) => (
          <ListRow
            title={labelOf(item)}
            meta={item.subjectCount
              ? `${item.subjectCount} sujet${item.subjectCount > 1 ? 's' : ''}`
              : null}
            isLast={index === items.length - 1 && !hasNextPage}
            onPress={() => selectItem(item)}
          />
        )}
        ListEmptyComponent={(
          <StateView icon={Layers3} title="Rien pour le moment" description={emptyDescription} />
        )}
        onEndReached={hasNextPage && !loadingMore ? () => loadItems(page + 1, true) : null}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color={brand.inkMuted} style={styles.footerLoader} />
        ) : null}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={goBack}
        eyebrow={sourceName}
        title={currentLevel?.libellePluriel || 'Catalogue'}
      >
        <View style={styles.steps} accessibilityLabel={`Étape ${path.length + 1} sur ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <View key={index} style={[styles.step, index <= path.length && styles.stepDone]} />
          ))}
        </View>
        {path.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trail}
            contentContainerStyle={styles.trailContent}
          >
            <TrailItem first label="Début" onPress={() => goToDepth(0)} />
            {path.map((item, index) => (
              <TrailItem
                key={item._id}
                label={labelOf(item)}
                current={index === path.length - 1}
                onPress={() => goToDepth(index + 1)}
              />
            ))}
          </ScrollView>
        ) : null}
      </ScreenHeader>

      <Animated.View key={levelKey} entering={entering} style={styles.body}>
        {renderContent()}
      </Animated.View>
    </View>
  );
};

// Segment du fil d'Ariane : appuyer dessus remonte directement à ce niveau.
const TrailItem = ({ label, first, current, onPress }) => (
  <View style={styles.trailItem}>
    {!first ? <ChevronRight size={13} color={brand.onInkSoft} strokeWidth={2} /> : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Revenir à ${label}`}
      disabled={current}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      onPress={onPress}
    >
      <Text variant="caption" style={[styles.trailLabel, current && styles.trailLabelCurrent]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  body: {
    flex: 1,
  },
  steps: {
    flexDirection: 'row',
    gap: 4,
    marginTop: theme.spacing.base,
  },
  step: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  stepDone: {
    backgroundColor: brand.onInkAccent,
  },
  trail: {
    marginTop: theme.spacing.md,
    marginHorizontal: -theme.layout.gutter,
  },
  trailContent: {
    paddingHorizontal: theme.layout.gutter,
    alignItems: 'center',
  },
  trailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  trailLabel: {
    maxWidth: 180,
    color: brand.onInkSoft,
    fontSize: 13,
  },
  trailLabelCurrent: {
    color: brand.onInk,
  },
  list: {
    flexGrow: 1,
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
  footerLoader: {
    paddingVertical: theme.spacing.xl,
  },
});

export default DynamicCatalogScreen;
