import Pressable from '../../components/ui/FeedbackPressable';
import StatusBar from '../../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, ArrowRight, Check, Lock, PlayCircle, Type as TypeIcon, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { getLesson, getModule, getProgramme, levelExercises, programmeModules, useContentGeneration } from '../content';
import usePrep, { todayKey, useModuleVersion, useProgress, useRights } from '../store';
import LangToggle from '../ui/LangToggle';
import VideoPanel from '../video/VideoPanel';
import VideoDock from '../video/VideoDock';
import useVideoScroll from '../video/useVideoScroll';
import { findVideo, useVideo, useVideosIndex } from '../video/useVideos';
import { type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { Badge, CornerFold, GoldSwash, LevelDots, NightBackground, PaperStack, PrepButton, PressScale, ProgressBar, ProgressRing, Segmented, SubjectIcon } from '../ui/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { LessonBlock } from '../components/LessonBlocks';
import { LockedSheet } from '../components/Sheets';
import { useCatalogue } from './OnboardingScreens';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import { sessionParams } from './SessionScreen';
import { CompletionStamp, CopyMargin, useResultAnnouncement } from '../components/StudyPresentation';
import { HomeChevron } from '../components/HomePresentation';
import { PURCHASE_FLOW_AVAILABLE } from '../../utils/storePolicy';

// ═══ E08 — Module ═══════════════════════════════════════════════════════
export const ModuleScreen = ({ navigation, route }) => {
  useContentGeneration(); // redessine à l'arrivée d'une nouvelle publication
  const { subjectTint, brand, colors, LEVELS, theme } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { programme: programmeCode, module: moduleCode } = route.params;
  const programme = getProgramme(programmeCode);
  // Cours de langue : version expliquée en français par défaut, ou version dans la langue étudiée.
  const [version, setVersion, versions] = useModuleVersion(moduleCode);
  const mod = getModule(moduleCode, version);
  const ref = programmeModules(programme).find((m) => m.code === moduleCode);
  // Vidéos : une par leçon, lue à l'ouverture de la leçon ; ici, seulement l'indicateur par leçon.
  const videos = useVideosIndex();
  const etat = useProgress(programmeCode);
  const rights = useRights();
  const catalogue = useCatalogue();
  const [locked, setLocked] = useState(false);
  const tint = subjectTint(ref?.teinte);
  const st = core.moduleStatus(mod, etat);
  const [tab, setTab] = useState(() => (mod.lecons.every((l) => etat.lecons?.[l.code]?.terminee) ? 'exercices' : 'lecons'));
  const scores = etat.scores?.[moduleCode] || {};
  const seuil = core.SEUILS_PAR_DEFAUT.niveau3;

  const go = (fn) => () => { if (!rights.peutEtudier) { setLocked(true); return; } haptic.select(); fn(); };
  const nextLesson = mod.lecons.find((l) => !etat.lecons?.[l.code]?.terminee);
  const nextLevel = [1, 2, 3].find((n) => (scores[n] || 0) < seuil && (n < 3 || st.niveau3Debloque));
  const primary = nextLesson
    ? { title: `${etat.lecons?.[nextLesson.code] ? 'Continuer' : 'Commencer'} la leçon ${mod.lecons.indexOf(nextLesson) + 1}`, run: () => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: nextLesson.code }) }
    : nextLevel ? { title: `Commencer le niveau ${nextLevel}`, run: () => navigation.navigate('PrepSession', sessionParams.niveau(programmeCode, moduleCode, nextLevel)) }
      : { title: 'Réviser ce module', run: () => navigation.navigate('PrepSession', sessionParams.niveau(programmeCode, moduleCode, 2)) };

  const org = catalogue.find((o) => o.sigle === programme.organisme.sigle);
  const openSubjects = () => {
    haptic.select();
    if (org?.organismeId) navigation.navigate('ParcoursTypeSelection', { organisme: { _id: org.organismeId, nom: org.nom, logo: org.logo } });
    else navigation.navigate('MainTabs', { screen: 'ExploreTab' });
  };

  const header = (
    <View style={styles.stackHeader}>
      <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" hitSlop={6} style={styles.roundOnInk}><ArrowLeft size={20} color={brand.onInk} /></Pressable>
      <View style={styles.headerChip}>
        <View style={[styles.tintDot, { backgroundColor: tint.wash }]} />
        <Text variant="caption" style={styles.headerChipText}>{`${mod.matiere} · Module ${ref?.numero || ''}`}</Text>
      </View>
      {versions.length > 1 ? <LangToggle value={version} versions={versions} onChange={setVersion} /> : <View style={{ width: 44 }} />}
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.modContent} showsVerticalScrollIndicator={false}>
        <View style={styles.modHead}>
          <SubjectIcon nom={mod.matiere} teinte={ref?.teinte} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="title" style={styles.ink} accessibilityRole="header">{mod.titre}</Text>
          </View>
        </View>
        <GoldSwash width={96} style={{ marginLeft: 66, marginTop: 2 }} />
        <View style={styles.modMeta}>
          <ProgressRing size={64} stroke={6} value={st.pourcentage} color={st.valide ? colors.success : undefined} gradient={!st.valide} track={brand.line}>
            <Text style={[styles.modPct, type.tabular]}>{`${Math.round(st.pourcentage * 100)} %`}</Text>
          </ProgressRing>
          <View style={styles.metaFacts}>
            <MetaFact value={mod.lecons.length} label="leçons" />
            <View style={styles.metaSep} />
            <MetaFact value={mod.duree} label="minutes" />
            <View style={styles.metaSep} />
            <MetaFact value={mod.exercices.length} label="exercices" />
          </View>
        </View>
        {st.valide ? <CompletionStamp label="Maîtrisé" animate={false} /> : null}

        <Segmented items={[{ key: 'lecons', label: 'Leçons' }, { key: 'exercices', label: 'Exercices' }]} value={tab} onChange={setTab} style={styles.segment} />

        {tab === 'lecons' ? (
          <View style={styles.list}>
            <CopyMargin style={{ left: 19 }} />
            {mod.lecons.map((l, i) => {
              const p = etat.lecons?.[l.code];
              const isNext = nextLesson?.code === l.code;
              const lessonVideo = findVideo(videos, 'lecon', l.code, version);
              return (
                <View key={l.code}>
                  <PressScale onPress={go(() => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: l.code }))} style={[styles.lessonRow, isNext && styles.rowCurrent]} accessibilityLabel={`Leçon ${i + 1}, ${l.titre}, ${l.duree} minutes${lessonVideo ? ', avec vidéo' : ''}${p?.terminee ? ', terminée' : ''}`}>
                    {p?.terminee ? <CornerFold radius={18} size={22} /> : null}
                    <View style={[styles.lessonNum, p?.terminee && styles.lessonDone, isNext && styles.lessonNext]}>
                      {p?.terminee ? <Check size={18} color={brand.onInk} strokeWidth={2.2} /> : <Text style={[styles.lessonNumText, isNext && { color: brand.onInk }]}>{i + 1}</Text>}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      {lessonVideo ? (
                        // Indicateur : cette leçon s'ouvre sur une vidéo (sinon, ligne inchangée).
                        <View style={styles.row}>
                          <Text variant="caption" style={styles.muted}>{`Leçon ${i + 1} · ${l.duree} min`}</Text>
                          <Badge label="Vidéo" tone="ink" icon={PlayCircle} />
                        </View>
                      ) : <Text variant="caption" style={styles.muted}>{`Leçon ${i + 1} · ${l.duree} min`}</Text>}
                      <Text variant="bodyMedium" style={styles.rowTitle}>{l.titre}</Text>
                      {p && !p.terminee ? <ProgressBar value={p.position} height={3} color={brand.burgundy} style={{ marginTop: 6, width: 120 }} /> : null}
                    </View>
                    <HomeChevron />
                  </PressScale>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.list}>
            {[1, 2, 3].map((n) => {
              const count = levelExercises(mod, n).length;
              const lockedLevel = n === 3 && !st.niveau3Debloque;
              const best = scores[n];
              return (
                <View key={n}>
                  <PressScale
                    disabled={!count}
                    onPress={lockedLevel ? () => haptic.warning() : go(() => navigation.navigate('PrepSession', sessionParams.niveau(programmeCode, moduleCode, n)))}
                    style={[styles.levelCard, lockedLevel && styles.levelLocked, n === 3 && !lockedLevel && styles.levelGold, !count && styles.levelSoon]}
                    accessibilityLabel={`Niveau ${n}, ${LEVELS[n].label}${lockedLevel ? `, verrouillé : atteins ${Math.round(seuil * 100)} % au niveau 2` : ''}${best != null ? `, meilleur score ${Math.round(best * 100)} %` : ''}`}
                  >
                    {best >= seuil ? <CornerFold radius={18} size={22} /> : null}
                    <View style={[styles.levelBadge, { backgroundColor: lockedLevel ? brand.line : `${LEVELS[n].color}18` }]}>
                      {lockedLevel ? <Lock size={18} color={brand.inkMuted} /> : <LevelDots niveau={n} size={6} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.row}>
                        <Text variant="h3" style={styles.ink}>{`Niveau ${n}`}</Text>
                        <Text variant="caption" style={styles.muted}>{`· ${LEVELS[n].label}`}</Text>
                      </View>
                      <Text variant="caption" style={styles.muted}>
                        {!count ? 'Exercices à venir. Choisis un autre niveau en attendant.' : lockedLevel ? `Atteins ${Math.round(seuil * 100)} % au niveau 2 pour débloquer` : `${n === 1 ? 'Questions directes sur chaque leçon' : n === 2 ? 'Les notions du module mélangées' : 'Cas pratiques, pièges, format concours'} · ${count} questions`}
                      </Text>
                      {lockedLevel ? <ProgressBar value={(scores[2] || 0) / seuil} height={4} color={brand.gold} style={{ marginTop: 6, width: 150 }} /> : null}
                    </View>
                    {!lockedLevel && count && best != null ? (
                      <View style={styles.levelScore}>
                        <Text style={[type.numeral, styles.levelScoreText]}>{`${Math.round(best * 100)}`}</Text>
                        <Text variant="caption" style={styles.muted}>%</Text>
                      </View>
                    ) : null}
                    {!lockedLevel && count ? <HomeChevron /> : null}
                  </PressScale>
                </View>
              );
            })}
          </View>
        )}

        <PressScale onPress={openSubjects} style={styles.subjectsLink} accessibilityLabel={`Anciens sujets ${programme.organisme.sigle}`}>
          <OrganismeLogo organisme={{ nom: programme.organisme.sigle, logo: org?.logo }} size={42} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyMedium" style={styles.rowTitle}>Anciens sujets</Text>
            <Text variant="caption" style={styles.muted} numberOfLines={1}>{`${programme.organisme.sigle} · ${programme.parcoursType}`}</Text>
          </View>
          <HomeChevron />
        </PressScale>
      </ScrollView>
      <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <LinearGradient colors={[theme.brand.paperTransparent, brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {rights.peutEtudier
          ? <PrepButton title={primary.title} icon={ArrowRight} onPress={go(primary.run)} />
          : <PrepButton title={PURCHASE_FLOW_AVAILABLE ? 'Débloquer avec l’abonnement' : 'Mon accès Premium'} variant={PURCHASE_FLOW_AVAILABLE ? 'gold' : 'primary'} onPress={() => navigation.navigate('PrepSubscription')} />}
      </View>
      <LockedSheet visible={locked} onClose={() => setLocked(false)} onSubscribe={() => { setLocked(false); navigation.navigate('PrepSubscription'); }} />
    </PaperStack>
  );
};

const MetaFact = ({ value, label }) => {
  const { styles } = useStyles();
  return (<View style={styles.metaFact}>
    <Text style={[type.numeral, styles.metaValue]}>{value}</Text>
    <Text variant="caption" style={styles.muted}>{label}</Text>
  </View>);
};

// ═══ E10 — Lecteur de leçon / E12 — Leçon terminée ══════════════════════
const LinedPaper = ({ height }) => {
  const { paperLines } = useTheme();
  return (<Svg pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]} width="100%" height={height}>
    {Array.from({ length: Math.ceil(height / paperLines.step) }, (_, i) => (
      <Path key={i} d={`M0 ${(i + 1) * paperLines.step} H2000`} stroke={paperLines.color} strokeOpacity={0.5} strokeWidth={1} />
    ))}
  </Svg>);
};

const SIZES = [15, 17, 19, 21];

export const LessonScreen = ({ navigation, route }) => {
  useContentGeneration(); // redessine à l'arrivée d'une nouvelle publication
  const { subjectTint, brand, theme } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { programme: programmeCode, lecon: leconCode } = route.params;
  // Cours de langue : même leçon (même code, même progression) dans la version choisie.
  const [version, setVersion, versions] = useModuleVersion(getLesson(leconCode)?.module.code);
  const found = getLesson(leconCode, version);
  const { lecon, module: mod, index } = found;
  // Vidéo explicative de la leçon (dans la version lue), en tête du texte ; absente → rien ne change.
  const video = useVideo('lecon', leconCode, version);
  const programme = getProgramme(programmeCode);
  const ref = programmeModules(programme).find((m) => m.code === mod.code);
  const tint = subjectTint(ref?.teinte);
  const etat = useProgress(programmeCode);
  const prefs = usePrep((s) => s.prefs);
  const setPrefs = usePrep((s) => s.setPrefs);
  const lessonProgress = usePrep((s) => s.lessonProgress);
  const addMinutes = usePrep((s) => s.addMinutes);
  const setEnCours = usePrep((s) => s.setEnCours);
  const markFragile = usePrep((s) => s.markFragile);
  const rights = useRights();
  const [done, setDone] = useState(false);
  useResultAnnouncement(done ? `Leçon terminée. ${lecon.titre}` : null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [resumeBubble, setResumeBubble] = useState(false);
  const [contentH, setContentH] = useState(1);
  const [viewH, setViewH] = useState(1);
  const [nearEnd, setNearEnd] = useState(false);
  const [locked, setLocked] = useState(false);
  const scroll = useRef(null);
  const progress = useSharedValue(0);
  const vs = useVideoScroll({ scrollRef: scroll });
  const videoY = vs.y; // valeur partagée seule : le worklet ne doit pas capturer tout l'objet vs
  const panel = useRef(null);
  const [player, setPlayer] = useState({ playing: false, started: false });
  const [dockHold, setDockHold] = useState(false);
  useEffect(() => { if (!vs.panelOut) setDockHold(false); }, [vs.panelOut]);
  // Reprise là où l'élève s'est arrêté (même s'il était remonté), pas au plus loin atteint.
  const lastPos = useRef(etat.lecons?.[leconCode]?.derniere ?? etat.lecons?.[leconCode]?.position ?? 0);
  const savedPos = useRef(lastPos.current);
  const resumeTarget = useRef(lastPos.current); // figé : les premiers défilements ne le modifient pas
  const started = useRef(Date.now());
  const opened = useRef(false);
  const size = prefs.tailleTexte || 17;

  // Ouvrir une leçon est une action de préparation (jour d'essai, § 25.3).
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const r = lessonProgress(programmeCode, leconCode, lastPos.current, false);
    if (r?.locked) setLocked(true);
    setEnCours(programmeCode, { type: 'lecon', lecon: leconCode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback((terminee = false) => {
    const minutes = Math.min(30, (Date.now() - started.current) / 60000);
    started.current = Date.now();
    addMinutes(programmeCode, minutes);
    savedPos.current = lastPos.current;
    lessonProgress(programmeCode, leconCode, lastPos.current, terminee);
  }, [addMinutes, lessonProgress, programmeCode, leconCode]);

  useFocusEffect(useCallback(() => () => save(false), [save]));

  // Sauvegarde automatique (lot 5) : toutes les 5 s si la position a changé de façon significative,
  // et immédiatement au passage en arrière-plan (appel, verrouillage, autre app).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!done && Math.abs(lastPos.current - savedPos.current) >= 0.05) save(false);
    }, 5000);
    const sub = AppState.addEventListener('change', (state) => { if (state !== 'active' && !done) save(false); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [save, done]);

  // Changement de version : on garde le passage lu (même proportion du texte).
  const [versionBubble, setVersionBubble] = useState(null);
  const pendingRatio = useRef(null);
  const switchVersion = (v) => {
    pendingRatio.current = progress.get();
    resumed.current = true;
    setVersion(v);
    setVersionBubble(v);
    setTimeout(() => setVersionBubble(null), 1800);
  };

  // Reprise exacte à la position quittée (§ 9.2).
  const resumed = useRef(false);
  const onContentSize = (_, h) => {
    setContentH(h);
    if (pendingRatio.current != null) {
      const ratio = pendingRatio.current;
      pendingRatio.current = null;
      if (h > viewH) requestAnimationFrame(() => scroll.current?.scrollTo({ y: ratio * (h - viewH), animated: false }));
      return;
    }
    if (!resumed.current && resumeTarget.current > 0.04 && resumeTarget.current < 0.98 && h > viewH) {
      resumed.current = true;
      setTimeout(() => {
        scroll.current?.scrollTo({ y: resumeTarget.current * (h - viewH), animated: !reduce });
        setResumeBubble(true);
        setTimeout(() => setResumeBubble(false), 2000);
      }, 250);
    }
  };

  const onPos = useCallback((p) => {
    lastPos.current = p;
    if (p > 0.9 && !nearEnd) setNearEnd(true);
  }, [nearEnd]);
  const handler = useAnimatedScrollHandler((e) => {
    const max = Math.max(1, e.contentSize.height - e.layoutMeasurement.height);
    const p = Math.min(1, Math.max(0, e.contentOffset.y / max));
    progress.value = p;
    videoY.set(e.contentOffset.y);
    scheduleOnRN(onPos, p);
  });
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  const finish = () => {
    haptic.success();
    lastPos.current = 1;
    save(true);
    setEnCours(programmeCode, null);
    setDone(true);
  };

  const nextLessonCode = mod.lecons[index + 1]?.code;
  const recap = lecon.blocs.find((bl) => bl.type === 'recap')?.items || [];
  const today = todayKey();
  const minutesJour = core.minutesToday(etat, today);
  const objectif = etat.objectifQuotidien || prefs.objectif;

  if (done) {
    return (
      <View style={styles.night}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <NightBackground />
        <ScrollView contentContainerStyle={[styles.doneContent, { paddingTop: insets.top + 28 }]} showsVerticalScrollIndicator={false}>
          <CompletionStamp label="Leçon terminée" eventKey={`lesson:${programmeCode}:${leconCode}`} onInk />
          <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
            <Text variant="title" style={[styles.onInk, styles.centerText]} accessibilityRole="header">{lecon.titre}</Text>
          </View>
          <View style={styles.doneStats}>
            <View style={styles.doneStat}><Text style={[type.numeral, styles.doneStatValue]}>{lecon.duree}</Text><Text variant="caption" style={styles.onSoft}>min de lecture</Text></View>
            <View style={styles.doneStatSep} />
            <View style={styles.doneStat}><Text style={[type.numeral, styles.doneStatValue]}>{`${Math.round(minutesJour)}/${objectif}`}</Text><Text variant="caption" style={styles.onSoft}>min aujourd’hui</Text></View>
          </View>
          {recap.length ? (
            <View style={styles.doneRecap}>
              <CopyMargin style={{ left: 14, top: 20, bottom: 20 }} />
              <Text variant="h2" style={styles.ink}>Ce qu’il faut retenir</Text>
              {recap.map((r, i) => (
                <View key={r} style={styles.doneRecapRow}>
                  <View style={styles.doneRecapNum}><Text variant="caption" style={{ color: brand.goldInk, fontFamily: theme.fontFamily.bold }}>{i + 1}</Text></View>
                  <Text variant="body" style={[styles.ink, { flex: 1 }]}>{r}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.doneSpacer} />
          <View style={[styles.doneActions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <PrepButton title="Passer aux exercices" icon={ArrowRight} onPress={() => navigation.replace('PrepSession', sessionParams.niveau(programmeCode, mod.code, 1))} />
            {nextLessonCode ? <PrepButton title="Leçon suivante" variant="secondary" onPress={() => navigation.replace('PrepLesson', { programme: programmeCode, lecon: nextLessonCode })} style={{ marginTop: 10 }} /> : null}
            <PrepButton title="Retour au module" variant="link" onPress={() => navigation.goBack()} style={styles.tertiaryAction} textStyle={styles.tertiaryText} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const header = (
    <View style={styles.stackHeader}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={6} accessibilityLabel="Quitter la leçon" style={styles.roundOnInk}><X size={20} color={brand.onInk} /></Pressable>
      <Text variant="bodyMedium" style={[styles.headerChipText, styles.headerTitle]} numberOfLines={1}>{`Leçon ${index + 1} sur ${mod.lecons.length}`}</Text>
      <View style={styles.headerRight}>
        {versions.length > 1 ? <LangToggle value={version} versions={versions} onChange={switchVersion} /> : null}
        <Pressable onPress={() => { haptic.select(); setSizeOpen((o) => !o); }} hitSlop={6} accessibilityLabel="Taille du texte" accessibilityState={{ expanded: sizeOpen }} style={[styles.roundOnInk, sizeOpen && { backgroundColor: 'rgba(228,201,151,0.22)' }]}><TypeIcon size={18} color={brand.onInk} /></Pressable>
      </View>
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.readBar}><Animated.View style={[styles.readFill, bar]} /></View>
      <Animated.ScrollView
        ref={scroll}
        onScroll={handler}
        scrollEventThrottle={32}
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
        onContentSizeChange={onContentSize}
        contentContainerStyle={styles.readerContent}
        showsVerticalScrollIndicator={false}
      >
        <LinedPaper height={contentH} />
        <CopyMargin style={{ left: 10, top: 24, bottom: 130 }} />
        <View style={styles.row}>
          <SubjectIcon nom={mod.matiere} teinte={ref?.teinte} size={28} />
          <Text variant="caption" style={[styles.modKicker, { color: tint.tint }]}>{`${mod.matiere} · Module ${ref?.numero || ''}`}</Text>
        </View>
        <Text variant="title" style={[styles.ink, { marginTop: 14 }]} accessibilityRole="header">{lecon.titre}</Text>
        <GoldSwash width={120} style={{ marginTop: 4 }} />
        <Text variant="caption" style={[styles.mutedLight, { marginBottom: 22, marginTop: 8 }]}>{`${lecon.duree} min de lecture`}</Text>
        {video ? (
          <VideoPanel
            ref={panel}
            video={video}
            kind="lecon"
            language={version}
            onLayout={vs.onPanelLayout}
            onRead={() => vs.scrollToAnchor('texte')}
            readLabel="Lire la leçon"
            onPlayerChange={setPlayer}
            style={styles.lessonVideo}
          />
        ) : null}
        <View style={{ gap: 24 }} onLayout={vs.anchor('texte')}>
          {lecon.blocs.map((bloc, i) => (
            <View key={`${lecon.code}-${i}`}>
              <LessonBlock bloc={bloc} tint={tint.tint} size={size} onMiniResult={(code, ok) => { if (!ok) markFragile(programmeCode, code, mod.notions[0]?.code); }} />
            </View>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </Animated.ScrollView>
      {video ? (
        <VideoDock
          visible={vs.panelOut && (player.playing || dockHold)}
          playing={player.playing}
          title={video.title || lecon.titre}
          durationSec={video.durationSec}
          getCurrentTime={() => panel.current?.getCurrentTime() ?? Promise.resolve(0)}
          onToggle={() => { setDockHold(true); panel.current?.toggle(); }}
          onBack={vs.scrollToPanel}
          top={14}
        />
      ) : null}
      {sizeOpen ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} exiting={reduce ? undefined : FadeOut.duration(120)} style={styles.sizePicker}>
          {SIZES.map((sz) => (
            <Pressable key={sz} onPress={() => { haptic.select(); setPrefs({ tailleTexte: sz }); }} accessibilityLabel={`Taille ${sz}`} accessibilityState={{ selected: size === sz }} style={[styles.sizeBtn, size === sz && styles.sizeOn]}>
              <Text style={{ fontSize: sz - 2, fontFamily: theme.fontFamily.serif, color: size === sz ? brand.onInk : brand.ink }}>A</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
      {resumeBubble ? <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.bubble}><Text variant="caption" style={{ color: brand.onInk }}>Reprise où tu t’étais arrêté</Text></Animated.View> : null}
      {versionBubble ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.bubble} accessibilityLiveRegion="polite">
          <Text variant="caption" style={{ color: brand.onInk }}>{versionBubble === 'fr' ? 'Cours expliqué en français · même passage' : 'Cours en anglais · même passage'}</Text>
        </Animated.View>
      ) : null}
      {nearEnd || contentH <= viewH + 40 ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <LinearGradient colors={[theme.brand.paperTransparent, brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <PrepButton title="Terminer la leçon" icon={Check} onPress={finish} />
        </Animated.View>
      ) : null}
      <LockedSheet visible={locked && !rights.peutEtudier} onClose={() => navigation.goBack()} onSubscribe={() => navigation.replace('PrepSubscription')} />
    </PaperStack>
  );
};

const useStyles = createThemedStyles(({ brand, theme, colors }) => {
  const styles = StyleSheet.create({
    paper: { flex: 1, backgroundColor: brand.paper },
    ink: { color: brand.ink },
    muted: { color: brand.inkSoft },
    mutedLight: { color: brand.inkMuted, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    stackHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
    roundOnInk: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
    headerChip: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, minHeight: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)' },
    headerChipText: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold, flexShrink: 1 },
    headerTitle: { flexShrink: 1, marginHorizontal: 8 },
    headerRight: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center', gap: 8 },
    tintDot: { width: 8, height: 8, borderRadius: 4 },
    modContent: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 24 },
    modHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    modKicker: { fontFamily: theme.fontFamily.semiBold },
    lessonVideo: { marginBottom: 28 },
    modMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 24, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    modPct: { fontFamily: theme.fontFamily.bold, fontSize: 14, color: brand.ink },
    metaFacts: { flexGrow: 1, flexBasis: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    metaFact: { alignItems: 'center' },
    metaValue: { fontSize: 24, lineHeight: 29, color: brand.ink },
    metaSep: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: brand.line },
    segment: { marginTop: 22 },
    list: { gap: 8, marginTop: 20 },
    rowTitle: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
    rowCurrent: { borderWidth: 1.5, borderColor: brand.burgundy, borderRadius: 16, backgroundColor: brand.sheet },
    lessonRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    lessonNum: { minWidth: 40, minHeight: 40, padding: 6, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
    lessonNumText: { fontFamily: theme.fontFamily.bold, fontSize: 15, color: brand.inkSoft },
    lessonNext: { borderColor: brand.burgundy, backgroundColor: brand.burgundySolid },
    lessonDone: { backgroundColor: colors.successSolid, borderColor: colors.success },
    levelCard: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    levelLocked: { backgroundColor: brand.paperDim, shadowOpacity: 0, elevation: 0 },
    levelGold: { borderBottomColor: brand.gold },
    levelSoon: { backgroundColor: brand.paperDim },
    levelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    levelScore: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, maxWidth: '24%' },
    levelScoreText: { fontSize: 24, lineHeight: 29, color: brand.ink },
    subjectsLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
    subjectsIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.night },
    sticky: { paddingHorizontal: 20, paddingTop: 24 },
    readBar: { height: 3, backgroundColor: brand.line, overflow: 'hidden' },
    readFill: { height: 3, width: '100%', backgroundColor: brand.burgundySolid, transformOrigin: 'left' },
    sizePicker: { alignSelf: 'flex-end', margin: 12, flexWrap: 'wrap', flexDirection: 'row', gap: 6, padding: 6, borderRadius: 16, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.lg },
    sizeBtn: { minWidth: 44, minHeight: 44, padding: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sizeOn: { backgroundColor: brand.burgundySolid },
    readerContent: { paddingHorizontal: 24, paddingTop: 24 },
    bubble: { position: 'absolute', alignSelf: 'center', top: 24, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: brand.night },
    night: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.inkDeep },
    onInk: { color: brand.onInk },
    onSoft: { color: brand.onInkSoft },
    centerText: { textAlign: 'center' },
    doneContent: { flexGrow: 1, paddingHorizontal: 24, alignItems: 'center' },

    doneStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 18, paddingVertical: 14 },
    doneStat: { alignItems: 'center', minWidth: 96 },
    doneStatValue: { color: brand.goldLight, fontSize: 28, lineHeight: 34 },
    doneStatSep: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: 'rgba(255,255,255,0.18)' },
    doneRecap: { alignSelf: 'stretch', marginTop: 22, padding: 20, paddingLeft: 32, borderRadius: 22, backgroundColor: brand.paper, gap: 16 },
    doneRecapRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    doneRecapNum: { minWidth: 24, minHeight: 24, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.goldWash, marginTop: 1 },
    tertiaryAction: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 4, backgroundColor: brand.paper, borderColor: brand.line },
    tertiaryText: { color: brand.inkSoft, fontSize: 14 },
    doneSpacer: { flex: 1, minHeight: 28 },
    doneActions: { alignSelf: 'stretch', marginHorizontal: -24, paddingHorizontal: 20, paddingTop: 18, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  });
  return { styles };
});
