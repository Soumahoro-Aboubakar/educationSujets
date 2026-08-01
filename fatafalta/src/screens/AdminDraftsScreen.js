import React, { useState, useContext, useCallback } from 'react';
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
import { Trash2, Edit, Send, Plus, Clock, FileText, Link2 } from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import AuthContext from '../context/AuthContext';
import useDrafts from '../hooks/useDrafts';
import theme from '../theme/tokens';

const AdminDraftsScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { drafts, loading, deleteDraft, loadDrafts } = useDrafts();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
        Alert.alert(
          'Accès refusé',
          'Vous devez être administrateur pour accéder à cette page.',
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      }
      loadDrafts();
    }, [user, loadDrafts])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDrafts();
    setRefreshing(false);
  };

  const handleEditDraft = (draftId) => {
    navigation.navigate('EditDraft', { draftId });
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        <View style={styles.headerActions}>
          {user?.role === 'admin' && (
            <>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => navigation.navigate('CorrectionUpload')}
                activeOpacity={0.7}
              >
                <Link2 size={20} color={theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconActionError}
                onPress={() => navigation.navigate('AdminTrash')}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('Upload')}
            activeOpacity={0.8}
          >
            <Plus size={18} color={theme.colors.textInverse} strokeWidth={2.5} />
            <Text variant="caption" style={styles.primaryActionText}>Nouveau</Text>
          </TouchableOpacity>
        </View>
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
            {drafts.map(draft => {
              const isComplete = draft.status !== 'draft';
              return (
                <Card key={draft._id || draft.id} style={styles.draftCard}>
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
                        <Clock size={12} color={theme.colors.textMuted} strokeWidth={2.2} />
                        <Text
                          variant="caption"
                          color={theme.colors.textMuted}
                          style={{ marginLeft: 4 }}
                        >
                          {formatDate(draft.createdAt || draft.savedAt)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.completionIndicator,
                        isComplete && styles.completionIndicatorDone,
                      ]}
                    >
                      <Text
                        variant="caption"
                        color={isComplete ? theme.colors.success : theme.colors.primary}
                        style={styles.completionText}
                      >
                        {isComplete ? '100%' : '~30%'}
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

                  {(draft.university || draft.department || draft.category) && (
                    <View style={styles.metadataPreview}>
                      {draft.university && (
                        <View style={styles.metadataBadge}>
                          <Text variant="caption" color={theme.colors.primary}>
                            {draft.university?.name || draft.university}
                          </Text>
                        </View>
                      )}
                      {draft.department && (
                        <View style={styles.metadataBadge}>
                          <Text variant="caption" color={theme.colors.primary}>
                            {draft.department?.name || draft.department}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.draftActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditDraft(draft._id || draft.id)}
                      activeOpacity={0.75}
                    >
                      <Edit size={16} color={theme.colors.primary} strokeWidth={2.2} />
                      <Text
                        variant="caption"
                        color={theme.colors.primary}
                        style={{ marginLeft: 4, fontWeight: '600' }}
                      >
                        Modifier
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.publishButton]}
                      onPress={() => handleEditDraft(draft._id || draft.id)}
                      activeOpacity={0.85}
                    >
                      <Send size={16} color={theme.colors.textInverse} strokeWidth={2.2} />
                      <Text
                        variant="caption"
                        color={theme.colors.textInverse}
                        style={{ marginLeft: 4, fontWeight: '600' }}
                      >
                        Publier
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteDraft(draft._id || draft.id)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionError: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.errorWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  draftsList: {
    gap: 12,
  },
  draftCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
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
    borderRadius: theme.radius.full,
  },
  completionIndicatorDone: {
    backgroundColor: theme.colors.successWash,
  },
  completionText: {
    fontWeight: '600',
  },
  description: {
    marginBottom: 8,
    lineHeight: 18,
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
    borderRadius: theme.radius.full,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: theme.radius.md,
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
    flex: 1.2,
  },
  deleteButton: {
    flex: 0.5,
    backgroundColor: theme.colors.errorWash,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
});

export default AdminDraftsScreen;
