import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native';
import Text from '../components/ui/Text';
import api from '../services/api';
import DocumentList from '../components/documents/DocumentList';
import EmptyState from '../components/ui/EmptyState';
import theme from '../theme/tokens';

const ContestDocumentsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { contest, contestType, catalogNode, institution, organisme, parcoursType, noeud, matiere } = route.params || {};
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState('');
  const isDynamicCatalog = Boolean(noeud?._id && matiere?._id);

  const loadDocuments = async (requestedPage = 1, append = false) => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 12, page: requestedPage };
      if (isDynamicCatalog) {
        params.noeudId = String(noeud._id);
        params.matiereId = String(matiere._id);
        if (parcoursType?._id) params.parcoursTypeId = String(parcoursType._id);
        params.type = 'sujet';
        if (query.trim()) params.recherche = query.trim();
      } else {
        if (contestType?._id) params.contestType = String(contestType._id);
        if (catalogNode?._id) params.node = String(catalogNode._id);
        if (institution?._id) params.institution = String(institution._id);
        if (query.trim()) params.search = query.trim();
      }
      const res = await api.get('/api/documents', { params });
      const next = res.data.data || [];
      setDocuments((current) => append ? [...current, ...next] : next);
      setPage(requestedPage);
      setHasNextPage(Boolean(res.data.pagination?.pages > requestedPage));
    } catch (e) {
      console.warn('Failed loading contest documents', e.response?.status, e.response?.data || e.message);
      setError('Impossible de charger les sujets. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(1, false); }, [contestType?._id, catalogNode?._id, institution?._id, noeud?._id, matiere?._id, parcoursType?._id, isDynamicCatalog, query]);

  const visible = useMemo(() => {
    return documents;
  }, [documents]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="overline" color={theme.colors.primary}>{organisme?.nom || organisme?.name || 'Sujets de concours'}</Text>
          <Text variant="h1">{matiere?.nom || matiere?.name || catalogNode?.name || contestType?.name || 'Documents'}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={theme.colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher dans les résultats..." placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : error ? (
        <EmptyState
          title="Sujets indisponibles"
          description={error}
          action={{ label: 'Réessayer', onPress: () => loadDocuments(1, false) }}
        />
      ) : (
        <DocumentList
          documents={visible}
          isLoading={false}
          onRefresh={() => loadDocuments(1, false)}
          isRefreshing={loading}
          hasNextPage={hasNextPage}
          onLoadMore={() => loadDocuments(page + 1, true)}
          onDocumentPress={(doc) => navigation.navigate('DocumentDetail', { documentId: doc._id, document: doc })}
          emptyStateTitle="Aucun document"
          emptyStateDescription={isDynamicCatalog ? 'Aucun sujet publié pour cette matière.' : 'Aucun sujet trouvé pour ce type de concours.'}
        />
      )}
    </View>
  );
};

import { StyleSheet as RNStyleSheet } from 'react-native';
const styles = RNStyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  titleWrap: { marginLeft: theme.spacing.md },
  searchBox: { height: 56, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.base, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  searchInput: { flex: 1, height: '100%', color: theme.colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ContestDocumentsScreen;
