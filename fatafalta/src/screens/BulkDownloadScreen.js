import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AlertTriangle, Check, CheckCircle2, Clock, Download, FileCheck, FileText, Gift, Layers3, Lock } from 'lucide-react-native';
import Text from '../components/ui/Text';
import ScreenHeader from '../components/ui/ScreenHeader';
import StateView from '../components/ui/StateView';
import ActionButton from '../components/ui/ActionButton';
import ProgressBar from '../components/ui/ProgressBar';
import { SkeletonRows } from '../components/ui/Skeleton';
import AccessSheet from '../components/access/AccessSheet';
import OrganismeLogo from '../components/catalog/OrganismeLogo';
import { useDocumentAccess } from '../hooks/useDocumentAccess';
import { useRefreshAccount } from '../hooks/useAccount';
import { fetchBundleFiles, fetchDownloadScope, previewDownloadSelection } from '../services/documents';
import { getErrorCode, getErrorMessage } from '../services/billing';
import useDownloadStore from '../store/useDownloadStore';
import { formatFileSize, formatRenewal } from '../utils/format';
import theme from '../theme/tokens';

const { brand } = theme;

/*
 * Téléchargement groupé (mobile) : organisme → cycle (un seul par opération) → années, matières.
 * Sélection par cases à cocher ; récapitulatif contrôlé par le serveur (gratuits, récents, quota).
 * Les fichiers sont enregistrés un par un dans l'application (onglet Téléchargements), comme un
 * téléchargement individuel : consultables hors ligne, partageables. Le serveur revérifie tout.
 */

const ACCESS_CODES = ['SUBSCRIPTION_REQUIRED', 'DAILY_LIMIT_REACHED', 'ACCOUNT_DISABLED'];
const NO_YEAR = 'inconnue';
const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;
// Sans abonnement (`plan` 'free') : sujets 2010-2020 sur le quota gratuit, plus récents réservés aux abonnés.
const reservedFor = (item, plan) => plan === 'free' && item.tier !== 'free' && !item.freeQuotaEligible;
const tierLabel = (item, plan) => {
  if (item.tier === 'free') return 'Gratuit';
  if (plan !== 'free') return 'Récent';
  return reservedFor(item, plan) ? 'Abonnés' : 'Quota gratuit';
};

const Chip = ({ label, active, onPress, count }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    {count !== undefined ? <Text style={[styles.chipCount, active && styles.chipLabelActive]}>{count}</Text> : null}
  </Pressable>
);

const ChipRow = ({ title, hint, children }) => (
  <View style={styles.chipGroup}>
    <View style={styles.chipGroupHeader}>
      <Text variant="overline" style={styles.chipGroupTitle}>{title}</Text>
      {hint ? <Text variant="caption" style={styles.chipGroupHint}>{hint}</Text> : null}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  </View>
);

const describe = (item) => [
  item.yearKnown ? String(item.year) : 'Année non précisée',
  item.matiere?.nom,
  item.kind === 'corrige' ? 'Corrigé' : item.correctionIncludedInPdf ? 'Corrigé inclus' : null,
  formatFileSize(item.fileSize),
].filter(Boolean).join(' · ');

const BulkDownloadScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const organisme = route.params?.organisme || null;
  const [cycleId, setCycleId] = useState(route.params?.parcoursType?._id || '');
  const [year, setYear] = useState(route.params?.annee ? String(route.params.annee) : '');
  const [matieres, setMatieres] = useState(route.params?.matiereId ? [route.params.matiereId] : []);

  const [scope, setScope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [summary, setSummary] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [progress, setProgress] = useState(null);

  const access = useDocumentAccess(navigation);
  const refreshAccount = useRefreshAccount();
  const startDownload = useDownloadStore((state) => state.startDownload);

  const load = useCallback(async () => {
    if (!organisme?._id) return;
    setLoading(true);
    setLoadError(false);
    try {
      setScope(await fetchDownloadScope({ organisme: organisme._id, parcoursTypeId: cycleId || undefined }));
    } catch (error) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [organisme?._id, cycleId]);

  useEffect(() => { load(); }, [load]);

  // Une opération ne mélange jamais deux cycles : changer de cycle vide la sélection.
  const scopeKey = scope?.cycle?._id || '';
  const lastScope = useRef(scopeKey);
  useEffect(() => {
    if (lastScope.current !== scopeKey) {
      lastScope.current = scopeKey;
      setSelected(new Set());
      setMessage(null);
    }
  }, [scopeKey]);

  const documents = useMemo(() => scope?.documents || [], [scope]);
  const byId = useMemo(() => new Map(documents.map((item) => [item._id, item])), [documents]);
  const visible = useMemo(() => documents.filter((item) => (
    (!year || (year === NO_YEAR ? !item.yearKnown : String(item.year) === year))
    && (!matieres.length || matieres.includes(item.matiere?._id))
  )), [documents, year, matieres]);
  const selectedItems = useMemo(() => [...selected].map((id) => byId.get(id)).filter(Boolean), [selected, byId]);
  const selectionKey = selectedItems.map((item) => item._id).sort().join(',');

  // Récapitulatif serveur, après chaque changement de sélection.
  useEffect(() => {
    if (!selectionKey) { setSummary(null); return undefined; }
    let cancelled = false;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await previewDownloadSelection(selectionKey.split(','));
        if (!cancelled) setSummary(result);
      } catch (error) {
        if (!cancelled) setMessage({ error: true, text: getErrorMessage(error, 'La sélection n’a pas pu être vérifiée.') });
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [selectionKey]);

  const toggle = (id) => {
    Haptics.selectionAsync().catch(() => {});
    setMessage(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item._id));
  const toggleAll = () => setSelected((current) => {
    const next = new Set(current);
    visible.forEach((item) => (allVisibleSelected ? next.delete(item._id) : next.add(item._id)));
    return next;
  });
  const keepWithinQuota = () => {
    if (!summary) return;
    const granted = new Set(summary.documents.filter((item) => item.alreadyGranted).map((item) => item._id));
    const blockedIds = new Set(summary.blocked || []);
    let budget = summary.quota.remaining ?? Infinity;
    setSelected(new Set(selectedItems.filter((item) => {
      if (blockedIds.has(item._id)) return false;
      if (item.tier === 'free' || granted.has(item._id)) return true;
      if (budget > 0) { budget -= 1; return true; }
      return false;
    }).map((item) => item._id)));
  };

  const chooseCycle = (id) => {
    if (id === scopeKey) return;
    const apply = () => { setCycleId(id); setYear(''); setMatieres([]); };
    if (!selected.size) { apply(); return; }
    Alert.alert('Changer de cycle ?', 'Un téléchargement groupé ne concerne qu’un seul cycle. Ta sélection actuelle sera retirée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Changer', onPress: apply },
    ]);
  };

  const start = async () => {
    setMessage(null);
    setProgress({ done: 0, total: selectedItems.length, failed: 0 });
    try {
      const { files, missing } = await fetchBundleFiles(selectedItems.map((item) => item._id));
      let failed = missing.length;
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        try {
          await startDownload(file._id, file.url, {
            _id: file._id,
            title: file.title,
            originalFileName: file.originalFileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            documentType: file.kind === 'corrige' ? 'corrige' : 'sujet',
          }, file.fileName);
        } catch (error) {
          failed += 1;
        }
        setProgress({ done: index + 1, total: files.length, failed });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMessage({
        text: `${plural(files.length - (failed - missing.length), 'document enregistré', 'documents enregistrés')} dans Téléchargements.${failed ? ` ${plural(failed, 'fichier n’a', 'fichiers n’ont')} pas pu être enregistré${failed > 1 ? 's' : ''} : réessaie depuis sa fiche, il ne sera pas décompté une seconde fois.` : ''}`,
      });
      setSelected(new Set());
    } catch (error) {
      const code = getErrorCode(error);
      if (ACCESS_CODES.includes(code)) access.deny(code, error.response?.data?.details);
      else setMessage({ error: true, text: getErrorMessage(error, 'Le téléchargement n’a pas pu démarrer. Réessaie dans un instant.') });
    } finally {
      setProgress(null);
      refreshAccount();
    }
  };

  const quota = summary?.quota || scope?.quota;
  const counts = summary?.counts;
  const overflow = summary?.overflow || 0;
  const canStart = selectedItems.length > 0 && summary?.canProceed && !checking && !progress;
  const renewal = formatRenewal(quota?.nextRenewalAt);

  const header = (
    <View>
      {scope?.cycles?.length > 1 ? (
        <ChipRow title="Cycle" hint="Un seul par téléchargement">
          {scope.cycles.map((cycle) => (
            <Chip key={cycle._id} label={cycle.nom} count={cycle.subjectCount} active={scopeKey === cycle._id} onPress={() => chooseCycle(cycle._id)} />
          ))}
        </ChipRow>
      ) : null}
      {scope?.facets?.years?.length ? (
        <ChipRow title="Année">
          <Chip label="Toutes" active={!year} onPress={() => setYear('')} />
          {scope.facets.years.map((value) => <Chip key={value} label={String(value)} active={year === String(value)} onPress={() => setYear(String(value))} />)}
          {scope.facets.hasUnknownYear ? <Chip label="Non précisée" active={year === NO_YEAR} onPress={() => setYear(NO_YEAR)} /> : null}
        </ChipRow>
      ) : null}
      {scope?.facets?.matieres?.length > 1 ? (
        <ChipRow title="Matières" hint={matieres.length ? plural(matieres.length, 'choisie', 'choisies') : 'Toutes'}>
          {scope.facets.matieres.map((matiere) => (
            <Chip
              key={matiere._id}
              label={matiere.nom}
              active={matieres.includes(matiere._id)}
              onPress={() => setMatieres((current) => (current.includes(matiere._id) ? current.filter((value) => value !== matiere._id) : [...current, matiere._id]))}
            />
          ))}
        </ChipRow>
      ) : null}
      {visible.length ? (
        <View style={styles.listHeader}>
          <Text variant="caption" style={styles.listCount}>
            {`${plural(visible.length, 'document')} · ${plural(visible.filter((item) => item.tier === 'free').length, 'gratuit')}`}
          </Text>
          <Pressable accessibilityRole="button" onPress={toggleAll} hitSlop={theme.hitSlop} style={({ pressed }) => pressed && styles.pressed}>
            <Text variant="bodyMedium" style={styles.link}>{allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }) => {
    const checked = selected.has(item._id);
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${item.title}, ${describe(item)}, ${tierLabel(item, quota?.plan).toLowerCase()}`}
        onPress={() => toggle(item._id)}
        android_ripple={{ color: brand.pressed }}
        style={({ pressed }) => [styles.row, checked && styles.rowChecked, pressed && styles.pressed]}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Check size={15} color={brand.onInk} strokeWidth={3} /> : null}
        </View>
        <View style={styles.rowIcon}>
          {item.kind === 'corrige' ? <FileCheck size={17} color={brand.ink} strokeWidth={1.8} /> : <FileText size={17} color={brand.ink} strokeWidth={1.8} />}
        </View>
        <View style={styles.rowContent}>
          <Text variant="bodyMedium" style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
          <Text variant="caption" style={styles.rowMeta} numberOfLines={1}>{describe(item)}</Text>
        </View>
        <View style={[styles.badge, item.tier === 'free' ? styles.badgeFree : styles.badgeRecent]}>
          {item.tier === 'free' ? <Gift size={11} color={brand.goldInk} strokeWidth={2.2} />
            : reservedFor(item, quota?.plan) ? <Lock size={11} color={brand.inkSoft} strokeWidth={2.2} />
              : <Clock size={11} color={brand.inkSoft} strokeWidth={2.2} />}
          <Text style={[styles.badgeLabel, item.tier === 'free' && styles.badgeLabelFree]}>{tierLabel(item, quota?.plan)}</Text>
        </View>
      </Pressable>
    );
  };

  const renderBody = () => {
    if (loading && !scope) return <SkeletonRows count={6} />;
    if (loadError) return <StateView icon={Layers3} title="Connexion impossible" description="Les sujets n’ont pas pu être chargés. Vérifie ta connexion puis réessaie." onRetry={load} />;
    if (scope?.requiresCycle && !scope.cycle) {
      return (
        <ScrollView contentContainerStyle={styles.cyclePicker}>
          {header}
          <StateView icon={Layers3} title="Choisis un cycle" description="Les sujets de cet organisme sont classés par cycle. Un téléchargement groupé concerne un seul cycle à la fois." />
        </ScrollView>
      );
    }
    return (
      <FlatList
        data={visible}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<StateView icon={FileText} title="Aucun document" description="Aucun document publié ne correspond à ces filtres." />}
        contentContainerStyle={{ paddingBottom: 220 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        eyebrow={organisme?.nom || organisme?.name}
        title="Plusieurs sujets"
        subtitle="Sujets de 2009 et avant gratuits, sans compte."
        right={organisme ? <OrganismeLogo organisme={organisme} size={36} /> : null}
      />
      <View style={styles.body}>{renderBody()}</View>

      {/* Récapitulatif fixe : sélection, gratuits, récents, quota, action. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
        {progress ? (
          <View style={styles.progress}>
            <Text variant="bodyMedium" style={styles.footerTitle}>{`Enregistrement ${progress.done} / ${progress.total}…`}</Text>
            <ProgressBar progress={progress.total ? progress.done / progress.total : 0} />
          </View>
        ) : (
          <>
            <Text variant="bodyMedium" style={styles.footerTitle}>
              {selectedItems.length ? plural(selectedItems.length, 'document sélectionné', 'documents sélectionnés') : 'Sélectionne des documents'}
            </Text>
            {counts ? (
              <Text variant="caption" style={styles.footerMeta}>
                {quota?.lifetime
                  ? `${plural(counts.free, 'gratuit')} · ${plural(counts.recentToCharge, 'décompté', 'décomptés')} · ${plural(quota.remaining, 'téléchargement gratuit restant', 'téléchargements gratuits restants')}`
                  : `${plural(counts.free, 'gratuit')} · ${plural(counts.recentToCharge, 'récent décompté', 'récents décomptés')}${quota && !quota.unlimited ? ` · ${quota.remaining}/${quota.limit} récents disponibles` : ''}`}
              </Text>
            ) : quota && !quota.unlimited ? (
              <Text variant="caption" style={styles.footerMeta}>
                {quota.lifetime
                  ? `Il te reste ${plural(quota.remaining, 'téléchargement gratuit', 'téléchargements gratuits')} sur ${quota.limit} (sujets ${quota.freeUntilYear + 1}-${quota.freeQuotaUntilYear})`
                  : `${quota.remaining} sur ${quota.limit} sujets récents disponibles (${quota.windowHours} h glissantes)`}
              </Text>
            ) : null}

            {counts?.blocked > 0 ? (
              <View style={styles.warning}>
                <Lock size={16} color={brand.goldInk} strokeWidth={2} />
                <Text variant="caption" style={styles.warningText}>
                  {`${plural(counts.blocked, 'sujet est réservé', 'sujets sont réservés')} aux utilisateurs disposant d’un abonnement valide (${(quota?.freeQuotaUntilYear || 2020) + 1} et après, ou année non précisée). Retire-les pour continuer.`}
                </Text>
              </View>
            ) : null}

            {overflow > 0 ? (
              <View style={styles.warning}>
                <AlertTriangle size={16} color={brand.goldInk} strokeWidth={2} />
                <Text variant="caption" style={styles.warningText}>
                  {quota.lifetime
                    ? (quota.remaining === 0
                      ? `Tu as utilisé tes ${quota.limit} téléchargements gratuits. Un abonnement est nécessaire pour continuer. Les sujets de ${quota.freeUntilYear} et avant restent téléchargeables.`
                      : `Ta sélection contient ${plural(counts.recentToCharge, 'sujet décompté', 'sujets décomptés')}, mais il te reste ${plural(quota.remaining, 'téléchargement gratuit', 'téléchargements gratuits')}.`)
                    : quota.remaining === 0
                    ? `Ton quota de sujets récents est épuisé pour le moment${renewal ? ` (prochain à partir du ${renewal})` : ''}. Les sujets gratuits restent téléchargeables.`
                    : `Ta sélection contient ${plural(counts.recentToCharge, 'sujet récent', 'sujets récents')}, mais il te reste ${plural(quota.remaining, 'téléchargement', 'téléchargements')}. Choisis jusqu’à ${quota.remaining} sujet${quota.remaining > 1 ? 's' : ''} récent${quota.remaining > 1 ? 's' : ''} maintenant ; les autres plus tard.`}
                </Text>
              </View>
            ) : null}
            {message ? (
              <View style={styles.notice}>
                {message.error ? <AlertTriangle size={16} color={brand.burgundy} strokeWidth={2} /> : <CheckCircle2 size={16} color={brand.gold} strokeWidth={2} />}
                <Text variant="caption" style={[styles.noticeText, message.error && styles.noticeError]}>{message.text}</Text>
              </View>
            ) : null}

            <View style={styles.footerActions}>
              {overflow > 0 && quota.remaining > 0 ? (
                <ActionButton title={`Garder ${quota.remaining} ${quota.lifetime ? 'du quota' : `récent${quota.remaining > 1 ? 's' : ''}`} + gratuits`} variant="secondary" onPress={keepWithinQuota} />
              ) : null}
              {(overflow > 0 || counts?.blocked > 0) && quota?.plan !== 'subscriber' ? (
                <ActionButton title="Prendre mon abonnement" variant="secondary" onPress={access.sheetProps.onSubscribe} loading={access.sheetProps.subscribing} />
              ) : null}
              <ActionButton
                title={selectedItems.length > 1 ? `Télécharger ${selectedItems.length} documents` : 'Télécharger'}
                icon={Download}
                onPress={start}
                loading={checking && Boolean(selectedItems.length)}
                disabled={!canStart}
              />
            </View>
          </>
        )}
      </View>

      <AccessSheet {...access.sheetProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.paper },
  body: { flex: 1 },
  pressed: { opacity: 0.85 },
  cyclePicker: { paddingBottom: theme.spacing['2xl'] },
  chipGroup: { paddingTop: theme.spacing.base },
  chipGroupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: theme.layout.gutter },
  chipGroupTitle: { color: brand.inkSoft },
  chipGroupHint: { color: brand.inkMuted, fontFamily: theme.fontFamily.regular },
  chipRow: { gap: theme.spacing.sm, paddingHorizontal: theme.layout.gutter, paddingTop: theme.spacing.sm },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: brand.line,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: brand.ink, borderColor: brand.ink },
  chipLabel: { color: brand.inkSoft, fontFamily: theme.fontFamily.medium, fontSize: 14 },
  chipLabelActive: { color: brand.onInk },
  chipCount: { color: brand.inkMuted, fontFamily: theme.fontFamily.regular, fontSize: 12 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  listCount: { color: brand.inkSoft, fontFamily: theme.fontFamily.regular },
  link: { color: brand.burgundy, fontSize: 14 },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.line,
  },
  rowChecked: { backgroundColor: brand.goldWash },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: brand.lineStrong,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: brand.ink, borderColor: brand.ink },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: brand.paperDim,
  },
  rowContent: { flex: 1 },
  rowTitle: { color: brand.ink, fontSize: 15, lineHeight: 20 },
  rowMeta: { marginTop: 2, color: brand.inkSoft, fontFamily: theme.fontFamily.regular },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.full },
  badgeFree: { backgroundColor: brand.goldWash },
  badgeRecent: { backgroundColor: brand.paperDim },
  badgeLabel: { color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold, fontSize: 11 },
  badgeLabelFree: { color: brand.goldInk },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brand.line,
  },
  footerTitle: { color: brand.ink, fontSize: 15 },
  footerMeta: { color: brand.inkSoft, fontFamily: theme.fontFamily.regular },
  footerActions: { gap: theme.spacing.sm },
  progress: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  warning: { flexDirection: 'row', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: brand.goldWash },
  warningText: { flex: 1, color: brand.ink, fontFamily: theme.fontFamily.regular, lineHeight: 17 },
  notice: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' },
  noticeText: { flex: 1, color: brand.inkSoft, fontFamily: theme.fontFamily.regular, lineHeight: 17 },
  noticeError: { color: brand.burgundy },
});

export default BulkDownloadScreen;
