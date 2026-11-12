import useAsyncAction from '../hooks/useAsyncAction';
import Pressable from '../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import { getErrorAlert, getUserMessage } from '../utils/userMessages';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  Gift,
  Clock,
} from 'lucide-react-native';
import Text from '../components/ui/Text';
import { PrepButton } from '../prep/ui/primitives';
import { useReduceMotion } from '../prep/feedback';
import ScreenHeader, { HeaderIconButton } from '../components/ui/ScreenHeader';
import StateView from '../components/ui/StateView';
import ProgressBar from '../components/ui/ProgressBar';
import { SkeletonRows } from '../components/ui/Skeleton';
import { useDocument } from '../hooks/useDocument';
import { useDownload } from '../hooks/useDownload';
import { useDocumentAccess } from '../hooks/useDocumentAccess';
import AccessSheet from '../components/access/AccessSheet';
import useCorrectionPromptPreference from '../hooks/useCorrectionPromptPreference';
import { formatDate, formatFileSize, formatNumber, formatRenewal } from '../utils/format';
import { getCorrection, getDocumentTitle, getExtensionLabel, hasIncludedCorrection } from '../utils/document';
import AuthContext from '../context/AuthContext';
import { deleteDocument } from '../services/documents';

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
  const { styles } = useStyles();
  if (!value) return null;
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text variant="caption" style={styles.infoLabel}>{label}</Text>
      <Text variant="bodyMedium" style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const DocumentDetailScreen = () => {
  const [runDelete, deleting] = useAsyncAction();
  const reduce = useReduceMotion();
  const { brand, theme } = useTheme();
  const { styles } = useStyles();
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { documentId, document: initialDocument, context } = route.params;

  const { data, refetch, isError, error: documentError } = useDocument(documentId);
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
    saving: promptSaving,
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
    await setPromptEnabled(!nextValue);
  };

  // Un fichier déjà enregistré s'ouvre toujours ; un téléchargement passe par le contrôle d'accès.
  const handlePrimaryAction = () => {
    if (isSubjectDownloaded) return openSubject();
    return access.guard(downloadSubject)();
  };

  const handleCorrectionAction = () => {
    if (!hasCorrection) return;
    if (isCorrectionDownloaded) return openCorrection();
    return access.guard(downloadCorrection)();
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le document',
      'Souhaites-tu supprimer ce document ? Il sera déplacé vers la corbeille.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => runDelete(async () => {
            try {
              await deleteDocument(document._id || document.id);
              Alert.alert('Succès', 'Document placé dans la corbeille.');
              navigation.goBack();
            } catch (error) {
              Alert.alert(...getErrorAlert(error, 'suppression', 'tu'));
            }
          }),
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
      return downloadCorrection();
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
            title={getUserMessage(documentError, 'documents').title}
            description={getUserMessage(documentError, 'documents').message}
            onRetry={refetch}
          />
        ) : <SkeletonRows count={5} />}
      </View>
    );
  }

  const fileLabel = [getExtensionLabel(document), formatFileSize(document.fileSize)].filter(Boolean).join(' · ');
  const subjectNoun = isCorrection ? 'le corrigé' : 'le sujet';
  const quotaExhausted = document?.access?.tier === 'recent' && access.quota && !access.quota.unlimited
    && access.quota.remaining === 0 && !access.quota.documentIds?.includes?.(document._id);
  // Sans abonnement : sujets de 2021 et après (ou d'année inconnue) réservés aux abonnés.
  const freePlan = access.quota?.plan === 'free';
  const needsSubscription = freePlan && document?.access?.tier === 'recent' && !document.access.freeQuotaEligible;
  // Cadenas affiché d'avance ; le serveur reste seul juge et la feuille explique son refus.
  const isLocked = (Boolean(access.locked) || needsSubscription || (freePlan && quotaExhausted)) && !isSubjectDownloaded;
  const primaryLabel = isSubjectDownloading
    ? (Number.isFinite(subjectProgress) ? `Téléchargement… ${Math.round(subjectProgress * 100)} %` : 'Téléchargement…')
    : isSubjectDownloaded ? `Ouvrir ${subjectNoun}` : isLocked ? `Débloquer ${subjectNoun}` : `Télécharger ${subjectNoun}`;
  const primaryBusy = isSubjectDownloading || isSubjectInitializing || subjectDownload.isFilePending;
  const correctionBusy = isCorrectionDownloading || isCorrectionInitializing || correctionDownload.isFilePending;

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow={eyebrow}
        title={displayTitle}
        titleLines={3}
        right={canDelete ? (
          <HeaderIconButton icon={Trash2} label="Supprimer le document" loading={deleting} disabled={deleting} onPress={handleDelete} />
        ) : null}
      >
        <View style={styles.headerTags}>
          <Text variant="caption" style={styles.headerTag}>{fileLabel}</Text>
          {hasCorrection || correctionIncluded ? (
            <View style={styles.headerChip}>
              <FileCheck size={12} color={brand.onGold} strokeWidth={2} />
              <Text style={styles.headerChipLabel}>Corrigé disponible</Text>
            </View>
          ) : null}
        </View>
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.xl }]}
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
              disabled={subjectDownload.isFilePending}
              style={({ pressed }) => [styles.shareLink, pressed && styles.linkPressed]}
            >
              <Share2 size={15} color={brand.burgundy} strokeWidth={2} />
              <Text variant="caption" style={styles.shareLabel}>Partager</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Règle d'accès : gratuit (2009 et avant), quota gratuit (2010-2020) ou abonnement. */}
        {!isSubjectDownloaded && document?.access ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.lockNotice}>
            <View style={styles.lockIcon}>
              {document.access.tier === 'free'
                ? <Gift size={17} color={brand.goldInk} strokeWidth={2} />
                : needsSubscription
                  ? <Lock size={17} color={brand.ink} strokeWidth={2} />
                  : <Clock size={17} color={brand.ink} strokeWidth={2} />}
            </View>
            <View style={styles.correctionCopy}>
              <Text variant="bodyMedium" style={styles.correctionTitle}>
                {document.access.tier === 'free' ? 'Sujet gratuit'
                  : needsSubscription ? 'Réservé aux abonnés'
                    : quotaExhausted ? (freePlan ? 'Téléchargements gratuits utilisés' : 'Quota de sujets récents atteint')
                      : freePlan ? 'Éligible au quota gratuit' : 'Sujet récent'}
              </Text>
              <Text variant="caption" style={styles.correctionText}>
                {document.access.tier === 'free'
                  ? `Sujet de ${document.access.year} : téléchargement gratuit et illimité, sans compte.`
                  : needsSubscription
                    ? 'Ce sujet est réservé aux utilisateurs disposant d’un abonnement valide.'
                    : quotaExhausted
                      ? (freePlan
                        ? `Tu as utilisé tes ${access.quota.limit} téléchargements gratuits. Un abonnement est nécessaire pour continuer à télécharger des sujets. Les sujets de ${access.quota.freeUntilYear} et avant restent gratuits.`
                        : `Tu as utilisé tes téléchargements de sujets récents.${formatRenewal(access.quota?.nextRenewalAt) ? ` Prochain à partir du ${formatRenewal(access.quota.nextRenewalAt)}.` : ''} Les sujets de ${access.quota?.freeUntilYear || 2009} et avant restent gratuits.`)
                      : access.quota && !access.quota.unlimited
                        ? (freePlan
                          ? `Ce sujet est éligible à ton quota gratuit. Il te reste ${access.quota.remaining} téléchargement${access.quota.remaining > 1 ? 's' : ''} gratuit${access.quota.remaining > 1 ? 's' : ''}.`
                          : `${access.quota.remaining} sujet${access.quota.remaining > 1 ? 's' : ''} récent${access.quota.remaining > 1 ? 's' : ''} encore disponible${access.quota.remaining > 1 ? 's' : ''} sur ${access.quota.windowHours} h.`)
                        : 'Téléchargement selon ton accès.'}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {!isCorrection ? (
          <Animated.View entering={reduce ? FadeIn.duration(150) : FadeInDown.duration(260).delay(60)} style={styles.correctionBlock}>
            <View style={[styles.correctionIcon, !hasCorrection && !correctionInSubject && styles.correctionIconMuted]}>
              <FileCheck size={18} color={hasCorrection || correctionInSubject ? brand.goldInk : brand.inkMuted} strokeWidth={2} />
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
                <View style={{ gap: 6 }}>{Number.isFinite(correctionProgress) ? <ProgressBar progress={correctionProgress} color={brand.gold} style={styles.correctionProgress} /> : null}<Text variant="caption" style={styles.correctionText}>{Number.isFinite(correctionProgress) ? `Téléchargement… ${Math.round(correctionProgress * 100)} %` : 'Téléchargement…'}</Text></View>
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
                {({ pending }) => <>
                  <Text variant="bodyMedium" style={[styles.correctionActionLabel, (pending || correctionBusy) && { opacity: 0 }]}>
                    {isCorrectionDownloaded ? 'Ouvrir' : 'Télécharger'}
                  </Text>
                  {pending || correctionBusy ? <ActivityIndicator size="small" color={brand.ink} style={StyleSheet.absoluteFill} /> : null}
                </>}
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
          <View style={{ gap: 6 }}>
            {Number.isFinite(subjectProgress) ? <ProgressBar progress={subjectProgress} color={brand.burgundy} style={styles.primaryProgress} /> : null}
            <Text variant="caption" style={{ color: brand.inkSoft }}>{primaryLabel}</Text>
          </View>
        ) : null}
        <PrepButton
          title={primaryLabel}
          accessibilityLabel={primaryLabel}
          accessibilityState={{ busy: primaryBusy }}
          disabled={primaryBusy}
          loading={isSubjectInitializing}
          onPress={handlePrimaryAction}
          iconLeft={isSubjectDownloaded ? FileText : isLocked ? Lock : Download}
        />
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
          <ScrollView style={[styles.modalContent, { maxHeight: height * 0.85 }]} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <View style={styles.modalIcon}>
              <FileCheck size={22} color={brand.goldInk} strokeWidth={2} />
            </View>
            <Text variant="h3" align="center" style={styles.modalTitle}>Le corrigé est disponible</Text>
            <Text variant="body" style={styles.modalText} align="center">
              Veux-tu aussi télécharger le corrigé de ce sujet ?
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: dontAskAgain }}
              onPress={handleToggleDontAskAgain}
              disabled={promptSaving}
              style={styles.checkboxRow}
            >
              <View style={[styles.checkbox, dontAskAgain && styles.checkboxChecked]}>
                {dontAskAgain ? <Check size={13} color={brand.onInk} strokeWidth={2.2} /> : null}
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

export default DocumentDetailScreen;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    container: { ...theme.layout.readingFrame,
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
      color: brand.onGold,
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 11,
      lineHeight: 15,
    },
    scrollContent: {
      paddingHorizontal: theme.layout.gutter,
      paddingTop: theme.spacing.lg,
    },
    localNotice: {
      flexDirection: 'row', flexWrap: 'wrap',
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
      gap: 6,
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 17,
      backgroundColor: brand.burgundyWash,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.brand.actionBorderSoft,
    },
    shareLabel: {
      color: brand.burgundy,
      fontFamily: theme.fontFamily.semiBold,
      fontSize: 13,
    },
    linkPressed: {
      opacity: brand.inactiveOpacity,
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
      minHeight: 44,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
    },
    correctionIcon: {
      width: 40,
      minHeight: 44,
      paddingVertical: 8,
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
      opacity: brand.inactiveOpacity,
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
    primaryActionPressed: {
      opacity: 0.88,
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
      minHeight: 48,
      paddingVertical: 10,
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
      backgroundColor: brand.night,
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
      backgroundColor: brand.night,
    },
    modalPrimaryLabel: {
      color: brand.onInk,
      fontSize: 15,
    },
  });
  return { styles };
});
