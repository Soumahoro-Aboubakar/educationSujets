import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Check,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Lock,
  Share2,
  Trash2,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import StateView from '../components/ui/StateView';
import ProgressBar from '../components/ui/ProgressBar';
import { SkeletonRows } from '../components/ui/Skeleton';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import { useDocumentAccess } from '../hooks/useDocumentAccess';
import AccessSheet from '../components/access/AccessSheet';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
import { formatDate, formatFileSize, formatNumber } from '../utils/format';
import { getCorrection, getDocumentTitle, getExtensionLabel, hasIncludedCorrection } from '../utils/document';
import AuthContext from '../context/AuthContext';
import { deleteDocument } from '../services/documents';
import theme from '../theme/tokens';

const { brand } = theme;

const labelOf = (item) => item?.nom || item?.name || '';
const capitalize = (value) => (value ? value.charAt(0).toLocaleUpperCase() + value.slice(1) : value);

// Chaîne des nœuds du catalogue (racine → feuille) à partir du nœud peuplé par l'API.
const nodeChain = (node) => {
  const chain = [];
  let current = node;
  while (current && typeof current === 'object' && current.nom) {
    chain.unshift(current);
    current = current.parentId;
  }
  return chain;
};

const InfoRow = ({ label, value, isLast }) => {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text variant="caption" style={styles.infoLabel}>{label}</Text>
      <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const DocumentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { documentId, document: initialDocument, context } = route.params;

  const { data, refetch, isError } = useDocument(documentId);
  const document = data || initialDocument;
  // La liste fournit `correction` ; le détail fournit `dynamicCorrection`.
  const correction = getCorrection(document) || getCorrection(initialDocument);
  const access = useDocumentAccess(navigation);
  const subjectDownload = useDownload(document, { onAccessDenied: access.deny });
  const correctionDownload = useDownload(correction, { onAccessDenied: access.deny });
  const {
    enabled: promptEnabled,
    setEnabled: setPromptEnabled,
    isLoaded: promptLoaded,
  } = useCorrectionPromptPreference();
  const { user } = useContext(AuthContext);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [wasSubjectDownloading, setWasSubjectDownloading] = useState(false);

  const isCorrection = document?.documentType === 'corrige' || document?.type === 'correction';
  const hasCorrection = !isCorrection && Boolean(correction);
  // Corrigé dans le même PDF que le sujet : rien d'autre à télécharger.
  const correctionIncluded = hasIncludedCorrection(document) || hasIncludedCorrection(initialDocument);
  const correctionInSubject = correctionIncluded && !hasCorrection;
  const displayTitle = getDocumentTitle(document);

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
    isInitializing: isCorrectionInitializing,
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
      && !isCorrectionDownloaded
    ) {
      setShowCorrectionModal(true);
    }

    setWasSubjectDownloading(isSubjectDownloading);
  }, [wasSubjectDownloading, isSubjectDownloading, isSubjectDownloaded, hasCorrection, promptEnabled, promptLoaded, isCorrectionDownloaded]);

  // Contexte du sujet : données du détail si peuplées, sinon celles du parcours.
  const details = useMemo(() => {
    if (!document) return [];
    const niveaux = context?.organisme?.structure?.niveaux || [];
    const chain = nodeChain(document.noeudId);
    const path = chain.length ? chain : (context?.path || []);
    const rows = [
      ['Organisme', labelOf(context?.organisme)],
      ['Parcours', labelOf(document.parcoursTypeId) || labelOf(context?.parcoursType)],
      ...path.map((node, index) => [niveaux[index]?.libelleSingulier || 'Niveau', labelOf(node)]),
      ['Matière', labelOf(document.matiereId) || labelOf(context?.matiere)],
      ['Institution', document.institution?.name],
      ['Université', document.university?.name],
      ['Département', document.department?.name],
      ['Niveau', document.level?.name],
      ['Session', document.semester?.displayName || document.semester?.name],
      ['Catégorie', document.category?.name],
      ...(document.taxonomyNodes || []).map((node) => [
        node.type ? capitalize(node.type.replace(/[-_]/g, ' ')) : 'Niveau',
        node.name,
      ]),
      ['Ajouté le', formatDate(document.dateAjout || document.createdAt)],
    ];
    return rows.filter(([, value]) => Boolean(value));
  }, [context, document]);

  const handleToggleDontAskAgain = async () => {
    const nextValue = !dontAskAgain;
    setDontAskAgain(nextValue);
    await setPromptEnabled(!nextValue);
  };

  // Un fichier déjà enregistré s'ouvre toujours ; un téléchargement passe par le contrôle d'accès.
  const handlePrimaryAction = () => {
    if (isSubjectDownloaded) openSubject();
    else access.guard(downloadSubject)();
  };

  const handleCorrectionAction = () => {
    if (!hasCorrection) return;
    if (isCorrectionDownloaded) openCorrection();
    else access.guard(downloadCorrection)();
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

  const eyebrow = [labelOf(context?.organisme), labelOf(document?.matiereId) || labelOf(context?.matiere)]
    .filter(Boolean)
    .join(' · ') || (isCorrection ? 'Corrigé' : 'Sujet');

  // Ouverture sans données préchargées (lien direct) : squelette puis erreur éventuelle.
  if (!document) {
    return (
      <View style={styles.container}>
        <ScreenHeader onBack={() => navigation.goBack()} eyebrow="Sujet" title={isError ? 'Sujet introuvable' : 'Chargement…'} />
        {isError ? (
          <StateView
            icon={FileText}
            title="Connexion impossible"
            description="Ce sujet n’a pas pu être chargé. Vérifie ta connexion puis réessaie."
            onRetry={refetch}
          />
        ) : <SkeletonRows count={5} />}
      </View>
    );
  }

  const fileLabel = [getExtensionLabel(document), formatFileSize(document.fileSize)].filter(Boolean).join(' · ');
  const subjectNoun = isCorrection ? 'le corrigé' : 'le sujet';
  const isLocked = Boolean(access.locked) && !isSubjectDownloaded;
  const primaryLabel = isSubjectDownloading
    ? `Téléchargement… ${Math.round(subjectProgress * 100)} %`
    : isSubjectDownloaded ? `Ouvrir ${subjectNoun}` : isLocked ? `Débloquer ${subjectNoun}` : `Télécharger ${subjectNoun}`;
  const primaryBusy = isSubjectDownloading || isSubjectInitializing;
  const correctionBusy = isCorrectionDownloading || isCorrectionInitializing;

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow={eyebrow}
        title={displayTitle}
        titleLines={3}
        right={canDelete ? (
          <HeaderIconButton icon={Trash2} label="Supprimer le document" onPress={handleDelete} />
        ) : null}
      >
        <View style={styles.headerTags}>
          <Text variant="caption" style={styles.headerTag}>{fileLabel}</Text>
          {hasCorrection || correctionIncluded ? (
            <View style={styles.headerChip}>
              <FileCheck size={12} color={brand.ink} strokeWidth={2} />
              <Text style={styles.headerChipLabel}>Corrigé disponible</Text>
            </View>
          ) : null}
        </View>
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + Math.max(insets.bottom, theme.spacing.lg) }]}
        showsVerticalScrollIndicator={false}
      >
        {isSubjectDownloaded ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.localNotice}>
            <CheckCircle2 size={18} color={brand.gold} strokeWidth={2} />
            <Text variant="bodyMedium" style={styles.localNoticeTitle}>Enregistré sur ton appareil</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Partager le document"
              hitSlop={theme.hitSlop}
              onPress={shareSubject}
              style={({ pressed }) => [styles.shareLink, pressed && styles.linkPressed]}
            >
              <Share2 size={15} color={brand.burgundy} strokeWidth={2} />
              <Text variant="caption" style={styles.shareLabel}>Partager</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {isLocked ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Document réservé aux membres. Voir comment y accéder."
              onPress={handlePrimaryAction}
              style={({ pressed }) => [styles.lockNotice, pressed && styles.secondaryPressed]}
            >
              <View style={styles.lockIcon}>
                <Lock size={17} color={brand.ink} strokeWidth={2} />
              </View>
              <View style={styles.correctionCopy}>
                <Text variant="bodyMedium" style={styles.correctionTitle}>Document réservé aux membres</Text>
                <Text variant="caption" style={styles.correctionText}>
                  {access.locked === 'AUTH_REQUIRED'
                    ? 'Le document est disponible. Connecte-toi pour vérifier ton accès.'
                    : 'Le document est disponible. Un abonnement actif est nécessaire pour le télécharger.'}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        {!isCorrection ? (
          <Animated.View entering={FadeInDown.duration(260).delay(60)} style={styles.correctionBlock}>
            <View style={[styles.correctionIcon, !hasCorrection && !correctionInSubject && styles.correctionIconMuted]}>
              <FileCheck size={18} color={hasCorrection || correctionInSubject ? brand.goldInk : brand.inkMuted} strokeWidth={1.8} />
            </View>
            <View style={styles.correctionCopy}>
              <Text variant="bodyMedium" style={styles.correctionTitle}>
                {hasCorrection ? 'Corrigé disponible' : correctionInSubject ? 'Corrigé inclus' : 'Pas encore de corrigé'}
              </Text>
              <Text variant="caption" style={styles.correctionText}>
                {hasCorrection
                  ? (isCorrectionDownloaded ? 'Enregistré sur ton appareil.' : 'Compare tes réponses une fois le sujet traité.')
                  : correctionInSubject
                    ? 'Il se trouve dans le même PDF, à la suite du sujet.'
                    : 'Le corrigé de ce sujet n’a pas encore été publié.'}
              </Text>
              {isCorrectionDownloading ? (
                <ProgressBar progress={correctionProgress} color={brand.gold} style={styles.correctionProgress} />
              ) : null}
            </View>
            {hasCorrection ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isCorrectionDownloaded ? 'Ouvrir le corrigé' : 'Télécharger le corrigé'}
                disabled={correctionBusy}
                onPress={handleCorrectionAction}
                style={({ pressed }) => [styles.correctionAction, pressed && styles.secondaryPressed, correctionBusy && styles.actionDisabled]}
              >
                {correctionBusy ? (
                  <ActivityIndicator size="small" color={brand.ink} />
                ) : (
                  <Text variant="bodyMedium" style={styles.correctionActionLabel}>
                    {isCorrectionDownloaded ? 'Ouvrir' : 'Télécharger'}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        {document.description ? (
          <View style={styles.section}>
            <Text variant="overline" style={styles.sectionTitle}>À propos</Text>
            <Text variant="body" style={styles.descriptionText}>{document.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="overline" style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoList}>
            {details.map(([label, value], index) => (
              <InfoRow key={`${label}-${index}`} label={label} value={value} isLast={index === details.length - 1} />
            ))}
          </View>
        </View>

        <Text variant="caption" style={styles.stats}>
          {formatNumber(document.views || 0)} consultation{document.views > 1 ? 's' : ''}
          {'  ·  '}
          {formatNumber(document.downloads || 0)} téléchargement{document.downloads > 1 ? 's' : ''}
        </Text>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.base) }]}>
        {isSubjectDownloading ? (
          <ProgressBar progress={subjectProgress} color={brand.burgundy} style={styles.primaryProgress} />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          accessibilityState={{ busy: primaryBusy }}
          disabled={primaryBusy}
          onPress={handlePrimaryAction}
          style={({ pressed }) => [
            styles.primaryAction,
            pressed && styles.primaryActionPressed,
            primaryBusy && styles.primaryActionBusy,
          ]}
        >
          {isSubjectInitializing ? (
            <ActivityIndicator size="small" color={brand.onInk} />
          ) : (
            <>
              {isSubjectDownloaded
                ? <FileText size={18} color={brand.onInk} strokeWidth={1.9} />
                : isLocked
                  ? <Lock size={18} color={brand.onInk} strokeWidth={1.9} />
                  : <Download size={18} color={brand.onInk} strokeWidth={1.9} />}
              <Text variant="bodyMedium" style={styles.primaryActionLabel}>{primaryLabel}</Text>
            </>
          )}
        </Pressable>
      </View>

      <AccessSheet {...access.sheetProps} />

      <Modal
        visible={showCorrectionModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCorrectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <FileCheck size={22} color={brand.goldInk} strokeWidth={1.8} />
            </View>
            <Text variant="h3" align="center" style={styles.modalTitle}>Le corrigé est disponible</Text>
            <Text variant="body" style={styles.modalText} align="center">
              Veux-tu aussi télécharger le corrigé de ce sujet ?
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontAskAgain }}
              onPress={handleToggleDontAskAgain}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
                {dontAskAgain ? <Check size={13} color={brand.onInk} strokeWidth={3} /> : null}
              </View>
              <Text variant="caption" style={styles.checkboxLabel}>
                Ne plus me le proposer
              </Text>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleModalChoice(false)}
                style={({ pressed }) => [styles.modalSecondary, pressed && styles.secondaryPressed]}
              >
                <Text variant="bodyMedium" style={styles.modalSecondaryLabel}>Plus tard</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleModalChoice(true)}
                style={({ pressed }) => [styles.modalPrimary, pressed && styles.primaryActionPressed]}
              >
                <Text variant="bodyMedium" style={styles.modalPrimaryLabel}>Télécharger</Text>
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
    backgroundColor: brand.paper,
  },
  headerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  headerTag: {
    color: brand.onInkSoft,
    fontSize: 12,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: brand.onInkAccent,
  },
  headerChipLabel: {
    color: brand.ink,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 11,
    lineHeight: 15,
  },
  scrollContent: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
  },
  localNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: brand.goldWash,
  },
  localNoticeTitle: {
    flex: 1,
    color: brand.ink,
    fontSize: 14,
  },
  shareLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shareLabel: {
    color: brand.burgundy,
    fontFamily: theme.fontFamily.semiBold,
    fontSize: 13,
  },
  linkPressed: {
    opacity: 0.6,
  },
  correctionBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.base,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.lineStrong,
    backgroundColor: theme.colors.surface,
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.base,
    borderRadius: theme.radius.md,
    backgroundColor: brand.goldWash,
  },
  lockIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
  },
  correctionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: brand.goldWash,
  },
  correctionIconMuted: {
    backgroundColor: brand.paperDim,
  },
  correctionCopy: {
    flex: 1,
  },
  correctionTitle: {
    color: brand.ink,
    fontSize: 15,
  },
  correctionText: {
    marginTop: 2,
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  correctionProgress: {
    height: 2,
    marginTop: theme.spacing.sm,
    backgroundColor: brand.line,
  },
  correctionAction: {
    minWidth: 96,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: brand.ink,
  },
  correctionActionLabel: {
    color: brand.ink,
    fontSize: 14,
  },
  secondaryPressed: {
    backgroundColor: brand.pressed,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    color: brand.inkSoft,
  },
  descriptionText: {
    color: brand.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  infoList: {
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.base,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    fontSize: 14,
  },
  infoValue: {
    flexShrink: 1,
    color: brand.ink,
    fontSize: 14,
    textAlign: 'right',
  },
  stats: {
    marginTop: theme.spacing.lg,
    color: brand.inkMuted,
    fontFamily: theme.fontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.md,
    backgroundColor: brand.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  primaryProgress: {
    height: 2,
    marginBottom: theme.spacing.md,
    backgroundColor: brand.line,
  },
  primaryAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: brand.ink,
    borderRadius: theme.radius.md,
  },
  primaryActionPressed: {
    opacity: 0.88,
  },
  primaryActionBusy: {
    backgroundColor: brand.inkSoft,
  },
  primaryActionLabel: {
    color: brand.onInk,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    backgroundColor: brand.backdrop,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: brand.paper,
    borderRadius: theme.radius.xl,
  },
  modalIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    backgroundColor: brand.goldWash,
  },
  modalTitle: {
    marginTop: theme.spacing.base,
    color: brand.ink,
  },
  modalText: {
    marginTop: 6,
    color: brand.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: theme.layout.touch,
    marginTop: theme.spacing.base,
  },
  checkbox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: brand.lineStrong,
    borderRadius: 5,
  },
  checkboxChecked: {
    backgroundColor: brand.ink,
    borderColor: brand.ink,
  },
  checkboxLabel: {
    color: brand.inkSoft,
    fontFamily: theme.fontFamily.regular,
    fontSize: 13,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  modalSecondary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: brand.lineStrong,
  },
  modalSecondaryLabel: {
    color: brand.ink,
    fontSize: 15,
  },
  modalPrimary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: brand.ink,
  },
  modalPrimaryLabel: {
    color: brand.onInk,
    fontSize: 15,
  },
});

export default DocumentDetailScreen;
