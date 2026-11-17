import { useInfiniteDocuments } from '../hooks/useDocuments';
import { createThemedStyles } from '../theme/ThemeProvider';
import { getErrorMessage } from '../utils/userMessages';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FileText, Files, SearchX } from 'lucide-react-native';
import Text from '../components/ui/Text';
import OrganismeLogo from '../components/catalog/OrganismeLogo';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import SearchField from '../components/ui/SearchField';
import StateView from '../components/ui/StateView';
import DocumentList from '../components/documents/DocumentList';

const labelOf = (item) => item?.nom || item?.name || '';

const ContestDocumentsScreen = ({ navigation, route }) => {
  const { styles } = useStyles();
  const { contestType, catalogNode, institution, organisme, parcoursType, noeud, matiere, taxonomyPath } = route.params || {};
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const dynamic = Boolean(noeud?._id && matiere?._id);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  const filters = dynamic ? {
    noeudId: String(noeud._id), matiereId: String(matiere._id),
    parcoursTypeId: parcoursType?._id, type: 'sujet', recherche: debounced || undefined,
  } : {
    contestType: contestType?._id, node: catalogNode?._id, institution: institution?._id, search: debounced || undefined,
  };
  const result = useInfiniteDocuments(filters);
  const documents = result.data?.pages.flatMap((page) => page.data) || [];
  const total = result.data?.pages[0]?.pagination?.total ?? null;
  const loading = result.isLoading;
  const loadingMore = result.isFetchingNextPage;
  const hasNext = result.hasNextPage;
  const error = result.error ? getErrorMessage(result.error, 'documents') : '';
  const refresh = async () => {
    setRefreshing(true);
    try { await result.refetch(); } finally { setRefreshing(false); }
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
    <Text variant="h3" style={styles.count}>
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
        eyebrowIcon={organisme ? <OrganismeLogo organisme={organisme} size={24} /> : null}
        title={title}
        subtitle={pathLabel || null}
        right={organisme ? (
          <HeaderIconButton
            icon={Files}
            label="Télécharger plusieurs sujets"
            onPress={() => navigation.navigate('BulkDownload', {
              organisme,
              parcoursType,
              annee: [...(taxonomyPath || []), noeud].map((item) => item?.nom || item?.name).find((label) => /^(19|20)\d{2}$/.test(String(label || ''))),
              matiereId: matiere?._id,
            })}
          />
        ) : null}
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
          <StateView icon={FileText} title="Sujets indisponibles" description={error} onRetry={refresh} />
        ) : (
          <DocumentList
            documents={documents}
            isLoading={loading}
            dimmed={loading && !isInitial && !refreshing}
            isFetchingNextPage={loadingMore}
            onRefresh={refresh}
            isRefreshing={refreshing}
            hasNextPage={hasNext}
            onLoadMore={() => { if (hasNext && !result.isFetching && !result.isPlaceholderData) result.fetchNextPage(); }}
            onDocumentPress={openDocument}
            ListHeaderComponent={listHeader}
            emptyStateIcon={searching ? SearchX : FileText}
            emptyStateTitle={searching ? 'Aucun sujet trouvé' : 'Aucun sujet pour le moment'}
            emptyStateDescription={searching
              ? `Rien ne correspond à « ${debounced} ». Essaie une année ou un autre mot du titre.`
              : dynamic
                ? 'Les sujets de cette matière n’ont pas encore été publiés. Consulte une autre matière ou reviens plus tard.'
                : 'Aucun sujet n’est encore publié pour ce concours. Consulte un autre concours ou reviens plus tard.'}
          />
        )}
      </View>
    </View>
  );
};

export default ContestDocumentsScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
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
      paddingHorizontal: 2,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      color: brand.ink,
    },
  });
  return { styles };
});
