import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Trash2, Edit, Send, Plus, Clock, FileText } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import AuthContext from '../context/AuthContext';
import useDrafts from '../hooks/useDrafts';
import theme from '../theme/tokens';

const AdminDraftsScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { drafts, loading, deleteDraft } = useDrafts();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check if admin
    if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
      Alert.alert(
        'Accès refusé',
        'Vous devez être administrateur pour accéder à cette page.',
        [{ text: 'OK', onPress: () => logout() }]
      );
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleEditDraft = (draftId) => {
    // Navigate to upload screen with draft data
    navigation.navigate('Upload', { draftId });
  };

  const handleDeleteDraft = (draftId) => {
    Alert.alert(
      'Supprimer le brouillon?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDraft(draftId);
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le brouillon');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="h2" style={styles.title}>Brouillons</Text>
          <Text 
            variant="body" 
            color={theme.colors.textSecondary}
            style={styles.subtitle}
          >
            {drafts.length} {drafts.length === 1 ? 'brouillon' : 'brouillons'}
          </Text>
        </View>
        <Button
          title="Nouveau"
          icon={Plus}
          variant="primary"
          onPress={() => navigation.navigate('Upload')}
          style={styles.newButton}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {drafts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun brouillon"
            description="Créez un nouveau document pour commencer"
            action={{
              label: 'Créer un document',
              onPress: () => navigation.navigate('Upload'),
            }}
          />
        ) : (
          <View style={styles.draftsList}>
            {drafts.map(draft => (
              <Card key={draft.id} style={styles.draftCard}>
                <View style={styles.draftHeader}>
                  <View style={styles.draftInfo}>
                    <Text 
                      variant="bodyMedium" 
                      style={styles.draftTitle}
                      numberOfLines={2}
                    >
                      {draft.title || 'Sans titre'}
                    </Text>
                    <View style={styles.draftMeta}>
                      <Clock size={12} color={theme.colors.textMuted} />
                      <Text 
                        variant="caption" 
                        color={theme.colors.textMuted}
                        style={{ marginLeft: 4 }}
                      >
                        {formatDate(draft.savedAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.completionIndicator}>
                    <Text 
                      variant="caption" 
                      color={theme.colors.textSecondary}
                      style={styles.completionText}
                    >
                      {draft.metadataStatus ? '100%' : '~ 30%'}
                    </Text>
                  </View>
                </View>

                {draft.description && (
                  <Text 
                    variant="caption" 
                    color={theme.colors.textSecondary}
                    numberOfLines={2}
                    style={styles.description}
                  >
                    {draft.description}
                  </Text>
                )}

                {/* Metadata Preview */}
                {(draft.university || draft.department || draft.category) && (
                  <View style={styles.metadataPreview}>
                    {draft.university && (
                      <View style={styles.metadataBadge}>
                        <Text variant="caption" color={theme.colors.primary}>
                          {draft.university}
                        </Text>
                      </View>
                    )}
                    {draft.department && (
                      <View style={styles.metadataBadge}>
                        <Text variant="caption" color={theme.colors.primary}>
                          {draft.department}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.draftActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditDraft(draft.id)}
                  >
                    <Edit size={16} color={theme.colors.primary} />
                    <Text 
                      variant="caption" 
                      color={theme.colors.primary}
                      style={{ marginLeft: 4 }}
                    >
                      Modifier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.publishButton]}
                    onPress={() => handleEditDraft(draft.id)}
                  >
                    <Send size={16} color={theme.colors.textInverse} />
                    <Text 
                      variant="caption" 
                      color={theme.colors.textInverse}
                      style={{ marginLeft: 4 }}
                    >
                      Publier
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteDraft(draft.id)}
                  >
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  newButton: {
    height: 40,
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  draftsList: {
    gap: 12,
  },
  draftCard: {
    padding: 12,
    marginBottom: 8,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  draftInfo: {
    flex: 1,
    marginRight: 8,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  draftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionIndicator: {
    backgroundColor: theme.colors.primaryWash,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completionText: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  description: {
    marginBottom: 8,
  },
  metadataPreview: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metadataBadge: {
    backgroundColor: theme.colors.primaryWash,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: theme.colors.primaryWash,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  publishButton: {
    backgroundColor: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.errorWash,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
});

export default AdminDraftsScreen;
