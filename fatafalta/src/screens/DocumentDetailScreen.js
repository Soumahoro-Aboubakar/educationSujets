import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft, Download, Eye, FileText, Building2, GraduationCap,
  Calendar, Layers, FolderOpen, Share2, CheckCircle2, Sparkles, Trash2
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatFileSize } from '../utils/format';
import AuthContext from '../context/AuthContext';
import { deleteDocument } from '../services/documents';
import theme from '../theme/tokens';

const InfoRow = ({ icon: Icon, label, value, isLast }) => {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoIcon}>
        <Icon size={16} color={theme.colors.textMuted} strokeWidth={2.2} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text variant="caption" color={theme.colors.textMuted}>{label}</Text>
        <Text variant="bodyMedium" color={theme.colors.textPrimary}>{value}</Text>
      </View>
    </View>
  );
};

const DocumentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { documentId, document: initialDocument } = route.params;

  const { data: document = initialDocument } = useDocument(documentId);
  const { download, open, share, isDownloading, progress, isDownloaded, isInitializing } = useDownload(document);
  const { user, isAdmin } = useContext(AuthContext);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Future check: const canDownloadCorrection = user?.isPremium;
  const canDownloadCorrection = true;

  const fileConfig = getFileIcon(document?.fileType || document?.extension);

  if (!document) return null;

  const isCorrection = document.documentType === 'corrige';
  const displayTitle = document.title || document.originalFileName || (isCorrection ? 'Corrigé' : 'Document PDF');

  const handleAction = () => {
    if (isDownloaded) {
      open();
    } else {
      if (document.correction && document.correction.status === 'approved' && canDownloadCorrection) {
        setShowCorrectionModal(true);
      } else {
        download();
      }
    }
  };

  const handleDownloadSubjectOnly = () => {
    setShowCorrectionModal(false);
    download();
  };

  const handleDownloadCorrectionAlso = () => {
    setShowCorrectionModal(false);
    download(); // download subject
    // Navigate to correction so they can download it
    navigation.navigate('DocumentDetail', { documentId: document.correction._id });
  };

  const isOwner = user && document.uploadedBy && (user._id === (document.uploadedBy._id || document.uploadedBy));
  const canDelete = user && (user.role === 'admin' || isOwner);

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le document',
      'Voulez-vous vraiment effacer ce fichier ? Il sera déplacé vers la corbeille.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteDocument(document._id || document.id);
              Alert.alert('Succès', 'Document placé dans la corbeille.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le document.');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
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
        <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
          Détail du document
        </Text>
        <View style={styles.headerRight}>
          {canDelete && (
            <Button
              variant="ghost"
              icon={<Trash2 size={20} color={theme.colors.error} />}
              onPress={handleDelete}
              loading={isDeleting}
              style={styles.headerActionButton}
            />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={[styles.iconBox, { backgroundColor: fileConfig.bgColor }]}>
            <FileText size={36} color={fileConfig.color} strokeWidth={1.8} />
          </View>
          <Badge
            label={fileConfig.label}
            color={fileConfig.color}
            backgroundColor={fileConfig.bgColor}
            style={styles.badge}
          />
          <Text variant="h2" align="center" style={styles.title}>
            {displayTitle}
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.date}>
            Ajouté le {formatDate(document.createdAt)}
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Sparkles size={14} color={theme.colors.accent} strokeWidth={2.2} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>Prêt mobile</Text>
            </View>
            <View style={styles.pill}>
              <Download size={14} color={theme.colors.primary} strokeWidth={2.2} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>{document.downloads || 0} téléchargements</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.primaryWash }]}>
              <Download size={16} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <Text variant="h3" style={styles.statValue}>{document.downloads || 0}</Text>
            <Text variant="caption" color={theme.colors.textMuted}>Téléchargements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.accentWash }]}>
              <Eye size={16} color={theme.colors.accent} strokeWidth={2.2} />
            </View>
            <Text variant="h3" style={styles.statValue}>{document.views || 0}</Text>
            <Text variant="caption" color={theme.colors.textMuted}>Vues</Text>
          </View>
        </View>

        {isDownloaded ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle2 size={22} color={theme.colors.success} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Prêt à ouvrir</Text>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.successText}>
                Ce PDF est disponible localement. Ouvrez-le, partagez-le ou revenez-y plus tard.
              </Text>
              <View style={styles.quickActions}>
                <Button
                  variant="primary"
                  title="Ouvrir"
                  icon={<FileText size={16} color={theme.colors.textInverse} />}
                  onPress={open}
                  style={styles.quickActionButton}
                />
                <Button
                  variant="secondary"
                  title="Partager"
                  icon={<Share2 size={16} color={theme.colors.primary} />}
                  onPress={share}
                  style={styles.quickActionButton}
                />
              </View>
            </View>
          </View>
        ) : null}

        {document.description ? (
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>Description</Text>
            <Text variant="body" color={theme.colors.textSecondary} style={styles.descriptionText}>
              {document.description}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={Building2} label="Université" value={document.university?.name} />
            <InfoRow icon={Layers} label="Département" value={document.department?.name} />
            <InfoRow icon={GraduationCap} label="Niveau" value={document.level?.name} />
            <InfoRow icon={Calendar} label="Session" value={document.semester?.displayName || document.semester?.name} />
            <InfoRow icon={FolderOpen} label="Catégorie" value={document.category?.name} />
            <InfoRow icon={FileText} label="Taille" value={formatFileSize(document.fileSize)} isLast />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        {isDownloading && (
          <View style={styles.progressContainer}>
            <Text variant="caption" color={theme.colors.primary} style={styles.progressText}>
              Téléchargement en cours... {Math.round(progress * 100)}%
            </Text>
            <ProgressBar progress={progress} />
          </View>
        )}

        <Button
          variant={isDownloaded ? 'secondary' : 'accent'}
          title={isDownloaded ? (isCorrection ? 'Ouvrir le corrigé' : 'Ouvrir le PDF') : (isCorrection ? 'Télécharger le corrigé' : 'Télécharger le PDF')}
          icon={isDownloaded ? <FileText size={18} color={theme.colors.primary} /> : <Download size={18} color={theme.colors.textInverse} />}
          onPress={handleAction}
          loading={isInitializing}
          disabled={isDownloading}
          style={styles.actionButton}
        />
      </View>

      <Modal
        visible={showCorrectionModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Sparkles size={24} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <Text variant="h3" align="center" style={styles.modalTitle}>Corrigé disponible !</Text>
            <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.modalText}>
              Souhaitez-vous également télécharger le corrigé de ce document ?
            </Text>
            <View style={styles.modalActions}>
              <Button
                variant="primary"
                title="Oui, voir le corrigé"
                onPress={handleDownloadCorrectionAlso}
                style={styles.modalButton}
              />
              <Button
                variant="secondary"
                title="Non, juste le sujet"
                onPress={handleDownloadSubjectOnly}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
    alignItems: 'flex-end',
  },
  headerActionButton: {
    padding: theme.spacing.xs,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 140,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  badge: {
    marginBottom: theme.spacing.md,
  },
  title: {
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.3,
  },
  date: {
    marginBottom: theme.spacing.md,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primaryWash,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  pillText: {
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
  },
  statValue: {
    marginBottom: 2,
  },
  successCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.successWash,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successIcon: {
    marginRight: theme.spacing.md,
    paddingTop: 2,
  },
  successText: {
    marginTop: 4,
    marginBottom: theme.spacing.md,
    lineHeight: 19,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  descriptionText: {
    lineHeight: 21,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButton: {
    width: '100%',
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    marginBottom: theme.spacing.sm,
  },
  modalText: {
    marginBottom: theme.spacing.xl,
    lineHeight: 21,
  },
  modalActions: {
    width: '100%',
    gap: theme.spacing.md,
  },
  modalButton: {
    width: '100%',
  },
});

export default DocumentDetailScreen;
