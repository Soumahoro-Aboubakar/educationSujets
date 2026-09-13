import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ArrowLeft, ChevronRight, Layers3 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import theme from '../theme/tokens';
import { fetchPublishedMatieres, fetchPublishedNoeuds } from '../services/catalog';

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
      setError('Impossible de charger le catalogue. Vérifiez votre connexion puis réessayez.');
      if (!append) setItems([]);
    } finally {
      if (currentRequest === requestId.current) setLoader(false);
    }
  }, [isMatterStep, leaf?._id, levels.length, organisme?._id, parcoursType?._id]);

  useEffect(() => {
    setPath([]);
  }, [organisme?._id, parcoursType?._id]);

  useEffect(() => {
    loadItems(1, false);
  }, [loadItems]);

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
  const emptyDescription = `Aucune ${String(currentLevel?.libellePluriel || 'entrée').toLocaleLowerCase()} avec des sujets publiés n’est disponible.`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Retour">
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="overline" color={theme.colors.primary}>{parcoursType?.nom || organisme?.nom || organisme?.name || 'Catalogue'}</Text>
          <Text variant="h1">{title}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : error ? (
        <EmptyState
          icon={Layers3}
          title="Catalogue indisponible"
          description={error}
          action={{ label: 'Réessayer', onPress: () => loadItems(1, false) }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text variant="caption" color={theme.colors.textSecondary}>
            Choisissez {String(currentLevel?.libelleSingulier || 'un élément').toLocaleLowerCase()}.
          </Text>
          {items.map((item) => (
            <Pressable
              key={item._id}
              onPress={() => selectItem(item)}
              accessibilityRole="button"
              accessibilityLabel={`Choisir ${labelOf(item)}`}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <View style={styles.icon}><Layers3 size={20} color={theme.colors.primary} /></View>
              <View style={styles.content}>
                <Text variant="h3">{labelOf(item)}</Text>
                {item.subjectCount ? (
                  <Text variant="caption" color={theme.colors.textSecondary}>
                    {item.subjectCount} sujet{item.subjectCount > 1 ? 's' : ''} publié{item.subjectCount > 1 ? 's' : ''}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={19} color={theme.colors.primary} />
            </Pressable>
          ))}
          {!items.length && (
            <EmptyState icon={Layers3} title="Aucun contenu disponible" description={emptyDescription} />
          )}
          {hasNextPage ? (
            <Button
              title="Charger plus"
              variant="secondary"
              onPress={() => loadItems(page + 1, true)}
              loading={loadingMore}
            />
          ) : null}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFD', paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  titleWrap: { flex: 1, marginLeft: theme.spacing.md },
  list: { flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.md },
  option: { minHeight: 72, padding: theme.spacing.md, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.75 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary100 },
  content: { flex: 1, marginLeft: theme.spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default DynamicCatalogScreen;
