import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Building2,
  GraduationCap,
  Calendar,
  Layers,
  FolderOpen,
  Share2,
  CheckCircle2,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Card from '../components/ui/Card';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
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
        <Text variant="caption" color={theme.colors.textMuted}>
          {label}
        </Text>
        <Text variant="bodyMedium" color={theme.colors.textPrimary}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const DocumentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { documentId, document: initialDocument } = route.params;

  const { data: document = initialDocument, refetch } = useDocument(documentId);
  const subjectDownload = useDownload(document);
  const correctionDownload = useDownload(document?.correction);
  const {
    enabled: promptEnabled,
    setEnabled: setPromptEnabled,
    isLoaded: promptLoaded,
  } = useCorrectionPromptPreference();
  const { user } = useContext(AuthContext);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [wasSubjectDownloading, setWasSubjectDownloading] = useState(false);

  const isCorrection = document.documentType === 'corrige';
  const hasCorrection = !isCorrection && !!document.correction?._id;
  const displayTitle = document.title || document.originalFileName || (isCorrection ? 'Corrigé' : 'Document PDF');

  const {
    isInitializing: isSubjectInitializing,
    isDownloading: isSubjectDownloading,
    progress: subjectProgress,
    isDownloaded: isSubjectDownloaded,
    download: downloadSubject,
    open: openSubject,
    share: shareSubject,
  } = subjectDownload;

  const {
    isDownloading: isCorrectionDownloading,
    progress: correctionProgress,
    isDownloaded: isCorrectionDownloaded,
    download: downloadCorrection,
    open: openCorrection,
  } = correctionDownload;

  const isOwner = user && document.uploadedBy && (user._id === (document.uploadedBy._id || document.uploadedBy));
  const canDelete = user && (user.role === 'admin' || isOwner);

  useFocusEffect(
    useCallback(() => {
      if (!documentId) return;
      refetch();
    }, [documentId, refetch])
  );

  useEffect(() => {
    if (!promptLoaded) return;
    setDontAskAgain(!promptEnabled);
  }, [promptLoaded, promptEnabled]);

  useEffect(() => {
    if (!promptLoaded) return;

    if (
      wasSubjectDownloading &&
      !isSubjectDownloading &&
      isSubjectDownloaded &&
      hasCorrection &&
      promptEnabled
    ) {
      setShowCorrectionModal(true);
    }

    setWasSubjectDownloading(isSubjectDownloading);
  }, [wasSubjectDownloading, isSubjectDownloading, isSubjectDownloaded, hasCorrection, promptEnabled, promptLoaded]);

  const handleToggleDontAskAgain = async () => {
    const nextValue = !dontAskAgain;
    setDontAskAgain(nextValue);
    await setPromptEnabled(!nextValue);
  };

  const handlePrimaryAction = () => {
    if (isSubjectDownloaded) {
      openSubject();
    } else {
      downloadSubject();
    }
  };

  const handleCorrectionAction = () => {
    if (!hasCorrection) return;
    if (isCorrectionDownloaded) {
      openCorrection();
    } else {
      downloadCorrection();
    }
  };

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
              await deleteDocument(document._id || document.id);
              Alert.alert('Succès', 'Document placé dans la corbeille.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le document.');
            }
          },
        },
      ]
    );
  };

  const handleModalChoice = async (downloadNow) => {
    setShowCorrectionModal(false);
    if (dontAskAgain) {
      await setPromptEnabled(false);
    }

    if (downloadNow) {
      downloadCorrection();
    }
  };

  const fileConfig = getFileIcon(document?.fileType || document?.extension);

  if (!document) return null;

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
          Détail du sujet
        </Text>
        <View style={styles.headerRight}>
          {canDelete && (
            <Button
              variant="ghost"
              icon={<Trash2 size={20} color={theme.colors.error} />}
              onPress={handleDelete}
              style={styles.headerActionButton}
            />
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <View style={[styles.iconBox, { backgroundColor: fileConfig.bgColor }]}> 
            <FileText size={36} color={fileConfig.color} strokeWidth={1.8} />
          </View>
          <Badge
            label={fileConfig.label}
            color={fileConfig.color}
            backgroundColor={fileConfig.bgColor}
            style={styles.badge}
          />
          <Text variant="h2" align="center" style={styles.title} numberOfLines={2}>
            {displayTitle}
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.date}>
            Ajouté le {formatDate(document.createdAt)}
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Sparkles size={14} color={theme.colors.accent} strokeWidth={2.2} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>
                Prêt mobile
              </Text>
            </View>
            <View style={styles.pill}>
              <Download size={14} color={theme.colors.primary} strokeWidth={2.2} />
              <Text variant="caption" color={theme.colors.textSecondary} style={styles.pillText}>
                {document.downloads || 0} téléchargements
              </Text>
            </View>
          </View>
          {hasCorrection && (
            <View style={styles.correctionBadge}>
              <Sparkles size={14} color={theme.colors.accentDark} strokeWidth={2} />
              <Text variant="caption" color={theme.colors.accentDark} style={styles.correctionBadgeText}>
                Corrigé disponible
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.primaryWash }]}> 
              <Download size={16} color={theme.colors.primary} strokeWidth={2.2} />
            </View>
            <Text variant="h3" style={styles.statValue}>
              {document.downloads || 0}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              Téléchargements
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.accentWash }]}> 
              <Eye size={16} color={theme.colors.accent} strokeWidth={2.2} />
            </View>
            <Text variant="h3" style={styles.statValue}>
              {document.views || 0}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              Vues
            </Text>
          </View>
        </View>

        {isSubjectDownloaded && (
          <Card style={styles.successCard} shadow="sm">
            <View style={styles.successIcon}>
              <CheckCircle2 size={22} color={theme.colors.success} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Prêt à ouvrir</Text>
              <Text variant="body" color={theme.colors.textSecondary} style={styles.successText}>
                Ce PDF est disponible localement. Ouvrez-le, partagez-le ou retrouvez-le plus tard.
              </Text>
              <View style={styles.quickActions}>
                <Button
                  variant="primary"
                  title="Ouvrir"
                  icon={<FileText size={16} color={theme.colors.textInverse} />}
                  onPress={openSubject}
                  style={styles.quickActionButton}
                />
                <Button
                  variant="secondary"
                  title="Partager"
                  icon={<Share2 size={16} color={theme.colors.primary} />}
                  onPress={shareSubject}
                  style={styles.quickActionButton}
                />
              </View>
            </View>
          </Card>
        )}

        {document.description ? (
          <View style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Description
            </Text>
            <Text variant="body" color={theme.colors.textSecondary} style={styles.descriptionText}>
              {document.description}
            </Text>
          </View>
        ) : null}

        <Card style={styles.infoCard} shadow="sm">
          <Text variant="h3" style={styles.sectionTitle}>
            Informations
          </Text>
          <InfoRow icon={Building2} label="Université" value={document.university?.name} />
          <InfoRow icon={Layers} label="Département" value={document.department?.name} />
          <InfoRow icon={GraduationCap} label="Niveau" value={document.level?.name} />
          <InfoRow icon={Calendar} label="Session" value={document.semester?.displayName || document.semester?.name} />
          <InfoRow icon={FolderOpen} label="Catégorie" value={document.category?.name} />
          <InfoRow icon={FileText} label="Taille" value={formatFileSize(document.fileSize)} isLast />
        </Card>

        {hasCorrection && (
          <Card style={styles.correctionCard} shadow="sm">
            <View style={styles.correctionRow}>
              <View style={styles.correctionIconContainer}>
                <Sparkles size={18} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.correctionContent}>
                <Text variant="h3" style={styles.correctionTitle}>
                  Corrigé associé
                </Text>
                <Text variant="body" color={theme.colors.textSecondary} style={styles.correctionDescription}>
                  Ce sujet possède un corrigé. Vous pouvez le télécharger à tout moment.
                </Text>
              </View>
            </View>
            <View style={styles.correctionActions}>
              <Button
                variant={isCorrectionDownloaded ? 'secondary' : 'accent'}
                title={isCorrectionDownloaded ? 'Ouvrir le corrigé' : (isCorrectionDownloading ? `Téléchargement ${Math.round(correctionProgress * 100)}%` : 'Télécharger le corrigé')}
                onPress={handleCorrectionAction}
                loading={isCorrectionDownloading}
                disabled={isCorrectionDownloading}
                style={styles.correctionButton}
              />
            </View>
          </Card>
        )}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}> 
        {isSubjectDownloading && (
          <View style={styles.progressContainer}>
            <Text variant="caption" color={theme.colors.primary} style={styles.progressText}>
              Téléchargement en cours... {Math.round(subjectProgress * 100)}%
            </Text>
            <ProgressBar progress={subjectProgress} />
          </View>
        )}

        <Button
          variant={isSubjectDownloaded ? 'secondary' : 'accent'}
          title={isSubjectDownloaded ? (isCorrection ? 'Ouvrir le corrigé' : 'Ouvrir le PDF') : (isCorrection ? 'Télécharger le corrigé' : 'Télécharger le PDF')}
          icon={isSubjectDownloaded ? <FileText size={18} color={theme.colors.primary} /> : <Download size={18} color={theme.colors.textInverse} />}
          onPress={handlePrimaryAction}
          loading={isSubjectInitializing}
          disabled={isSubjectDownloading}
          style={styles.actionButton}
        />
      </View>

      <Modal
        visible={showCorrectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCorrectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBox}>
              <Sparkles size={24} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <Text variant="h3" align="center" style={styles.modalTitle}>
              Corrigé disponible
            </Text>
            <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.modalText}>
              Une correction est disponible pour ce sujet. Souhaitez-vous la télécharger maintenant ?
            </Text>
            <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={handleToggleDontAskAgain}>
              <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
                {dontAskAgain && <Check size={14} color={theme.colors.textInverse} />}
              </View>
              <Text variant="bodyMedium" color={theme.colors.textPrimary} style={styles.checkboxLabel}>
                Ne plus me proposer automatiquement les corrections.
              </Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <Button
                variant="secondary"
                title="Plus tard"
                onPress={() => handleModalChoice(false)}
                style={styles.modalButton}
              />
              <Button
                variant="accent"
                title="Télécharger maintenant"
                onPress={() => handleModalChoice(true)}
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
    paddingBottom: 180,
  },
  heroCard: {
    borderRadius: theme.radius['2xl'],
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  pillText: {
    marginLeft: 2,
  },
  correctionBadge: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentWash,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  correctionBadgeText: {
    marginLeft: theme.spacing.xs,
    color: theme.colors.accentDark,
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
    lineHeight: 20,
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
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  correctionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  correctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  correctionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.accentWash,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  correctionContent: {
    flex: 1,
  },
  correctionTitle: {
    marginBottom: theme.spacing.xs,
  },
  correctionDescription: {
    lineHeight: 20,
  },
  correctionActions: {
    marginTop: theme.spacing.lg,
  },
  correctionButton: {
    width: '100%',
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
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 20,
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
