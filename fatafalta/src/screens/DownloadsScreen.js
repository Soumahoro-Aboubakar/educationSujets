import React from 'react';
import { View, StyleSheet, SafeAreaView, FlatList, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FileDown, Trash2, Share2, ExternalLink } from 'lucide-react-native';
import Text from '../components/ui/Text';
import DocumentCard from '../components/documents/DocumentCard';
import EmptyState from '../components/ui/EmptyState';
import { useOfflineDocuments } from '../hooks/useOfflineDocuments';
import { openDownloadedFile, shareDownloadedFile } from '../hooks/useDownload';
import useDownloadStore from '../store/useDownloadStore';
import theme from '../theme/tokens';

/**
 * Downloads Screen (Offline access)
 */
const DownloadsScreen = () => {
  const navigation = useNavigation();
  const documents = useOfflineDocuments();
  const { removeDownload, getLocalUri } = useDownloadStore();

  const handleDocumentPress = (doc) => {
    navigation.navigate('DocumentDetail', { documentId: doc.id, document: doc.document });
  };

  const handleOpen = async (item) => {
    await openDownloadedFile(item.document, {
      getLocalUri: (documentId) => getLocalUri(documentId),
      removeDownload,
    });
  };

  const handleShare = async (item) => {
    await shareDownloadedFile(item.document, {
      getLocalUri: (documentId) => getLocalUri(documentId),
    });
  };

  const handleRemove = (id, title) => {
    Alert.alert(
      'Supprimer le téléchargement',
      `Êtes-vous sûr de vouloir supprimer “${title}” de votre appareil ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => removeDownload(id),
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <DocumentCard
        document={item.document}
        onPress={() => handleDocumentPress(item)}
        isDownloaded={true}
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleOpen(item)}>
          <ExternalLink size={16} color={theme.colors.primary} />
          <Text variant="caption" color={theme.colors.primary} style={styles.actionText}>Ouvrir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
          <Share2 size={16} color={theme.colors.primary} />
          <Text variant="caption" color={theme.colors.primary} style={styles.actionText}>Partager</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleRemove(item.id, item.document.title)}>
          <Trash2 size={16} color={theme.colors.error} />
          <Text variant="caption" color={theme.colors.error} style={styles.actionText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2" style={styles.title}>Ma bibliothèque</Text>
        <Text variant="bodyMedium" color={theme.colors.textSecondary}>
          {documents.length > 0
            ? `${documents.length} document${documents.length > 1 ? 's' : ''} disponible${documents.length > 1 ? 's' : ''}`
            : 'Les documents téléchargés apparaissent ici'}
        </Text>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          documents.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={FileDown}
            title="Aucune ressource téléchargée"
            description="Téléchargez un PDF pour le retrouver ici, l’ouvrir ou le partager rapidement."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing['4xl'],
  },
  emptyContent: {
    flexGrow: 1,
  },
  itemContainer: {
    marginBottom: theme.spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  actionText: {
    marginLeft: theme.spacing.xs,
  },
});

export default DownloadsScreen;
