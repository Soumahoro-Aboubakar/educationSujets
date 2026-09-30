import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, SearchX } from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import SearchField from '../components/ui/SearchField';
import StateView from '../components/ui/StateView';
import DocumentList from '../components/documents/DocumentList';
import api from '../services/api';
import theme from '../theme/tokens';

const { brand } = theme;

const PAGE_SIZE = 12;
const labelOf = (item) => item?.nom || item?.name || '';

const ContestDocumentsScreen = ({ navigation, route }) => {
  const { contestType, catalogNode, institution, organisme, parcoursType, noeud, matiere, taxonomyPath } = route.params || {};
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const page = useRef(1);
  const next = useRef(false);
  const more = useRef(false);
  const hasLoaded = useRef(false);
  const dynamic = Boolean(noeud?._id && matiere?._id);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * mode :
   *  - 'initial' : premier chargement, squelette affiché
   *  - 'replace' : recherche / tirer-pour-rafraîchir, la liste reste visible
   *  - 'silent'  : rafraîchissement au retour sur l'écran, sans indicateur
   *  - 'append'  : page suivante
   */
  const load = useCallback(async (requestedPage = 1, mode = 'replace', search = debounced) => {
    const append = mode === 'append';
    if (append && (more.current || !next.current)) return;

    let id = request.current;
    if (append) {
      more.current = true;
      setLoadingMore(true);
    } else {
      id = ++request.current;
      if (mode !== 'silent') setLoading(true);
    }

    try {
      setError('');
      const params = { limit: PAGE_SIZE, page: requestedPage };
      if (dynamic) {
        params.noeudId = String(noeud._id);
        params.matiereId = String(matiere._id);
        if (parcoursType?._id) params.parcoursTypeId = String(parcoursType._id);
        params.type = 'sujet';
        if (search) params.recherche = search;
      } else {
        if (contestType?._id) params.contestType = String(contestType._id);
        if (catalogNode?._id) params.node = String(catalogNode._id);
        if (institution?._id) params.institution = String(institution._id);
        if (search) params.search = search;
      }

      const response = await api.get('/api/documents', { params });
      if (id !== request.current) return;

      const list = response.data.data || [];
      setDocuments((current) => (append ? [...current, ...list] : list));
      const pagination = response.data.pagination || response.data.meta?.pagination;
      const exists = pagination ? Number(pagination.pages) > requestedPage : list.length === params.limit;
      setTotal(pagination?.total ?? null);
      page.current = requestedPage;
      next.current = exists;
      setHasNext(exists);
      hasLoaded.current = true;
    } catch (requestError) {
      if (id === request.current && mode !== 'silent') setError('Les sujets n’ont pas pu être chargés. Vérifie ta connexion puis réessaie.');
    } finally {
      if (id === request.current) {
        setLoading(false);
        setRefreshing(false);
        more.current = false;
        setLoadingMore(false);
      }
    }
  }, [catalogNode?._id, contestType?._id, debounced, dynamic, institution?._id, matiere?._id, noeud?._id, parcoursType?._id]);

  // Premier chargement et nouvelle recherche.
  useEffect(() => {
    load(1, hasLoaded.current ? 'replace' : 'initial', debounced);
  }, [load]);

  // Au retour d'un sujet, la liste et la position de défilement sont conservées.
  // On ne rafraîchit silencieusement que si l'on est resté sur la première page
  // (cas d'un sujet supprimé par un administrateur depuis le détail).
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) {
      firstFocus.current = false;
      return undefined;
    }
    if (page.current === 1 && hasLoaded.current) load(1, 'silent', debounced);
    return undefined;
  }, [debounced, load]));

  const refresh = () => {
    setRefreshing(true);
    load(1, 'replace', debounced);
  };

  const openDocument = (document) => navigation.navigate('DocumentDetail', {
    documentId: document._id,
    document,
    context: {
      organisme: organisme ? { _id: organisme._id, nom: labelOf(organisme), structure: organisme.structure } : null,
      parcoursType: parcoursType ? { _id: parcoursType._id, nom: labelOf(parcoursType) } : null,
      matiere: matiere ? { _id: matiere._id, nom: labelOf(matiere) } : null,
      path: (taxonomyPath || []).map((item) => ({ _id: item._id, nom: labelOf(item) })),
    },
  });

  const title = labelOf(matiere) || catalogNode?.name || contestType?.name || 'Sujets';
  const eyebrow = [labelOf(organisme), labelOf(parcoursType)].filter(Boolean).join(' · ') || 'Anciens sujets';
  const pathLabel = (taxonomyPath || []).map(labelOf).filter(Boolean).join(' › ');
  const searching = Boolean(debounced);
  const isInitial = loading && !documents.length;
  const count = total ?? documents.length;

  const listHeader = !isInitial && documents.length ? (
    <Text variant="overline" style={styles.count}>
      {searching
        ? `${count} résultat${count > 1 ? 's' : ''}`
        : `${count} sujet${count > 1 ? 's' : ''}`}
    </Text>
  ) : null;

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow={eyebrow}
        title={title}
        subtitle={pathLabel || null}
      />

      <View style={styles.searchBar}>
        <SearchField
          value={query}
          onChangeText={setQuery}
          busy={loading && !isInitial && !refreshing}
          placeholder="Rechercher par titre ou année"
        />
      </View>

      <View style={styles.body}>
        {error && !documents.length && !loading ? (
          <StateView icon={FileText} title="Connexion impossible" description={error} onRetry={refresh} />
        ) : (
          <DocumentList
            documents={documents}
            isLoading={loading}
            dimmed={loading && !isInitial && !refreshing}
            isFetchingNextPage={loadingMore}
            onRefresh={refresh}
            isRefreshing={refreshing}
            hasNextPage={hasNext}
            onLoadMore={() => load(page.current + 1, 'append', debounced)}
            onDocumentPress={openDocument}
            ListHeaderComponent={listHeader}
            emptyStateIcon={searching ? SearchX : FileText}
            emptyStateTitle={searching ? 'Aucun sujet trouvé' : 'Aucun sujet pour le moment'}
            emptyStateDescription={searching
              ? `Rien ne correspond à « ${debounced} ». Essaie une année ou un autre mot du titre.`
              : dynamic
                ? 'Les sujets de cette matière n’ont pas encore été publiés.'
                : 'Aucun sujet n’est encore publié pour ce concours.'}
          />
        )}
      </View>
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
  count: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    color: brand.inkSoft,
  },
});

export default ContestDocumentsScreen;
