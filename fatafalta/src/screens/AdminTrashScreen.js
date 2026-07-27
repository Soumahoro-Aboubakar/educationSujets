import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Trash2, RotateCcw, ArrowLeft, Eye } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import theme from '../theme/tokens';
import {
  getTrashedDocuments,
  restoreDocument,
  permanentlyDeleteDocument,
  getTrashedDocumentPreview,
} from '../services/documents';

const AdminTrashScreen = ({ navigation }) => {
  const [trashedDocs, setTrashedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrash = async () => {
    try {
      const response = await getTrashedDocuments();
      setTrashedDocs(response.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement de la corbeille', err);
      Alert.alert('Erreur', 'Impossible de charger la corbeille.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrash();
    setRefreshing(false);
  };

  const handleRestore = (docId) => {
    Alert.alert(
      'Restaurer ce document ?',
      'Il sera à nouveau visible sur la plateforme.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          onPress: async () => {
            try {
              await restoreDocument(docId);
              setTrashedDocs((prev) => prev.filter((doc) => (doc._id || doc.id) !== docId));
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de restaurer le document.');
            }
          },
        },
      ]
    );
  };

  const handlePermanentDelete = (docId) => {
    Alert.alert(
      'Suppression définitive',
      'Cette action est irréversible. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await permanentlyDeleteDocument(docId);
              setTrashedDocs((prev) => prev.filter((doc) => (doc._id || doc.id) !== docId));
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer définitivement le document.');
            }
          },
        },
      ]
    );
  };

  const handlePreview = async (docId) => {
    try {
      const previewData = await getTrashedDocumentPreview(docId);
      if (previewData && previewData.url) {
        await WebBrowser.openBrowserAsync(previewData.url);
      } else {
        Alert.alert('Erreur', 'Lien de prévisualisation introuvable.');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de prévisualiser ce document.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Button
          variant="ghost"
          icon={<ArrowLeft size={22} color={theme.colors.textPrimary} />}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerTitleContainer}>
          <Text variant="h2" style={styles.title}>Corbeille</Text>
          <Text variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
            {trashedDocs.length} {trashedDocs.length === 1 ? 'fichier' : 'fichiers'}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {!loading && trashedDocs.length === 0 ? (
          <EmptyState
            icon={Trash2}
            title="Corbeille vide"
            description="Aucun document n'a été supprimé récemment."
          />
        ) : (
          <View style={styles.list}>
            {trashedDocs.map((doc) => {
              const id = doc._id || doc.id;
              return (
                <Card key={id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.info}>
                      <Text variant="bodyMedium" style={styles.docTitle} numberOfLines={2}>
                        {doc.title || doc.originalFileName || 'Document sans titre'}
                      </Text>
                      <View style={styles.meta}>
                        <Text variant="caption" color={theme.colors.textMuted}>
                          Supprimé le: {formatDate(doc.deletedAt)}
                        </Text>
                        {doc.deletedBy && (
                          <Text variant="caption" color={theme.colors.textMuted}>
                            Par: {doc.deletedBy.name || doc.deletedBy.email}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.previewButton]}
                      onPress={() => handlePreview(id)}
                      activeOpacity={0.75}
                    >
                      <Eye size={16} color={theme.colors.primary} strokeWidth={2.2} />
                      <Text variant="caption" color={theme.colors.primary} style={styles.actionText}>
                        Voir
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.restoreButton]}
                      onPress={() => handleRestore(id)}
                      activeOpacity={0.85}
                    >
                      <RotateCcw size={16} color={theme.colors.success} strokeWidth={2.2} />
                      <Text variant="caption" color={theme.colors.success} style={styles.actionText}>
                        Restaurer
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handlePermanentDelete(id)}
                      activeOpacity={0.75}
                    >
                      <Trash2 size={16} color={theme.colors.error} strokeWidth={2.2} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  meta: {
    flexDirection: 'column',
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    height: 38,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  previewButton: {
    backgroundColor: theme.colors.primaryWash,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  restoreButton: {
    backgroundColor: theme.colors.successWash,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  deleteButton: {
    flex: 0.4,
    backgroundColor: theme.colors.errorWash,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
});

export default AdminTrashScreen;
