import { SkeletonRows } from '../components/ui/Skeleton';
import Pressable from '../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import { getErrorMessage } from '../utils/userMessages';
import { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/ui/Text';
import api from '../services/api';

import ScreenHeader from '../components/ui/ScreenHeader';
import SearchField from '../components/ui/SearchField';
import { HomeChevron } from '../prep/components/HomePresentation';
import { CopyMargin } from '../prep/components/StudyPresentation';

const ContestTypeSelectionScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { contest } = route.params || {};
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('/api/contest-types');
        if (!mounted) return;
        setTypes(res.data.data || []);
      } catch (e) {
        console.warn(e);
        if (mounted) setLoadError(getErrorMessage(e, 'catalogue'));
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
    <View style={styles.container}>
      <ScreenHeader title="Type de concours" subtitle="Choisis les épreuves que tu veux consulter." onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Rechercher un type de concours" />
      </View>

      {loading ? (
        <SkeletonRows count={5} withMeta={false} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i._id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelect(item)} style={styles.item} accessibilityRole="button" accessibilityLabel={`Consulter ${item.name}`} >
              <CopyMargin style={{ top: 16, bottom: 16 }} />
              <View style={styles.itemContent}>
                <Text variant="h3">{item.name}</Text>
                <Text variant="caption" color={theme.colors.textSecondary}>{item.abbreviation}</Text>
              </View>
              <HomeChevron />
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.center}><Text variant="body" color={theme.colors.textSecondary}>{loadError || 'Aucun type de concours trouvé. Reviens à la liste et choisis un autre organisme.'}</Text></View>}
        />
      )}
    </View>
  );
};

export default ContestTypeSelectionScreen;

const useStyles = createThemedStyles(({ theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame, flex: 1, backgroundColor: theme.brand.paper },

    list: { padding: theme.spacing.lg, paddingBottom: theme.spacing['4xl'] },
    searchWrap: { paddingHorizontal: 24, paddingBottom: 16 },
    item: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.brand.line },
    itemContent: { flex: 1, marginRight: theme.spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  });
  return { styles };
});
