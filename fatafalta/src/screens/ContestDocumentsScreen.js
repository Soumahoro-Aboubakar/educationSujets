import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native';
import Text from '../components/ui/Text';
import api from '../services/api';
import DocumentList from '../components/documents/DocumentList';
import theme from '../theme/tokens';
 
const ContestDocumentsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { contest, contestType } = route.params || {};
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/documents', { params: { contestType: contestType._id, limit: 1000 } });
      setDocuments(res.data.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [contestType?._id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => {
      return [d.title, d.originalFileName, d.description]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
  }, [documents, query]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="overline" color={theme.colors.primary}>Sujets de concours</Text>
          <Text variant="h1">{contestType?.name || 'Documents'}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={theme.colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher dans les résultats..." placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <DocumentList
          documents={visible}
          isLoading={false}
          onRefresh={loadDocuments}
          isRefreshing={loading}
          onDocumentPress={(doc) => navigation.navigate('DocumentDetail', { documentId: doc._id, document: doc })}
          emptyStateTitle="Aucun document"
          emptyStateDescription="Aucun sujet trouvé pour ce type de concours."
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
