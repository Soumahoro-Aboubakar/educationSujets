import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  BookOpen, Check, CheckCircle2, ChevronRight, ChevronsUpDown, CloudOff, Flame, GraduationCap, Lock, Play, PlayCircle, RotateCcw, Sparkles, Target, Timer, Trophy,
} from 'lucide-react-native';
import Text from '../../components/ui/Text';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import core from '../shared/prepCore';
import { getLesson, getModule, getProgramme, programmeModules } from '../content';
import usePrep, { useRights, useSummary } from '../store';
import prepApi from '../api';
import { brand, colors, motion, subjectTint, theme, type } from '../theme';
import { haptic } from '../feedback';
import {
  AnimatedNumber, Badge, Card, CornerFold, Enter, NightBackground, PrepButton, PressScale, ProgressBar, ProgressRing, SectionTitle, StatTile,
} from '../ui/primitives';
import ART from '../ui/art';
import BottomSheet from '../ui/BottomSheet';
import { LockedSheet } from '../components/Sheets';
import { RhythmSheet, useCatalogue } from './OnboardingScreens';
import { findVideo, useVideosIndex } from '../video/useVideos';
import { sessionParams } from './SessionScreen';

// ── Puces de matières : la pastille de fond glisse d'une puce à l'autre ────
const SubjectChips = ({ subjects, active, onChange }) => {
  const [layouts, setLayouts] = useState({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  useEffect(() => {
    const l = layouts[active];
    if (l) { x.value = withSpring(l.x, motion.sheet); w.value = withSpring(l.w, motion.sheet); }
  }, [active, layouts, x, w]);
  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  const activeTint = active === 'Toutes' ? brand.burgundy : subjectTint(subjects.find((s) => s.nom === active)?.teinte).tint;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <Animated.View style={[styles.chipPill, { backgroundColor: activeTint }, pill]} />
      {[{ nom: 'Toutes' }, ...subjects].map((s) => (
        <Pressable
          key={s.nom}
          onLayout={(e) => { const { x: lx, width } = e.nativeEvent.layout; setLayouts((p) => ({ ...p, [s.nom]: { x: lx, w: width } })); }}
          onPress={() => { haptic.select(); onChange(s.nom); }}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === s.nom }}
          style={[styles.chip, active !== s.nom && styles.chipIdle]}
        >
          <Text variant="caption" style={[styles.chipText, active === s.nom && { color: '#FFF' }]}>{s.nom}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

// ── Ligne de module (E05) ─────────────────────────────────────────────────
// Validé : coche verte + coin corné or. Conseillé : filet bordeaux + flèche. Verrouillé : cadenas.
const ModuleRow = ({ item, etat, index, conseilleApres, locked, current, video, onPress }) => {
  const tint = subjectTint(item.teinte);
  const st = item.publie ? core.moduleStatus(item.module, etat) : null;
  const n2 = etat.scores?.[item.code]?.[2];
  const pct = Math.round((st?.pourcentage || 0) * 100);
  return (
    <Enter index={index}>
      <PressScale
        onPress={onPress}
        disabled={!item.publie}
        accessibilityLabel={`Module ${item.numero}, ${item.titre}${item.publie ? `, ${pct} %` : ', bientôt disponible'}${st?.valide ? ', validé' : ''}${locked ? ', verrouillé' : ''}`}
        style={[styles.moduleCard, current && !locked && styles.moduleCurrent, !item.publie && styles.moduleSoon]}
      >
        <CornerFold size={30} radius={18} tone={item.publie && !locked ? 'gold' : 'muted'} animated delay={Math.min(index, 8) * 60} />
        <View style={styles.moduleLead}>
          {locked ? (
            <View style={[styles.moduleState, styles.moduleLocked]}><Lock size={18} color={brand.inkMuted} /></View>
          ) : st?.valide ? (
            <View style={[styles.moduleState, { backgroundColor: colors.success }]}><Check size={20} color="#FFF" strokeWidth={2.8} /></View>
          ) : (
            <ProgressRing size={46} stroke={3.5} value={st?.pourcentage || 0} color={current ? brand.burgundy : tint.tint} gradient={false} track={brand.line}>
              <Text style={[styles.ringNum, type.tabular, { color: current ? brand.burgundy : tint.tint }]}>{item.numero}</Text>
            </ProgressRing>
          )}
        </View>
        <View style={styles.moduleText}>
          <View style={styles.row}>
            <View style={[styles.tintDot, { backgroundColor: tint.tint }]} />
            <Text variant="caption" style={styles.moduleKicker} numberOfLines={1}>{`Module ${item.numero} · ${item.matiere}`}</Text>
          </View>
          <Text variant="bodyMedium" style={styles.moduleTitle} numberOfLines={2}>{item.titre}</Text>
          {item.publie && video ? (
            // Indicateur « vidéo » : uniquement quand le module en a une (sinon, ligne inchangée).
            <View style={styles.row}>
              <Text variant="caption" style={[styles.muted, styles.shrink]} numberOfLines={1}>
                {st.valide ? 'Module validé' : `${st.leconsTotal} leçons${n2 != null ? ` · Niveau 2 : ${Math.round(n2 * 100)} %` : pct ? ` · ${pct} %` : ''}`}
              </Text>
              <Badge label="Vidéo" tone="ink" icon={PlayCircle} />
            </View>
          ) : item.publie ? (
            <Text variant="caption" style={styles.muted} numberOfLines={1}>
              {st.valide ? 'Module validé' : `${st.leconsTotal} leçons${n2 != null ? ` · Niveau 2 : ${Math.round(n2 * 100)} %` : pct ? ` · ${pct} %` : ''}`}
            </Text>
          ) : <Text variant="caption" style={styles.muted}>Bientôt disponible</Text>}
          {conseilleApres ? <Badge label={`Conseillé après M${conseilleApres}`} tone="neutral" style={{ marginTop: 6 }} /> : null}
        </View>
        {item.publie ? <ChevronRight size={18} color={current && !locked ? brand.burgundy : brand.lineStrong} strokeWidth={2.2} /> : <Badge label="Bientôt" tone="neutral" />}
      </PressScale>
    </Enter>
  );
};

// ── Feuille « Essai » (E07) ───────────────────────────────────────────────
const TrialSheet = ({ visible, onClose, rights, onSubscribe }) => {
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
            <Animated.View key={i} entering={FadeIn.delay(i * 60)} style={styles.friseItem}>
              <View style={[styles.friseDot, d && styles.friseUsed, today && styles.friseToday]}>
                <Text variant="caption" style={[type.tabular, { color: d ? '#FFF' : brand.inkMuted }]}>{i + 1}</Text>
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
  const insets = useSafeAreaInsets();
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
      if (l) return { label: `Leçon ${l.index + 1} · ${l.lecon.titre}`, sub: `${l.module.matiere} · ${l.module.titre}`, progress: etat.lecons?.[l.lecon.code]?.position || 0, go: () => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: l.lecon.code }) };
    }
    return null;
  })();

  const onRefresh = async () => { setRefreshing(true); await Promise.all([flush(), loadRank()]); setRefreshing(false); };

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
            <Pressable onPress={() => navigation.navigate('PrepContestPicker')} accessibilityRole="button" accessibilityLabel={`Programme ${programme.organisme.sigle}, ${programme.titre}. Changer de concours`} style={styles.selector}>
              <OrganismeLogo organisme={{ nom: programme.organisme.sigle, logo: org?.logo }} size={26} />
              <Text variant="bodyMedium" style={styles.selectorText} numberOfLines={1}>{`${programme.organisme.sigle} · ${programme.titre}`}</Text>
              <ChevronsUpDown size={15} color={brand.onInkSoft} />
            </Pressable>
            <View style={styles.streak} accessibilityLabel={`Série de ${summary.serie} jours`}>
              <Flame size={16} color={goal >= 1 ? brand.goldLight : brand.onInkSoft} fill={goal >= 1 ? brand.goldLight : 'transparent'} />
              <Text style={[type.numeral, styles.streakNum]}>{summary.serie}</Text>
            </View>
          </View>
          {started ? (
            <Text variant="title" style={styles.headTitle} accessibilityRole="header">Préparation</Text>
          ) : (
            <Text variant="title" style={styles.headTitle} accessibilityRole="header">
              {'Bienvenue,\n'}<Text variant="title" style={styles.headName}>{identite?.pseudonyme || '…'}</Text>
            </Text>
          )}
          <View style={styles.goalRow} accessibilityLabel={`Objectif du jour : ${Math.round(summary.minutesJour)} minutes sur ${summary.objectif}`}>
            <Text variant="caption" style={styles.onSoft}>Objectif du jour</Text>
            <ProgressBar value={goal} color={brand.goldLight} track="rgba(255,255,255,0.14)" height={4} style={styles.goalBar} />
            <Text variant="caption" style={[styles.onInk, type.tabular]}>{`${Math.min(Math.round(summary.minutesJour), 999)} / ${summary.objectif} min`}</Text>
          </View>
          {!rights.abonne ? (
            <Pressable onPress={() => setSheet('trial')} style={[styles.trial, (trialAlert || !rights.essai.actif) && styles.trialAlert]} accessibilityRole="button">
              <Sparkles size={14} color={trialAlert || !rights.essai.actif ? colors.warning : brand.goldLight} />
              <Text variant="caption" style={[styles.trialText, (trialAlert || !rights.essai.actif) && { color: colors.warning }]} numberOfLines={1}>{trialLabel}</Text>
              <ChevronRight size={15} color={trialAlert || !rights.essai.actif ? colors.warning : brand.onInkSoft} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Feuille papier ── */}
        <View style={styles.sheetWrap}>
          <View style={styles.ghost} pointerEvents="none" />
          <View style={styles.sheet}>
            {online === false && queueLength ? (
              <View style={styles.offline}><CloudOff size={16} color={brand.inkSoft} /><Text variant="caption" style={styles.muted}>Hors ligne · tes réponses seront envoyées plus tard</Text></View>
            ) : null}

            {started ? (
              <Enter index={0}>
                <PressScale onPress={() => navigation.navigate('ProgressTab')} style={styles.progressCard} accessibilityLabel={`Ma progression : ${Math.round(summary.pourcentage * 100)} %, ${summary.modulesValides} modules validés sur ${summary.modulesTotal}`}>
                  <ProgressRing size={78} stroke={7} value={summary.pourcentage} track={brand.line}>
                    <AnimatedNumber value={Math.round(summary.pourcentage * 100)} suffix=" %" style={[type.numeral, styles.ringPct]} />
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <Text variant="h2" style={styles.ink}>Ma progression</Text>
                    <Text variant="caption" style={[styles.muted, { marginTop: 2 }]}>{`${summary.modulesValides} module${summary.modulesValides > 1 ? 's' : ''} validé${summary.modulesValides > 1 ? 's' : ''} sur ${summary.modulesTotal}`}</Text>
                  </View>
                  <ChevronRight size={20} color={brand.burgundy} />
                </PressScale>
                <View style={styles.stats}>
                  <StatTile icon={Flame} value={summary.serie} label={`jour${summary.serie > 1 ? 's' : ''} de série`} tint={brand.goldInk} wash={brand.goldWash} />
                  <StatTile icon={Trophy} value={rank?.rang ? `${rank.rang}ᵉ` : '—'} label={rank?.total ? `sur ${rank.total} au classement` : online === false ? 'hors ligne' : 'au classement'} onPress={() => navigation.navigate('PrepRanking', { programme: programmeCode })} />
                  <StatTile icon={Target} value={`${Math.round((summary.stats.reussite || 0) * 100)} %`} label="de réussite" tint={colors.success} wash={colors.successWash} />
                </View>
              </Enter>
            ) : null}

            {/* ── Carte héros ── */}
            <Enter index={1} style={styles.heroWrap}>
              {locked ? (
                <View style={styles.lockedHero}>
                  <View style={styles.lockedIcon}><Lock size={20} color={brand.goldInk} /></View>
                  <Text variant="h2" style={styles.ink}>Ton essai est terminé</Text>
                  <Text variant="body" style={styles.muted}>Ta progression, ton cahier d’erreurs et ton rang sont conservés.</Text>
                  <PrepButton title="Voir l’abonnement" variant="gold" onPress={() => navigation.navigate('PrepSubscription')} style={{ marginTop: 10 }} />
                </View>
              ) : continueTarget ? (
                <PressScale onPress={continueTarget.go} style={styles.continueCard} accessibilityLabel={`Continuer : ${continueTarget.label}`}>
                  <LinearGradient colors={[brand.burgundyBright, brand.burgundy, brand.burgundyDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.continueGlow} pointerEvents="none" />
                  <View style={styles.playBtn}><Play size={20} color={brand.burgundy} fill={brand.burgundy} style={{ marginLeft: 2 }} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="h2" style={styles.onInk}>Continuer</Text>
                    <Text variant="caption" style={styles.continueSub} numberOfLines={2}>{continueTarget.label}</Text>
                    <View style={styles.continueMeta}>
                      <ProgressBar value={continueTarget.progress} color={brand.goldLight} track="rgba(255,255,255,0.18)" height={4} style={{ flex: 1 }} />
                      <Text variant="caption" style={[styles.continueSub, type.tabular]} numberOfLines={1}>{continueTarget.sub}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                </PressScale>
              ) : firstPublished ? (
                <Card style={styles.startCard}>
                  <CornerFold radius={18} />
                  <View style={styles.startTop}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="caption" style={{ color: brand.goldInk, fontFamily: theme.fontFamily.semiBold }}>Ton point de départ</Text>
                      <Text variant="h2" style={styles.ink}>{`${firstPublished.matiere} · Module ${firstPublished.numero}`}</Text>
                      <Text variant="caption" style={styles.muted}>{`${firstPublished.module.lecons.length} leçons · ${firstPublished.module.duree} min · ${firstPublished.titre}`}</Text>
                    </View>
                    <Image source={ART.notebook} style={styles.startArt} resizeMode="contain" accessible={false} />
                  </View>
                  <PrepButton title="Commencer la leçon 1" iconLeft={Play} style={{ marginTop: 16 }} onPress={guard(() => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: firstPublished.module.lecons[0].code }))} />
                </Card>
              ) : null}
            </Enter>

            {/* ── À réviser ── */}
            {started ? (
              <Enter index={2}>
                {reviews.total ? (
                  <PressScale onPress={() => navigation.navigate('PrepReviews', { programme: programmeCode })} style={styles.reviewCard} accessibilityLabel={`${reviews.total} questions à réviser`}>
                    <View style={styles.reviewIcon}><RotateCcw size={19} color={brand.burgundy} /></View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={styles.inkStrong}>{`${reviews.total} question${reviews.total > 1 ? 's' : ''} à réviser`}</Text>
                      <Text variant="caption" style={styles.muted}>{`${reviews.erreurs} erreur${reviews.erreurs > 1 ? 's' : ''} · ${reviews.revisionsDues} révision${reviews.revisionsDues > 1 ? 's' : ''} programmée${reviews.revisionsDues > 1 ? 's' : ''}`}</Text>
                    </View>
                    <ChevronRight size={18} color={brand.burgundy} />
                  </PressScale>
                ) : (
                  <View style={styles.upToDate}><CheckCircle2 size={18} color={colors.success} /><Text variant="bodyMedium" style={styles.ink}>Révisions à jour</Text></View>
                )}
              </Enter>
            ) : null}

            {/* ── Puces + modules ── */}
            <SectionTitle style={styles.sectionGap} right={`${summary.modulesValides} / ${summary.modulesTotal} validés`}>Ton parcours</SectionTitle>
            <SubjectChips subjects={subjects} active={chip} onChange={(nom) => setPrefs({ puce: { ...prefs.puce, [programmeCode]: nom } })} />
            <Animated.View layout={LinearTransition.duration(260)} style={styles.modules}>
              {visible.map((m, i) => {
                const idx = modules.indexOf(m);
                const ahead = recommendedIndex >= 0 && idx > recommendedIndex && m.publie && core.moduleStatus(m.module, etat).statut !== 'valide'
                  ? modules[recommendedIndex].numero : null;
                return <ModuleRow key={m.code} item={m} etat={etat} index={i} current={idx === recommendedIndex} locked={locked && m.publie} conseilleApres={ahead && ahead !== m.numero && idx === recommendedIndex + 1 ? ahead : null} video={Boolean(findVideo(videos, 'module', m.code, prefs.versions?.[m.code] || 'fr'))} onPress={() => openModule(m)} />;
              })}
            </Animated.View>

            {/* ── Pour aller plus loin ── */}
            <SectionTitle style={styles.sectionGap}>Pour aller plus loin</SectionTitle>
            <View style={styles.tiles}>
              <PressScale style={styles.tile} onPress={guard(() => navigation.navigate('PrepMockIntro', { programme: programmeCode }))} accessibilityLabel="Concours blanc">
                <View style={[styles.tileIcon, { backgroundColor: brand.ink }]}><Timer size={20} color={brand.goldLight} /></View>
                <Text variant="h3" style={styles.ink}>Concours blanc</Text>
                <Text variant="caption" style={styles.muted} numberOfLines={2}>{`${programme.concoursBlanc.nbQuestions} questions · ${programme.concoursBlanc.dureeMinutes} min`}</Text>
                {locked ? <Lock size={14} color={brand.inkMuted} style={styles.tileLock} /> : null}
              </PressScale>
              <PressScale style={styles.tile} onPress={guard(() => navigation.navigate('PrepSession', sessionParams.test(programmeCode)))} accessibilityLabel="Test de positionnement">
                <View style={[styles.tileIcon, { backgroundColor: brand.burgundy }]}><Target size={20} color="#FFF" /></View>
                <Text variant="h3" style={styles.ink}>{etat.test ? 'Refaire le test' : 'Test de niveau'}</Text>
                <Text variant="caption" style={styles.muted} numberOfLines={2}>5 min pour savoir par où commencer</Text>
                {locked ? <Lock size={14} color={brand.inkMuted} style={styles.tileLock} /> : null}
              </PressScale>
            </View>
            <Pressable onPress={() => navigation.navigate('PrepProgramInfo', { programme: programmeCode })} style={styles.infoLink} accessibilityRole="button">
              <BookOpen size={16} color={brand.burgundy} />
              <Text variant="bodyMedium" style={{ color: brand.burgundy, flex: 1 }}>Épreuves officielles et sources du programme</Text>
              {findVideo(videos, 'concours', programmeCode) ? <Badge label="Vidéo" tone="ink" icon={PlayCircle} style={{ alignSelf: 'center' }} /> : null}
              <ChevronRight size={16} color={brand.burgundy} />
            </Pressable>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.inkDeep },
  flex: { flex: 1, backgroundColor: brand.paper },
  scroll: { flexGrow: 1 },
  empty: { alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  center: { textAlign: 'center' },
  ink: { color: brand.ink },
  inkStrong: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
  muted: { color: brand.inkSoft },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selector: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 6, paddingRight: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  selectorText: { color: brand.onInk, flexShrink: 1, fontFamily: theme.fontFamily.semiBold },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  streakNum: { color: brand.onInk, fontSize: 17, lineHeight: 22 },
  headTitle: { color: brand.onInk, marginTop: 22 },
  headName: { color: brand.goldLight, fontFamily: theme.fontFamily.serifItalic },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  goalBar: { flex: 1 },
  trial: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 12, minHeight: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(228,201,151,0.28)' },
  trialAlert: { backgroundColor: colors.warningWash, borderColor: colors.warningWash },
  trialText: { flex: 1, color: brand.onInk },
  sheetWrap: { flexGrow: 1, marginTop: 10 },
  ghost: { position: 'absolute', top: -10, left: 16, right: 16, height: 48, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: 'rgba(244,240,230,0.34)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
  sheet: { flexGrow: 1, minHeight: 600, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: brand.paperDim, marginBottom: 12 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  ringPct: { color: brand.ink, fontSize: 19, lineHeight: 24 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  heroWrap: { marginTop: 14 },
  continueCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingLeft: 16, paddingRight: 14, borderRadius: 20, overflow: 'hidden', ...theme.shadows.button },
  continueGlow: { position: 'absolute', right: -50, top: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)' },
  continueSub: { color: 'rgba(255,255,255,0.78)' },
  continueMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  playBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper, ...theme.shadows.md },
  startCard: { padding: 18, borderRadius: 20 },
  startTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startArt: { width: 112, height: 112, marginRight: -8, marginVertical: -10 },
  lockedHero: { padding: 20, borderRadius: 20, backgroundColor: brand.goldWash, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.4)' },
  lockedIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sheet, marginBottom: 4 },
  reviewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  reviewIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.burgundyWash },
  upToDate: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginTop: 4 },
  sectionGap: { marginTop: 28, marginBottom: 12 },
  chips: { gap: 8, paddingRight: 20, paddingBottom: 4 },
  chipPill: { position: 'absolute', left: 0, top: 0, height: 38, borderRadius: 19 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chipIdle: { borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
  chipText: { color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold },
  modules: { gap: 10, marginTop: 14 },
  moduleCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingLeft: 14, paddingRight: 24, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  moduleCurrent: { borderWidth: 1.5, borderColor: 'rgba(108,40,56,0.55)' },
  moduleSoon: { opacity: 0.6 },
  moduleLead: { width: 46, alignItems: 'center' },
  moduleState: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  moduleLocked: { backgroundColor: brand.paperDim, borderWidth: 1, borderColor: brand.line },
  ringNum: { fontFamily: theme.fontFamily.bold, fontSize: 16, lineHeight: 20 },
  tintDot: { width: 6, height: 6, borderRadius: 3 },
  moduleKicker: { color: brand.inkSoft, fontSize: 12, flexShrink: 1 },
  moduleText: { flex: 1, gap: 2 },
  moduleTitle: { color: brand.ink, fontFamily: theme.fontFamily.semiBold, fontSize: 16, lineHeight: 21 },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minHeight: 132, padding: 16, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, gap: 6, ...theme.shadows.soft },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLock: { position: 'absolute', top: 14, right: 14 },
  infoLink: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 16, paddingHorizontal: 14, borderRadius: 14, backgroundColor: brand.burgundyWash },
  frise: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  friseLine: { position: 'absolute', left: 18, right: 18, top: 18, height: 1, backgroundColor: brand.line },
  friseItem: { alignItems: 'center', width: 40 },
  friseDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: brand.lineStrong, backgroundColor: brand.paper, alignItems: 'center', justifyContent: 'center' },
  friseUsed: { backgroundColor: brand.ink, borderColor: brand.ink },
  friseToday: { backgroundColor: brand.gold, borderColor: brand.gold, shadowColor: brand.gold, shadowOpacity: 0.5, shadowRadius: 8 },
  friseDate: { marginTop: 4, color: brand.inkMuted, fontSize: 10 },
  benefits: { marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: brand.goldWash, gap: 10 },
});

export default PrepHomeScreen;
