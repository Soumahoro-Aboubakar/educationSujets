import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  Share2,
  Trash2,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import ProgressBar from '../components/ui/ProgressBar';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
import { getFileIcon } from '../utils/fileIcons';
import { formatDate, formatFileSize } from '../utils/format';
import AuthContext from '../context/AuthContext';
import { deleteDocument } from '../services/documents';
import theme from '../theme/tokens';

const NAVY = '#0D1B32';
const NAVY_SOFT = '#4F5E72';
const SURFACE = '#FCFAF5';
const GOLD = '#B48A48';
const BURGUNDY = '#6C2838';
const LINE = '#DED8CC';

const InfoRow = ({ icon: Icon, label, value, isLast }) => {
  if (!value) return null;

  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Icon size={16} color={NAVY_SOFT} strokeWidth={1.75} />
      <View style={styles.infoTextContainer}>
        <Text variant="overline" style={styles.infoLabel}>{label}</Text>
        <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
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

  const isCorrection = document?.documentType === 'corrige';
  const hasCorrection = !isCorrection && !!document?.correction?._id;
  const displayTitle = document?.title
    || document?.titre
    || document?.originalFileName
    || (isCorrection ? 'Corrigé' : 'Document PDF');

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

  const isOwner = user && document?.uploadedBy && (user._id === (document.uploadedBy._id || document.uploadedBy));
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
      wasSubjectDownloading
      && !isSubjectDownloading
      && isSubjectDownloaded
      && hasCorrection
      && promptEnabled
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
            } catch (error) {
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

  if (!document) return null;

  const fileConfig = getFileIcon(document.fileType || document.extension);
  const primaryLabel = isSubjectDownloaded
    ? (isCorrection ? 'Ouvrir le corrigé' : 'Ouvrir le PDF')
    : (isCorrection ? 'Télécharger le corrigé' : 'Télécharger le PDF');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.hero, { paddingTop: insets.top + theme.spacing.base }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={theme.hitSlop}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.headerPressed]}
          >
            <ArrowLeft size={21} color="#FFFFFF" strokeWidth={1.9} />
          </Pressable>

          <View style={styles.brandLockup}>
            <View style={styles.brandRule} />
            <Text variant="overline" style={styles.brandName}>Éducation CI</Text>
          </View>

          {canDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Supprimer le document"
              hitSlop={theme.hitSlop}
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.headerPressed]}
            >
              <Trash2 size={18} color="#F4E6C8" strokeWidth={1.8} />
            </Pressable>
          ) : <View style={styles.headerSpacer} />}
        </View>

        <View style={styles.heroCopy}>
          <View style={styles.documentTypeRow}>
            <View style={[styles.typeRule, { backgroundColor: fileConfig.label === 'PDF' ? BURGUNDY : GOLD }]} />
            <Text variant="overline" style={styles.documentType}>{fileConfig.label}</Text>
            {document.correction ? <Text variant="overline" style={styles.correctionMarker}>Corrigé disponible</Text> : null}
          </View>
          <Text variant="h1" style={styles.title} numberOfLines={3}>{displayTitle}</Text>
          <Text variant="body" style={styles.documentSummary}>
            Ajouté le {formatDate(document.createdAt)} · {document.downloads || 0} téléchargement{document.downloads > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 156 + Math.max(insets.bottom, theme.spacing.lg) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Download size={16} color={BURGUNDY} strokeWidth={1.8} />
            <Text variant="h3" style={styles.metricValue}>{document.downloads || 0}</Text>
            <Text variant="caption" style={styles.metricLabel}>Téléchargements</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Eye size={16} color={GOLD} strokeWidth={1.8} />
            <Text variant="h3" style={styles.metricValue}>{document.views || 0}</Text>
            <Text variant="caption" style={styles.metricLabel}>Consultations</Text>
          </View>
        </View>

        {isSubjectDownloaded ? (
          <View style={styles.localNotice}>
            <CheckCircle2 size={19} color={GOLD} strokeWidth={1.8} />
            <View style={styles.localNoticeCopy}>
              <Text variant="bodyMedium" style={styles.localNoticeTitle}>Disponible hors connexion</Text>
              <Text variant="caption" style={styles.localNoticeText}>Ce fichier est enregistré sur ton appareil.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Partager le document"
              onPress={shareSubject}
              style={({ pressed }) => [styles.shareLink, pressed && styles.linkPressed]}
            >
              <Share2 size={16} color={BURGUNDY} strokeWidth={1.8} />
              <Text variant="caption" style={styles.shareLabel}>Partager</Text>
            </Pressable>
          </View>
        ) : null}

        {document.description ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="overline" style={styles.sectionEyebrow}>À propos</Text>
              <View style={styles.sectionRule} />
            </View>
            <Text variant="body" style={styles.descriptionText}>{document.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="overline" style={styles.sectionEyebrow}>Informations</Text>
            <View style={styles.sectionRule} />
          </View>
          <View style={styles.infoList}>
            <InfoRow icon={Building2} label="Institution" value={document.institution?.name} />
            <InfoRow icon={Building2} label="Université" value={document.university?.name} />
            <InfoRow icon={Layers} label="Département" value={document.department?.name} />
            <InfoRow icon={GraduationCap} label="Niveau" value={document.level?.name} />
            <InfoRow icon={Calendar} label="Session" value={document.semester?.displayName || document.semester?.name} />
            <InfoRow icon={FolderOpen} label="Catégorie" value={document.category?.name} />
            {(document.taxonomyNodes || []).map((node) => (
              <InfoRow
                key={node._id || `${node.type}-${node.name}`}
                icon={Layers}
                label={node.type?.replace(/[-_]/g, ' ') || 'Niveau'}
                value={node.name}
              />
            ))}
            <InfoRow icon={FileText} label="Taille" value={formatFileSize(document.fileSize)} isLast />
          </View>
        </View>

        {hasCorrection ? (
          <View style={styles.correctionSection}>
            <View style={styles.sectionHeader}>
              <Text variant="overline" style={[styles.sectionEyebrow, { color: GOLD }]}>Corrigé associé</Text>
              <View style={styles.sectionRule} />
            </View>
            <Text variant="body" style={styles.correctionDescription}>
              Une correction est disponible pour ce sujet et peut être enregistrée à tout moment.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isCorrectionDownloaded ? 'Ouvrir le corrigé' : 'Télécharger le corrigé'}
              disabled={isCorrectionDownloading}
              onPress={handleCorrectionAction}
              style={({ pressed }) => [styles.correctionAction, pressed && styles.correctionActionPressed, isCorrectionDownloading && styles.actionDisabled]}
            >
              {isCorrectionDownloading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text variant="bodyMedium" style={styles.correctionActionText}>
                {isCorrectionDownloaded ? 'Ouvrir le corrigé' : 'Télécharger le corrigé'}
              </Text>
              {!isCorrectionDownloading ? <ArrowUpRight size={17} color="#FFFFFF" strokeWidth={1.8} /> : null}
            </Pressable>
            {isCorrectionDownloading ? (
              <ProgressBar progress={correctionProgress} color={GOLD} style={styles.correctionProgress} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
        {isSubjectDownloading ? (
          <View style={styles.progressContainer}>
            <Text variant="caption" style={styles.progressText}>
              Téléchargement en cours · {Math.round(subjectProgress * 100)}%
            </Text>
            <ProgressBar progress={subjectProgress} color={BURGUNDY} style={styles.primaryProgress} />
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          disabled={isSubjectDownloading || isSubjectInitializing}
          onPress={handlePrimaryAction}
          style={({ pressed }) => [
            styles.primaryAction,
            isSubjectDownloaded && styles.primaryActionDownloaded,
            pressed && styles.primaryActionPressed,
            (isSubjectDownloading || isSubjectInitializing) && styles.actionDisabled,
          ]}
        >
          {isSubjectInitializing ? (
            <ActivityIndicator size="small" color={isSubjectDownloaded ? NAVY : '#FFFFFF'} />
          ) : (
            <>
              {isSubjectDownloaded ? <FileText size={18} color={NAVY} strokeWidth={1.8} /> : <Download size={18} color="#FFFFFF" strokeWidth={1.8} />}
              <Text variant="bodyMedium" style={[styles.primaryActionLabel, isSubjectDownloaded && styles.primaryActionLabelDownloaded]}>{primaryLabel}</Text>
              <ArrowUpRight size={17} color={isSubjectDownloaded ? NAVY : '#FFFFFF'} strokeWidth={1.8} />
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={showCorrectionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCorrectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalRule} />
            <Text variant="overline" style={styles.modalEyebrow}>Document associé</Text>
            <Text variant="h3" align="center" style={styles.modalTitle}>Corrigé disponible</Text>
            <Text variant="body" style={styles.modalText} align="center">
              Une correction est disponible pour ce sujet. Souhaites-tu la télécharger maintenant ?
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontAskAgain }}
              onPress={handleToggleDontAskAgain}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
                {dontAskAgain ? <Check size={14} color="#FFFFFF" strokeWidth={2} /> : null}
              </View>
              <Text variant="bodyMedium" style={styles.checkboxLabel}>
                Ne plus me proposer automatiquement les corrections.
              </Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleModalChoice(false)}
                style={({ pressed }) => [styles.modalSecondary, pressed && styles.linkPressed]}
              >
                <Text variant="bodyMedium" style={styles.modalSecondaryLabel}>Plus tard</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleModalChoice(true)}
                style={({ pressed }) => [styles.modalPrimary, pressed && styles.correctionActionPressed]}
              >
                <Text variant="bodyMedium" style={styles.modalPrimaryLabel}>Télécharger maintenant</Text>
                <ArrowUpRight size={16} color="#FFFFFF" strokeWidth={1.8} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandRule: {
    width: 18,
    height: 2,
    backgroundColor: GOLD,
  },
  brandName: {
    color: '#F4E6C8',
    fontSize: 10,
    letterSpacing: 1.25,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  headerSpacer: {
    width: 30,
  },
  headerPressed: {
    opacity: 0.62,
  },
  heroCopy: {
    marginTop: theme.spacing.xl,
  },
  documentTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  typeRule: {
    width: 14,
    height: 2,
  },
  documentType: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  correctionMarker: {
    color: '#F4E6C8',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  title: {
    marginTop: theme.spacing.sm,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  documentSummary: {
    marginTop: theme.spacing.sm,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  metrics: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  metric: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: theme.spacing.xl,
    backgroundColor: LINE,
  },
  metricValue: {
    color: NAVY,
    fontSize: 20,
    lineHeight: 25,
  },
  metricLabel: {
    color: NAVY_SOFT,
    fontSize: 11,
  },
  localNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
  },
  localNoticeCopy: {
    flex: 1,
  },
  localNoticeTitle: {
    color: NAVY,
    fontSize: 14,
  },
  localNoticeText: {
    marginTop: 1,
    color: NAVY_SOFT,
    fontSize: 11,
  },
  shareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shareLabel: {
    color: BURGUNDY,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 11,
  },
  linkPressed: {
    opacity: 0.62,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionEyebrow: {
    color: NAVY_SOFT,
    fontSize: 10,
    letterSpacing: 1.05,
  },
  sectionRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
  },
  descriptionText: {
    color: NAVY_SOFT,
    lineHeight: 22,
  },
  infoList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: NAVY_SOFT,
    fontSize: 10,
    letterSpacing: 0.9,
  },
  infoValue: {
    marginTop: 2,
    color: NAVY,
    fontSize: 14,
  },
  correctionSection: {
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  correctionDescription: {
    color: NAVY_SOFT,
    lineHeight: 21,
  },
  correctionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: BURGUNDY,
    borderRadius: theme.radius.sm,
  },
  correctionActionPressed: {
    opacity: 0.86,
  },
  correctionActionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  correctionProgress: {
    marginTop: theme.spacing.sm,
    height: 2,
  },
  actionBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: SURFACE,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  progressContainer: {
    marginBottom: theme.spacing.sm,
  },
  progressText: {
    marginBottom: theme.spacing.xs,
    color: NAVY_SOFT,
    fontSize: 11,
    textAlign: 'center',
  },
  primaryProgress: {
    height: 2,
  },
  primaryAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: NAVY,
    borderRadius: theme.radius.sm,
  },
  primaryActionDownloaded: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: NAVY,
  },
  primaryActionPressed: {
    opacity: 0.86,
  },
  primaryActionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  primaryActionLabelDownloaded: {
    color: NAVY,
  },
  actionDisabled: {
    opacity: 0.56,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(13, 27, 50, 0.62)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: SURFACE,
    borderRadius: theme.radius.lg,
  },
  modalRule: {
    width: 22,
    height: 2,
    backgroundColor: GOLD,
  },
  modalEyebrow: {
    marginTop: theme.spacing.md,
    color: BURGUNDY,
    fontSize: 10,
    letterSpacing: 1,
  },
  modalTitle: {
    marginTop: theme.spacing.sm,
    color: NAVY,
  },
  modalText: {
    marginTop: theme.spacing.sm,
    color: NAVY_SOFT,
    lineHeight: 21,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: theme.spacing.xl,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: NAVY_SOFT,
    borderRadius: theme.radius.sm,
  },
  checkboxChecked: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  checkboxLabel: {
    flex: 1,
    color: NAVY,
    fontSize: 13,
    lineHeight: 19,
  },
  modalActions: {
    width: '100%',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
  },
  modalSecondary: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryLabel: {
    color: NAVY_SOFT,
    fontSize: 14,
  },
  modalPrimary: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: BURGUNDY,
    borderRadius: theme.radius.sm,
  },
  modalPrimaryLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default DocumentDetailScreen;
