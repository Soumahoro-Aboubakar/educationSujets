import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Layers3 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import ListRow from '../components/ui/ListRow';
import StateView from '../components/ui/StateView';
import { SkeletonRows } from '../components/ui/Skeleton';
import { fetchParcoursTypes } from '../services/catalog';
import theme from '../theme/tokens';

const { brand } = theme;

const labelOf = (item) => item?.nom || item?.name || '';

const ParcoursTypeSelectionScreen = ({ navigation, route }) => {
  const organisme = route.params?.organisme || null;
  const [types, setTypes] = useState(route.params?.parcoursTypes || []);
  const [loading, setLoading] = useState(!route.params?.parcoursTypes);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();

  const load = async () => {
    if (!organisme?._id) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const result = await fetchParcoursTypes(organisme._id);
      setTypes(result.data);
      // Organisme sans parcours : cette étape n'a pas de sens, on la retire de l'historique.
      if (!result.data.length) navigation.replace('DynamicCatalog', { organisme });
    } catch (requestError) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!route.params?.parcoursTypes) load();
  }, [organisme?._id]);

  // `navigate` (et non `replace`) : le retour depuis le catalogue ramène ici.
  const select = (item) => {
    Haptics.selectionAsync().catch(() => {});
    navigation.navigate('DynamicCatalog', { organisme, parcoursType: item });
  };

  const renderContent = () => {
    if (loading) return <SkeletonRows count={3} withMeta={false} />;
    if (error) {
      return (
        <StateView
          icon={Layers3}
          title="Connexion impossible"
          description="Les parcours n’ont pas pu être chargés. Vérifie ta connexion puis réessaie."
          onRetry={load}
        />
      );
    }
    if (!types.length) {
      return (
        <StateView
          icon={Layers3}
          title="Aucun parcours disponible"
          description="Cet organisme ne propose pas encore de parcours."
        />
      );
    }

    return (
      <>
        <Text variant="overline" style={styles.count}>
          {types.length} parcours
        </Text>
        {types.map((item, index) => (
          <ListRow
            key={item._id}
            title={labelOf(item)}
            isLast={index === types.length - 1}
            onPress={() => select(item)}
          />
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow={organisme?.nom || organisme?.name}
        title="Choisis un parcours"
        subtitle="Les sujets sont classés par parcours au sein de cet organisme."
      />
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  body: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    paddingTop: theme.spacing.xs,
  },
  count: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    color: brand.inkSoft,
  },
});

export default ParcoursTypeSelectionScreen;
