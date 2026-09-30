import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FileDown, SearchX, Share2, Trash2 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import SearchField from '../components/ui/SearchField';
import StateView from '../components/ui/StateView';
import DocumentCard from '../components/documents/DocumentCard';
import { DocumentSkeleton } from '../components/documents/DocumentList';
import { useOfflineDocuments } from '../hooks/useOfflineDocuments';
import { openDownloadedFile, shareDownloadedFile } from '../hooks/useDownload';
import useDownloadStore from '../store/useDownloadStore';
import { formatDate } from '../utils/format';
import { getDocumentTitle } from '../utils/document';
import theme from '../theme/tokens';

const { brand } = theme;

// Filet de sécurité si l'événement de fin de transition n'est jamais émis.
const TRANSITION_FALLBACK_MS = 450;

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase();

/**
 * Fichiers disponibles hors connexion.
 * Ouvert depuis l'accueil, l'écran est poussé dans la pile (retour visible) ;
 * dans les onglets, il s'affiche sans bouton retour.
 */
const DownloadsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isStacked = route.name === 'Downloads';
  const documents = useOfflineDocuments();
  const hydrated = useDownloadStore((state) => state.hydrated);
  const removeDownload = useDownloadStore((state) => state.removeDownload);
  const getLocalUri = useDownloadStore((state) => state.getLocalUri);
  const [query, setQuery] = useState('');
  // La liste est construite après l'animation d'ouverture : la transition
  // reste fluide et un squelette occupe l'écran pendant ce court instant.
  const [ready, setReady] = useState(!isStacked);

  useEffect(() => {
    if (ready) return undefined;
    const unsubscribe = navigation.addListener('transitionEnd', () => setReady(true));
    const timer = setTimeout(() => setReady(true), TRANSITION_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation, ready]);

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return documents;
    return documents.filter((item) => {
      const haystack = normalize([
        getDocumentTitle(item.document),
        item.document.originalFileName,
        item.document.description,
      ].join(' '));
      return terms.every((term) => haystack.includes(term));
    });
  }, [documents, query]);

  const open = (item) => openDownloadedFile(item.document, { getLocalUri, removeDownload });
  const share = (item) => shareDownloadedFile(item.document, { getLocalUri });
  const remove = (item) => {
    Alert.alert(
      'Supprimer le téléchargement',
      `« ${getDocumentTitle(item.document)} » sera retiré de ton appareil.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeDownload(item.id) },
      ]
    );
  };

  const loading = !hydrated || !ready;
  const count = documents.length;

  const renderItem = ({ item }) => (
    <View>
      <DocumentCard document={item.document} onPress={() => open(item)} isDownloaded />
      <View style={styles.itemFooter}>
        <Text variant="caption" style={styles.itemDate}>Téléchargé le {formatDate(item.downloadedAt)}</Text>
        <IconAction icon={Share2} label="Partager" onPress={() => share(item)} />
        <IconAction icon={Trash2} label="Supprimer" onPress={() => remove(item)} danger />
      </View>
    </View>
  );

  const renderBody = () => {
    if (loading) {
      return <View style={styles.list}><DocumentSkeleton /></View>;
    }
    if (!count) {
      return (
        <StateView
          icon={FileDown}
          title="Aucun téléchargement"
          description="Les sujets que tu télécharges apparaissent ici et restent consultables sans connexion."
        />
      );
    }
    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, !visible.length && styles.listEmpty]}
        ListHeaderComponent={visible.length ? (
          <Text variant="overline" style={styles.count}>
            {query.trim()
              ? `${visible.length} résultat${visible.length > 1 ? 's' : ''}`
              : `${count} fichier${count > 1 ? 's' : ''}`}
          </Text>
        ) : null}
        ListEmptyComponent={(
          <StateView
            icon={SearchX}
            title="Aucun résultat"
            description={`Aucun fichier ne correspond à « ${query.trim()} ».`}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={isStacked ? () => navigation.goBack() : undefined}
        eyebrow="Hors connexion"
        title="Mes téléchargements"
      />

      {count > 0 ? (
        <View style={styles.searchBar}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Rechercher un fichier" />
        </View>
      ) : null}

      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
};

const IconAction = ({ icon: Icon, label, onPress, danger }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={theme.hitSlop}
    onPress={onPress}
    style={({ pressed }) => [styles.iconAction, pressed && styles.iconActionPressed]}
  >
    <Icon size={17} color={danger ? brand.burgundy : brand.inkSoft} strokeWidth={1.9} />
  </Pressable>
);

const Separator = () => <View style={styles.separator} />;

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
  list: {
    flexGrow: 1,
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.spacing['4xl'],
  },
  listEmpty: {
    flexGrow: 1,
  },
  count: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
    color: brand.inkSoft,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: -theme.spacing.sm,
    paddingLeft: 54,
    paddingBottom: theme.spacing.sm,
  },
  itemDate: {
    flex: 1,
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
  },
  iconAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  iconActionPressed: {
    backgroundColor: brand.pressed,
  },
  separator: {
    marginLeft: 54,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
});

export default DownloadsScreen;
