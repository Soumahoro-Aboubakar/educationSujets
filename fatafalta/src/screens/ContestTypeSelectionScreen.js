import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Search, ChevronRight } from 'lucide-react-native';
import Text from '../components/ui/Text';
import api from '../services/api';
import theme from '../theme/tokens';

const ContestTypeSelectionScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { contest } = route.params || {};
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('/api/contest-types');
        if (!mounted) return;
        setTypes(res.data.data || []);
      } catch (e) {
        console.warn(e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => (t.name || '').toLowerCase().includes(q) || (t.abbreviation || '').toLowerCase().includes(q));
  }, [types, query]);

  const handleSelect = (type) => {
    navigation.navigate('ContestDocuments', { contest, contestType: type });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text variant="overline" color={theme.colors.primary}>Sujets de concours</Text>
          <Text variant="h1">Choisir le type de concours</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={theme.colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un type de concours..." placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelect(item)} style={styles.item}>
              <View style={styles.itemContent}>
                <Text variant="h3">{item.name}</Text>
                <Text variant="caption" color={theme.colors.textSecondary}>{item.abbreviation}</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.center}><Text variant="body" color={theme.colors.textSecondary}>Aucun type de concours trouvé.</Text></View>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg },
  backButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight },
  titleWrap: { marginLeft: theme.spacing.md },
  searchBox: { height: 56, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.base, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderLight },
  searchInput: { flex: 1, height: '100%', color: theme.colors.textPrimary },
  list: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.borderLight },
  itemContent: { flex: 1, marginRight: theme.spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default ContestTypeSelectionScreen;
