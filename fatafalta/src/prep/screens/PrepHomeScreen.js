import StudyLamp from '../../theme/StudyLamp';
import StatusBar from '../../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  BookOpen, Check, CheckCircle2, ChevronRight, ChevronsUpDown, CloudOff, GraduationCap, Lock, Sparkles, Target, Timer,
} from 'lucide-react-native';
import Text from '../../components/ui/Text';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import core from '../shared/prepCore';
import { getLesson, getModule, getProgramme, programmeModules, useContentGeneration } from '../content';
import usePrep, { useRights, useSummary, currentDevice } from '../store';
import { lastStorageError } from '../storage';
import prepApi from '../api';
import { motion, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { DailyCopy, HomeChevron, HomeScoreboard, HomeVideoBadge } from '../components/HomePresentation';
import {
  CornerFold, NightBackground, PrepButton, PressScale, ProgressBar, SectionTitle, StatusMark,
} from '../ui/primitives';
import ART from '../ui/art';
import BottomSheet from '../ui/BottomSheet';
import { LockedSheet } from '../components/Sheets';
import { RhythmSheet, useCatalogue } from './OnboardingScreens';
import { findVideo, useVideosIndex } from '../video/useVideos';
import { sessionParams } from './SessionScreen';

// ── Puces de matières : la pastille de fond glisse d'une puce à l'autre ────
const SubjectChips = ({ subjects, active, onChange }) => {
  const { brand, subjectTint } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const [layouts, setLayouts] = useState({});
  const x = useSharedValue(0);
  useEffect(() => {
    const l = layouts[active];
    if (l) x.set(reduce ? l.x : withSpring(l.x, motion.sheet));
  }, [active, layouts, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const activeTint = active === 'Toutes' ? brand.burgundy : subjectTint(subjects.find((s) => s.nom === active)?.teinte).tint;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Animated.View pointerEvents="none" style={[styles.chipPill, { backgroundColor: activeTint, width: layouts[active]?.w || 0, height: layouts[active]?.h || 44 }, pill]} />
      {[{ nom: 'Toutes' }, ...subjects].map((s) => (
        <PressScale
          key={s.nom}
          onLayout={(e) => { const { x: lx, width, height } = e.nativeEvent.layout; setLayouts((p) => ({ ...p, [s.nom]: { x: lx, w: width, h: height } })); }}
          onPress={() => { haptic.select(); onChange(s.nom); }}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === s.nom }}
          style={[styles.chip, active !== s.nom && styles.chipIdle]}
        >
          <Text variant="caption" style={[styles.chipText, active === s.nom && { color: brand.onInk }]}>{s.nom}</Text>
        </PressScale>
      ))}
    </ScrollView>
  );
};

// Le filet suit les lignes de hauteur naturelle, même avec de grands caractères.
const ModuleRow = ({ item, etat, index, conseilleApres, locked, current, video, onPress, first, last }) => {
  const { subjectTint, brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const tint = subjectTint(item.teinte);
  const st = item.publie ? core.moduleStatus(item.module, etat) : null;
  const n2 = etat.scores?.[item.code]?.[2];
  const pct = Math.round((st?.pourcentage || 0) * 100);
  return (
    <Animated.View entering={FadeIn.duration(reduce ? 150 : 220).delay(reduce ? 0 : Math.min(index, 5) * motion.stagger)}>
      <View pointerEvents="none" style={[styles.pathLine, first && styles.pathFirst, last && styles.pathLast]}>
        <View style={[styles.pathFill, { height: `${pct}%` }]} />
      </View>
      {current && !locked && !(first && last) ? (
        <View pointerEvents="none" style={[styles.pathAccent, last && styles.pathAccentLast]} />
      ) : null}
      <PressScale
        onPress={onPress}
        disabled={!item.publie}
        accessibilityLabel={`Module ${item.numero}, ${item.matiere}, ${item.titre}${item.publie ? `, ${pct} %` : ', en préparation'}${st?.valide ? ', maîtrisé' : ''}${current ? (pct ? ', en cours' : ', point de départ') : ''}${locked ? ', verrouillé, abonnement nécessaire pour étudier' : ''}${video ? ', vidéo disponible' : ''}`}
        style={styles.moduleRow}
      >
        <StatusMark
          size={36}
          label={item.numero}
          value={pct / 100}
          state={st?.valide ? 'done' : locked ? 'locked' : pct > 0 ? 'progress' : current ? 'current' : 'todo'}
        />
        <View style={[styles.moduleText, st?.valide && styles.moduleMastered]}>
          {st?.valide ? <CornerFold size={24} radius={0} cut={brand.paper} /> : null}
          <Text variant="bodyMedium" style={[styles.moduleTitle, current && !locked && { color: brand.burgundy }]}>{item.titre}</Text>
          <View style={styles.moduleMeta}>
            <View style={[styles.tintDot, { backgroundColor: tint.tint }]} />
            <Text variant="caption" style={styles.muted}>{item.matiere}</Text>
            {current ? <Text variant="caption" style={styles.currentLabel}>{pct ? 'En cours' : 'Point de départ'}</Text> : null}
          </View>
          <View style={styles.moduleMeta}>
            {st?.valide ? <Text variant="caption" style={styles.doneLabel}>Module maîtrisé</Text> : null}
            <Text variant="caption" style={styles.muted}>
              {st?.valide ? '' : `${st?.leconsTotal || 0} leçons${n2 != null ? ` · Niveau 2 : ${Math.round(n2 * 100)} %` : pct ? ` · ${pct} %` : ''}`}
            </Text>
            {video ? <HomeVideoBadge /> : null}
          </View>
          {conseilleApres ? <Text variant="caption" style={styles.muted}>{`Conseillé après le module ${conseilleApres}`}</Text> : null}
        </View>
        <HomeChevron />
      </PressScale>
    </Animated.View>
  );
};

// État de dépliage local à la présentation, sans écriture dans les préférences.
const UpcomingModules = ({ modules }) => {
  const { styles } = useStyles();
  const [expanded, setExpanded] = useState(false);
  const reduce = useReduceMotion();
  if (!modules.length) return null;
  return (
    <Animated.View layout={reduce ? undefined : LinearTransition.duration(220)} style={styles.upcoming}>
      <PressScale hapticOnPress onPress={() => setExpanded((value) => !value)} style={styles.upcomingToggle}
        accessibilityState={{ expanded }} accessibilityLabel={`${modules.length} modules en préparation, liste ${expanded ? 'dépliée' : 'repliée'}`}>
        <Text variant="bodyMedium" style={styles.upcomingTitle}>{`${modules.length} module${modules.length > 1 ? 's' : ''} en préparation`}</Text>
        <HomeChevron expanded={expanded} />
      </PressScale>
      {expanded ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} style={styles.upcomingList}>
          {modules.map((m) => (
            <View key={m.code} style={styles.upcomingRow} accessible accessibilityLabel={`Module ${m.numero}, ${m.titre}, ${m.matiere}, en préparation`}>
              <Text variant="caption" style={styles.upcomingNumber}>{m.numero}</Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="body" style={styles.muted}>{m.titre}</Text>
                <Text variant="caption" style={styles.muted}>{m.matiere}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

// ── Feuille « Essai » (E07) ───────────────────────────────────────────────
const TrialSheet = ({ visible, onClose, rights, onSubscribe }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const days = rights.essai.jours;
  const fmt = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.82} footer={<View><PrepButton title="Voir l’abonnement" variant="gold" onPress={onSubscribe} /><PrepButton title="Plus tard" variant="link" onPress={onClose} /></View>}>
      <Text variant="title" style={styles.ink}>Ton essai gratuit</Text>
      <Text variant="body" style={[styles.muted, { marginTop: 4 }]}>Un jour n’est compté que lorsque tu étudies.</Text>
      <View style={styles.frise}>
        <View style={styles.friseLine} />
        {Array.from({ length: 7 }, (_, i) => {
          const d = days[i];
          const today = d && i === days.length - 1;
          return (
            <Animated.View key={i} entering={FadeIn.duration(reduce ? 150 : 220).delay(reduce ? 0 : i * 40)} style={styles.friseItem}>
              <View style={[styles.friseDot, d && styles.friseUsed, today && styles.friseToday]}>
                <Text variant="caption" style={[type.tabular, { color: d ? brand.onInk : brand.inkSoft }]}>{i + 1}</Text>
              </View>
              <Text variant="caption" style={styles.friseDate}>{d ? fmt(d) : ''}</Text>
            </Animated.View>
          );
        })}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Sparkles size={18} color={brand.gold} />
        <Text variant="bodyMedium" style={styles.ink}>{`Vérifications IA offertes : ${rights.essai.iaRestantes} / 3`}</Text>
      </View>
      <View style={styles.benefits}>
        <Text variant="h3" style={{ color: brand.goldInk }}>Avec l’abonnement</Text>
        {['Préparation illimitée', 'Vérification du raisonnement par IA', 'Concours blancs', 'Tous les anciens sujets et corrigés'].map((b) => (
          <View key={b} style={styles.row}><CheckCircle2 size={18} color={brand.gold} /><Text variant="body" style={styles.ink}>{b}</Text></View>
        ))}
      </View>
    </BottomSheet>
  );
};

// ═════════════════════════════════════════════════════════════════════════
const PrepHomeScreen = ({ navigation, route }) => {
  useContentGeneration(); // redessine à l'arrivée d'une nouvelle publication
  const { brand, colors } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const programmeCode = usePrep((s) => s.programme);
  const identite = usePrep((s) => s.identite);
  const enCours = usePrep((s) => s.enCours[programmeCode]);
  const prefs = usePrep((s) => s.prefs);
  const videos = useVideosIndex();
  const online = usePrep((s) => s.online);
  const queueLength = usePrep((s) => s.queue.length);
  const flush = usePrep((s) => s.flush);
  const setPrefs = usePrep((s) => s.setPrefs);
  const retour = usePrep((s) => s.retour);
  const rights = useRights();
  const summary = useSummary(programmeCode);
  const catalogue = useCatalogue();
  const [rank, setRank] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const programme = getProgramme(programmeCode);
  const modules = useMemo(() => programmeModules(programme), [programme]);
  const subjects = programme?.matieres || [];
  const chip = prefs.puce?.[programmeCode] || 'Toutes';
  const org = catalogue.find((o) => o.sigle === programme?.organisme.sigle);

  const loadRank = useCallback(() => {
    if (!programmeCode) return Promise.resolve();
    return prepApi.ranking(programmeCode, 'tout').then(setRank).catch(() => {});
  }, [programmeCode]);
  useFocusEffect(useCallback(() => { flush(); loadRank(); }, [flush, loadRank]));

  useEffect(() => {
    if (route.params?.accueil && !prefs.rythmeFait) setTimeout(() => setSheet('rythme'), 500);
  }, [route.params?.accueil]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (retour) setSheet('retour'); }, [retour]);

  if (!programme) {
    return (
      <View style={[styles.flex, styles.empty, { paddingTop: insets.top + 40 }]}>
        <Image source={ART.notebook} style={{ width: 168, height: 168 }} resizeMode="contain" accessible={false} />
        <Text variant="h2" style={[styles.ink, styles.center]}>Prépare ton concours</Text>
        <Text variant="body" style={[styles.muted, styles.center]}>Cours en modules, exercices interactifs, révisions et classement de ton cycle.</Text>
        <PrepButton title="Choisir mon concours" icon={ChevronRight} onPress={() => navigation.navigate('PrepContestPicker')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const etat = summary.etat;
  const started = summary.stats.questions > 0 || Object.keys(etat.lecons || {}).length > 0;
  const visible = modules.filter((m) => chip === 'Toutes' || m.matiere === chip);
  const firstPublished = modules.find((m) => m.publie);
  const locked = !rights.peutEtudier;
  const reviews = summary.reviews;
  const trialAlert = !rights.abonne && rights.essai.alerte;
  // Écriture locale impossible (stockage plein) : signalée ; la file hors ligne a déjà son indicateur.
  const storageError = lastStorageError();
  const syncNote = storageError ? 'Espace de stockage insuffisant : ta progression récente est gardée en mémoire et envoyée dès que possible.' : null;

  // Module conseillé : le premier publié non validé ; les suivants « en avance » le signalent.
  const recommendedIndex = modules.findIndex((m) => m.publie && !core.moduleStatus(m.module, etat).valide);

  const openModule = (m) => { haptic.select(); navigation.navigate('PrepModule', { programme: programmeCode, module: m.code }); };
  const guard = (fn) => () => { if (locked) { setSheet('locked'); return; } fn(); };

  const continueTarget = (() => {
    if (enCours?.type === 'session') {
      const mod = getModule(enCours.module);
      return { label: enCours.mode === 'revision' ? 'Révisions' : `Niveau ${enCours.niveau} · ${mod?.titre || ''}`, sub: `Question ${enCours.index + 1} / ${enCours.total}`, progress: enCours.index / Math.max(1, enCours.total), go: () => navigation.navigate('PrepSession', { sessionId: enCours.id }) };
    }
    if (enCours?.type === 'lecon') {
      const l = getLesson(enCours.lecon);
      if (l) return { label: `Leçon ${l.index + 1} · ${l.lecon.titre}`, sub: `${l.module.matiere} · ${l.module.titre}`, progress: etat.lecons?.[l.lecon.code]?.derniere ?? etat.lecons?.[l.lecon.code]?.position ?? 0, go: () => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: l.lecon.code }) };
    }
    // Rien en cours sur cet appareil : reprise enregistrée sur le serveur (autre appareil, lot 5).
    const reprise = etat.derniereReprise?.appareil && etat.derniereReprise.appareil !== currentDevice() ? etat.derniereReprise : null;
    if (!enCours && reprise?.type === 'lecon' && !etat.lecons?.[reprise.lecon]?.terminee) {
      const l = getLesson(reprise.lecon);
      if (l) return { label: `Leçon ${l.index + 1} · ${l.lecon.titre}`, sub: `${l.module.matiere} · ${l.module.titre}`, progress: reprise.position ?? etat.lecons?.[l.lecon.code]?.derniere ?? 0, go: () => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: l.lecon.code }) };
    }
    if (!enCours && reprise?.type === 'session' && reprise.module && getModule(reprise.module)) {
      const mod = getModule(reprise.module);
      // Les réponses en cours d'une session restent sur l'appareil qui les a saisies : on rouvre le module.
      return { label: `Niveau ${reprise.niveau || 1} · ${mod.titre}`, sub: 'Commencé sur un autre appareil', progress: (reprise.index || 0) / Math.max(1, reprise.total || 1), go: () => navigation.navigate('PrepModule', { programme: programmeCode, module: reprise.module }) };
    }
    return null;
  })();

  const currentLesson = enCours?.type === 'lecon' ? getLesson(enCours.lecon) : null;
  const currentModuleCode = currentLesson?.module.code
    || (enCours?.type === 'session' && getModule(enCours.module) ? enCours.module : modules[recommendedIndex]?.code);
  const copyTitle = locked ? 'Ton essai est terminé'
    : currentLesson ? currentLesson.lecon.titre : continueTarget?.label || firstPublished?.module.lecons[0]?.titre || 'Les cours arrivent bientôt';
  const copyAnnotation = locked ? 'Ta copie est conservée'
    : currentLesson ? `Leçon ${currentLesson.index + 1}/${currentLesson.module.lecons.length} · ${Math.round(continueTarget.progress * 100)} %`
      : continueTarget ? `${continueTarget.sub} · ${Math.round(continueTarget.progress * 100)} %`
        : firstPublished ? `Leçon 1/${firstPublished.module.lecons.length} · Ton point de départ` : 'Un nouveau parcours se prépare';

  const onRefresh = async () => { if (refreshing) return; setRefreshing(true); try { await Promise.all([flush(), loadRank()]); } finally { setRefreshing(false); } };

  const goal = Math.min(1, summary.minutesJour / Math.max(1, summary.objectif));
  const trialLabel = !rights.essai.actif ? 'Essai terminé · ta progression est conservée'
    : rights.essai.joursUtilises === 0 ? 'Essai gratuit · 7 jours d’étude offerts'
      : `Essai : ${rights.essai.joursRestants} jour${rights.essai.joursRestants > 1 ? 's' : ''} restant${rights.essai.joursRestants > 1 ? 's' : ''} · ${rights.essai.iaRestantes} vérification${rights.essai.iaRestantes > 1 ? 's' : ''} IA`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <NightBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.goldLight} />}
      >
        {/* ── En-tête sur l'encre ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerRow}>
            <PressScale hapticOnPress onPress={() => navigation.navigate('PrepContestPicker')} accessibilityRole="button" accessibilityLabel={`Programme ${programme.organisme.sigle}, ${programme.titre}. Changer de concours`} style={styles.selector}>
              <OrganismeLogo organisme={{ nom: programme.organisme.sigle, logo: org?.logo }} size={26} />
              <Text variant="bodyMedium" style={styles.selectorText}>{`${programme.organisme.sigle} · ${programme.titre}`}</Text>
              <ChevronsUpDown size={15} color={brand.onInkSoft} />
            </PressScale>

          </View>
          {started ? (
            <Text variant="title" style={styles.headTitle} accessibilityRole="header">Préparation</Text>
          ) : (
            <Text variant="title" style={styles.headTitle} accessibilityRole="header">
              {'Bienvenue, '}<Text variant="title" style={[styles.headTitle, styles.headName]}>{identite?.pseudonyme || '…'}</Text>
            </Text>
          )}
          <View style={styles.goalRow} accessibilityLabel={`Objectif du jour : ${Math.round(summary.minutesJour)} minutes sur ${summary.objectif}`}>
            <Text variant="caption" style={styles.onSoft}>Objectif du jour</Text>
            <ProgressBar value={goal} color={brand.goldLight} track="rgba(255,255,255,0.14)" height={4} style={styles.goalBar} />
            <Text variant="caption" style={[styles.onInk, type.tabular]}>{`${Math.min(Math.round(summary.minutesJour), 999)} / ${summary.objectif} min`}</Text>
          </View>

        </View>

        {/* ── Feuille papier ── */}
        <View style={styles.sheetWrap}>
          <StudyLamp />
          <View style={styles.ghost} pointerEvents="none" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 112 }]}>
            {online === false && queueLength ? (
              <View style={styles.offline}><CloudOff size={16} color={brand.inkSoft} /><Text variant="caption" style={[styles.muted, { flex: 1 }]}>Hors ligne · tes réponses seront envoyées plus tard</Text></View>
            ) : null}

            <DailyCopy
              title={copyTitle}
              annotation={copyAnnotation}
              context={locked ? 'Ta progression, ton cahier d’erreurs et ton rang sont conservés.'
                : continueTarget ? (currentLesson ? continueTarget.sub : 'Reprends là où tu t’es arrêté.')
                  : firstPublished ? `${firstPublished.matiere} · ${firstPublished.titre} · ${firstPublished.module.duree} min`
                    : 'Tu peux déjà découvrir les épreuves officielles de ton concours.'}
              action={locked ? 'Voir l’abonnement' : continueTarget ? 'Continuer' : 'Commencer la leçon 1'}
              actionLabel={locked ? 'Essai terminé : voir l’abonnement' : continueTarget ? `Continuer : ${continueTarget.label}, ${Math.round(continueTarget.progress * 100)} %` : `Commencer : leçon 1, ${copyTitle}`}
              onPress={locked ? () => navigation.navigate('PrepSubscription') : continueTarget ? continueTarget.go
                : firstPublished ? guard(() => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: firstPublished.module.lecons[0].code })) : null}
              locked={locked} started={started} reviews={reviews}
              onReviews={() => navigation.navigate('PrepReviews', { programme: programmeCode })}
            />
            {started ? <HomeScoreboard summary={summary} rank={rank} online={online} onPress={() => navigation.navigate('ProgressTab')} /> : null}
            {!rights.abonne ? (
              <PressScale hapticOnPress onPress={() => setSheet('trial')} style={[styles.trial, (trialAlert || !rights.essai.actif) && styles.trialAlert]} accessibilityRole="button">
                <Sparkles size={14} color={trialAlert || !rights.essai.actif ? colors.warning : brand.goldInk} />
                <Text variant="caption" style={[styles.trialText, (trialAlert || !rights.essai.actif) && { color: colors.warning }]}>{trialLabel}</Text>
                <HomeChevron />
              </PressScale>
            ) : null}
            {syncNote ? (
              <View style={styles.syncNote} accessibilityLiveRegion="polite">
                <Text variant="caption" style={{ color: storageError ? colors.warning : brand.inkSoft }}>{syncNote}</Text>
              </View>
            ) : null}

            {/* ── Puces + modules ── */}
            <SectionTitle style={styles.sectionGap} right={`${summary.modulesValides} / ${summary.modulesTotal} validés`}>Ton parcours</SectionTitle>
            <SubjectChips subjects={subjects} active={chip} onChange={(nom) => setPrefs({ puce: { ...prefs.puce, [programmeCode]: nom } })} />
            <Animated.View layout={reduce ? undefined : LinearTransition.duration(220)} style={styles.modules}>
              {visible.filter((m) => m.publie).map((m, i, published) => {
                const idx = modules.indexOf(m);
                const ahead = recommendedIndex >= 0 && idx > recommendedIndex && m.publie && core.moduleStatus(m.module, etat).statut !== 'valide'
                  ? modules[recommendedIndex].numero : null;
                return <ModuleRow key={m.code} item={m} etat={etat} index={i} first={i === 0} last={i === published.length - 1} current={m.code === currentModuleCode} locked={locked && m.publie} conseilleApres={ahead && ahead !== m.numero && idx === recommendedIndex + 1 ? ahead : null} video={Boolean(m.module?.lecons.some((l) => findVideo(videos, 'lecon', l.code, prefs.versions?.[m.code] || 'fr')))} onPress={() => openModule(m)} />;
              })}
              <UpcomingModules key={`${programmeCode}-${chip}`} modules={visible.filter((m) => !m.publie)} />
            </Animated.View>

            {/* Le bloc suit le dépliage du parcours sans saut de position. */}
            <Animated.View layout={reduce ? undefined : LinearTransition.duration(220)}>
              <SectionTitle style={styles.sectionGap}>Pour aller plus loin</SectionTitle>
              <View>
                <PressScale hapticOnPress style={styles.extraRow} onPress={guard(() => navigation.navigate('PrepMockIntro', { programme: programmeCode }))} accessibilityLabel={`Concours blanc, ${programme.concoursBlanc.nbQuestions} questions, ${programme.concoursBlanc.dureeMinutes} minutes${locked ? ', abonnement nécessaire' : ''}`}>
                  <Timer size={22} color={brand.inkSoft} />
                  <View style={styles.extraText}>
                    <Text variant="h3" style={styles.ink}>Concours blanc</Text>
                    <Text variant="caption" style={styles.muted}>{`${programme.concoursBlanc.nbQuestions} questions · ${programme.concoursBlanc.dureeMinutes} min`}</Text>
                  </View>
                  {locked ? <Lock size={15} color={brand.inkSoft} /> : null}
                  <HomeChevron />
                </PressScale>
                <PressScale hapticOnPress style={styles.extraRow} onPress={guard(() => navigation.navigate('PrepSession', sessionParams.test(programmeCode)))} accessibilityLabel={`${etat.test ? 'Refaire le test de positionnement' : 'Test de positionnement'}, 5 minutes${locked ? ', abonnement nécessaire' : ''}`}>
                  <Target size={22} color={brand.inkSoft} />
                  <View style={styles.extraText}>
                    <Text variant="h3" style={styles.ink}>{etat.test ? 'Refaire le test' : 'Test de niveau'}</Text>
                    <Text variant="caption" style={styles.muted}>5 min pour savoir par où commencer</Text>
                  </View>
                  {locked ? <Lock size={15} color={brand.inkSoft} /> : null}
                  <HomeChevron />
                </PressScale>
              </View>
              <PressScale hapticOnPress onPress={() => navigation.navigate('PrepProgramInfo', { programme: programmeCode })} style={styles.infoLink} accessibilityLabel={`Épreuves officielles et sources du programme${findVideo(videos, 'concours', programmeCode) ? ', vidéo disponible' : ''}`}>
                <BookOpen size={18} color={brand.burgundy} />
                <View style={styles.extraText}>
                  <Text variant="bodyMedium" style={{ color: brand.burgundy }}>Épreuves officielles</Text>
                  <View style={styles.moduleMeta}>
                    <Text variant="caption" style={styles.muted}>Sources du programme</Text>
                    {findVideo(videos, 'concours', programmeCode) ? <HomeVideoBadge /> : null}
                  </View>
                </View>
                <HomeChevron />
              </PressScale>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      <RhythmSheet visible={sheet === 'rythme'} onClose={() => setSheet(null)} onPlacementTest={() => navigation.navigate('PrepSession', sessionParams.test(programmeCode))} />
      <TrialSheet visible={sheet === 'trial'} rights={rights} onClose={() => setSheet(null)} onSubscribe={() => { setSheet(null); navigation.navigate('PrepSubscription'); }} />
      <LockedSheet visible={sheet === 'locked'} onClose={() => setSheet(null)} onSubscribe={() => { setSheet(null); navigation.navigate('PrepSubscription'); }} />
      <BottomSheet visible={sheet === 'retour'} onClose={() => { usePrep.setState({ retour: null }); setSheet(null); }} maxHeight={0.6} footer={<PrepButton title="Reprendre" onPress={() => { usePrep.setState({ retour: null }); setSheet(null); }} />}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <GraduationCap size={30} color={brand.gold} />
          <Text variant="h2" style={[styles.ink, styles.center]}>{`Bon retour, ${identite?.pseudonyme || ''}`}</Text>
          <Text variant="body" style={[styles.muted, styles.center]}>Ta progression a été retrouvée.</Text>
          {!rights.abonne ? (
            <Text variant="bodyMedium" style={[styles.ink, styles.center]}>
              {rights.essai.actif ? `Il te reste ${rights.essai.joursRestants} jour${rights.essai.joursRestants > 1 ? 's' : ''} d’essai et ${rights.essai.iaRestantes} vérification${rights.essai.iaRestantes > 1 ? 's' : ''} IA.` : 'Ton essai gratuit est terminé.'}
            </Text>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
};

export default PrepHomeScreen;

const useStyles = createThemedStyles(({ brand, theme, colors }) => {
  const styles = StyleSheet.create({
    root: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.inkDeep },
    flex: { flex: 1, backgroundColor: brand.paper },
    scroll: { flexGrow: 1 },
    empty: { alignItems: 'center', paddingHorizontal: 28, gap: 14 },
    center: { textAlign: 'center' },
    ink: { color: brand.ink },
    muted: { color: brand.inkSoft },
    onInk: { color: brand.onInk },
    onSoft: { color: brand.onInkSoft },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    header: { paddingHorizontal: 20, paddingBottom: 18 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    selector: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 12, paddingVertical: 8, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
    selectorText: { color: brand.onInk, flexShrink: 1, fontFamily: theme.fontFamily.semiBold },
    headTitle: { color: brand.onInk, fontSize: 28, lineHeight: 34, marginTop: 8 },
    headName: { color: brand.goldLight, fontFamily: theme.fontFamily.serifItalic },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' },
    goalBar: { flex: 1, minWidth: 32 },
    trial: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 12, minHeight: 44, paddingVertical: 8, borderRadius: 12, backgroundColor: brand.paperDim },
    trialAlert: { backgroundColor: colors.warningWash, borderColor: colors.warningWash },
    syncNote: { marginTop: 10, paddingHorizontal: 4 },
    trialText: { flex: 1, color: brand.inkSoft },
    sheetWrap: { flexGrow: 1, marginTop: 10 },
    ghost: { position: 'absolute', top: -10, left: 16, right: 16, height: 48, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: theme.brand.ghost, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
    sheet: { flexGrow: 1, minHeight: 600, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
    offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: brand.paperDim, marginBottom: 12 },
    sectionGap: { marginTop: 28, marginBottom: 12, flexWrap: 'wrap', gap: 8 },
    chips: { gap: 8, paddingRight: 20, paddingBottom: 4 },
    chipPill: { position: 'absolute', left: 0, top: 0, borderRadius: 22 },
    chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    chipIdle: { borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
    chipText: { color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold },
    modules: { marginTop: 14 },
    pathLine: { position: 'absolute', top: 0, bottom: 0, left: 17.25, width: 1.5, backgroundColor: brand.lineStrong },
    pathFirst: { top: '50%' },
    pathLast: { bottom: '50%' },
    pathFill: { width: 1.5, backgroundColor: brand.burgundySolid },
    pathAccent: { position: 'absolute', left: 17.25, top: '50%', width: 1.5, height: 28, backgroundColor: brand.burgundySolid },
    pathAccentLast: { marginTop: -28 },
    moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 96 },
    moduleText: { flex: 1, paddingVertical: 18, gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    moduleMastered: { paddingRight: 24 },
    moduleTitle: { color: brand.ink, fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 22 },
    moduleMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    currentLabel: { color: brand.burgundy, fontFamily: theme.fontFamily.semiBold },
    moduleState: { width: 36, minHeight: 36, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' },
    moduleNumberCurrent: { borderColor: brand.burgundy, backgroundColor: brand.burgundySolid },
    moduleDone: { borderColor: colors.success, backgroundColor: colors.successSolid },
    moduleLocked: { backgroundColor: brand.paperDim },
    doneLabel: { color: colors.success, fontFamily: theme.fontFamily.semiBold },
    ringNum: { fontFamily: theme.fontFamily.bold, fontSize: 14, lineHeight: 20 },
    tintDot: { width: 5, height: 5, borderRadius: 3 },
    upcoming: { marginTop: 12, backgroundColor: brand.paperDim, borderRadius: 12, overflow: 'hidden' },
    upcomingToggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    upcomingTitle: { flex: 1, color: brand.inkSoft, fontSize: 14 },
    upcomingList: { paddingHorizontal: 16, paddingBottom: 6 },
    upcomingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line, marginTop: 8 },
    upcomingNumber: { color: brand.inkSoft, minWidth: 22, fontFamily: theme.fontFamily.semiBold },
    extraRow: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    extraText: { flex: 1, gap: 5 },
    infoLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: brand.burgundyWash },
    frise: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
    friseLine: { position: 'absolute', left: 18, right: 18, top: 18, height: 1, backgroundColor: brand.line },
    friseItem: { alignItems: 'center', width: 40 },
    friseDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: brand.lineStrong, backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' },
    friseUsed: { backgroundColor: brand.night, borderColor: brand.ink },
    friseToday: { backgroundColor: brand.gold, borderColor: brand.gold, shadowColor: brand.gold, shadowOpacity: 0.5, shadowRadius: 8 },
    friseDate: { marginTop: 4, color: brand.inkSoft, fontSize: 10 },
    benefits: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: brand.goldWash, gap: 10 },
  });
  return { styles };
});
