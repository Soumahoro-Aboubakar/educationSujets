import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, interpolate } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, FileText, Lock, Type as TypeIcon, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { getLesson, getModule, getProgramme, levelExercises, programmeModules } from '../content';
import usePrep, { todayKey, useModuleVersion, useProgress, useRights } from '../store';
import LangToggle from '../ui/LangToggle';
import VideoPanel from '../video/VideoPanel';
import VideoDock from '../video/VideoDock';
import useVideoScroll from '../video/useVideoScroll';
import { useVideo } from '../video/useVideos';
import { brand, colors, LEVELS, paperLines, subjectTint, theme, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { CornerFold, Enter, GoldSwash, LevelDots, NightBackground, PaperStack, Pop, PrepButton, PressScale, ProgressBar, ProgressRing, Segmented, SubjectIcon } from '../ui/primitives';
import ART from '../ui/art';
import { LinearGradient } from 'expo-linear-gradient';
import { LessonBlock } from '../components/LessonBlocks';
import { LockedSheet } from '../components/Sheets';
import { useCatalogue } from './OnboardingScreens';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import { sessionParams } from './SessionScreen';

// ═══ E08 — Module ═══════════════════════════════════════════════════════
export const ModuleScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { programme: programmeCode, module: moduleCode } = route.params;
  const programme = getProgramme(programmeCode);
  // Cours de langue : version expliquée en français par défaut, ou version dans la langue étudiée.
  const [version, setVersion, versions] = useModuleVersion(moduleCode);
  const mod = getModule(moduleCode, version);
  const ref = programmeModules(programme).find((m) => m.code === moduleCode);
  // Vidéo explicative : absente → rien ne change à l'écran.
  const video = useVideo('module', moduleCode, version);
  const vs = useVideoScroll();
  const panel = useRef(null);
  const [player, setPlayer] = useState({ playing: false, started: false });
  const [dockHold, setDockHold] = useState(false);
  useEffect(() => { if (!vs.panelOut) setDockHold(false); }, [vs.panelOut]);
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
        <Text variant="caption" style={styles.headerChipText} numberOfLines={1}>{mod.matiere}</Text>
      </View>
      {versions.length > 1 ? <LangToggle value={version} versions={versions} onChange={setVersion} /> : <View style={{ width: 44 }} />}
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.ScrollView ref={vs.scrollRef} onScroll={vs.onScroll} scrollEventThrottle={16} contentContainerStyle={styles.modContent} showsVerticalScrollIndicator={false}>
        <View style={styles.modHead}>
          <SubjectIcon nom={mod.matiere} teinte={ref?.teinte} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={[styles.modKicker, { color: tint.tint }]}>{`Module ${ref?.numero || ''}`}</Text>
            <Text variant="title" style={styles.ink} accessibilityRole="header">{mod.titre}</Text>
          </View>
        </View>
        <GoldSwash width={96} style={{ marginLeft: 66, marginTop: 2 }} />
        {video ? (
          <VideoPanel
            ref={panel}
            video={video}
            kind="module"
            language={version}
            onLayout={vs.onPanelLayout}
            onRead={() => vs.scrollToAnchor('lecons')}
            readLabel="Lire le cours"
            onPlayerChange={setPlayer}
            style={styles.video}
          />
        ) : null}
        <View style={styles.modMeta}>
          <CornerFold size={30} radius={20} animated />
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

        <View onLayout={vs.anchor('lecons')}>
          <Segmented items={[{ key: 'lecons', label: 'Leçons' }, { key: 'exercices', label: 'Exercices' }]} value={tab} onChange={setTab} style={styles.segment} />
        </View>

        {tab === 'lecons' ? (
          <View style={styles.list}>
            {mod.lecons.map((l, i) => {
              const p = etat.lecons?.[l.code];
              const isNext = nextLesson?.code === l.code;
              return (
                <Enter key={l.code} index={i}>
                  <PressScale onPress={go(() => navigation.navigate('PrepLesson', { programme: programmeCode, lecon: l.code }))} style={[styles.lessonRow, isNext && styles.rowCurrent]} accessibilityLabel={`Leçon ${i + 1}, ${l.titre}, ${l.duree} minutes${p?.terminee ? ', terminée' : ''}`}>
                    {p?.terminee ? <CornerFold radius={18} size={22} /> : null}
                    <View style={[styles.lessonNum, p?.terminee && styles.lessonDone, isNext && styles.lessonNext]}>
                      {p?.terminee ? <Check size={18} color="#FFF" strokeWidth={2.8} /> : <Text style={[styles.lessonNumText, isNext && { color: brand.burgundy }]}>{i + 1}</Text>}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="caption" style={styles.muted}>{`Leçon ${i + 1} · ${l.duree} min`}</Text>
                      <Text variant="bodyMedium" style={styles.rowTitle}>{l.titre}</Text>
                      {p && !p.terminee ? <ProgressBar value={p.position} height={3} color={brand.burgundy} style={{ marginTop: 6, width: 120 }} /> : null}
                    </View>
                    <ChevronRight size={18} color={isNext ? brand.burgundy : brand.lineStrong} strokeWidth={2.2} />
                  </PressScale>
                </Enter>
              );
            })}
          </View>
        ) : (
          <View style={styles.list}>
            {[1, 2, 3].map((n, i) => {
              const count = levelExercises(mod, n).length;
              const lockedLevel = n === 3 && !st.niveau3Debloque;
              const best = scores[n];
              return (
                <Enter key={n} index={i}>
                  <PressScale
                    disabled={!count}
                    onPress={lockedLevel ? () => haptic.warning() : go(() => navigation.navigate('PrepSession', sessionParams.niveau(programmeCode, moduleCode, n)))}
                    style={[styles.levelCard, lockedLevel && styles.levelLocked, n === 3 && !lockedLevel && styles.levelGold, !count && styles.levelSoon]}
                    accessibilityLabel={`Niveau ${n}, ${LEVELS[n].label}${lockedLevel ? `, verrouillé : atteins ${Math.round(seuil * 100)} % au niveau 2` : ''}${best != null ? `, meilleur score ${Math.round(best * 100)} %` : ''}`}
                  >
                    {n === 3 && !lockedLevel ? <CornerFold radius={18} size={22} /> : null}
                    <View style={[styles.levelBadge, { backgroundColor: lockedLevel ? brand.line : `${LEVELS[n].color}18` }]}>
                      {lockedLevel ? <Lock size={18} color={brand.inkMuted} /> : <LevelDots niveau={n} size={6} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={styles.row}>
                        <Text variant="h3" style={styles.ink}>{`Niveau ${n}`}</Text>
                        <Text variant="caption" style={styles.muted}>{`· ${LEVELS[n].label}`}</Text>
                      </View>
                      <Text variant="caption" style={styles.muted}>
                        {!count ? 'Bientôt disponible' : lockedLevel ? `Atteins ${Math.round(seuil * 100)} % au niveau 2 pour débloquer` : `${n === 1 ? 'Questions directes sur chaque leçon' : n === 2 ? 'Les notions du module mélangées' : 'Cas pratiques, pièges, format concours'} · ${count} questions`}
                      </Text>
                      {lockedLevel ? <ProgressBar value={(scores[2] || 0) / seuil} height={4} color={brand.gold} style={{ marginTop: 6, width: 150 }} /> : null}
                    </View>
                    {!lockedLevel && count ? (
                      <View style={styles.levelScore}>
                        <Text style={[type.numeral, styles.levelScoreText]}>{best != null ? `${Math.round(best * 100)}` : '—'}</Text>
                        {best != null ? <Text variant="caption" style={styles.muted}>%</Text> : null}
                      </View>
                    ) : null}
                  </PressScale>
                </Enter>
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
          <ChevronRight size={18} color={brand.burgundy} />
        </PressScale>
      </Animated.ScrollView>
      {video ? (
        <VideoDock
          visible={vs.panelOut && (player.playing || dockHold)}
          playing={player.playing}
          title={video.title || mod.titre}
          durationSec={video.durationSec}
          getCurrentTime={() => panel.current?.getCurrentTime() ?? Promise.resolve(0)}
          onToggle={() => { setDockHold(true); panel.current?.toggle(); }}
          onBack={vs.scrollToPanel}
        />
      ) : null}
      <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <LinearGradient colors={['rgba(252,250,245,0)', brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {rights.peutEtudier
          ? <PrepButton title={primary.title} icon={ArrowRight} onPress={go(primary.run)} />
          : <PrepButton title="Débloquer avec l’abonnement" variant="gold" onPress={() => navigation.navigate('PrepSubscription')} />}
      </View>
      <LockedSheet visible={locked} onClose={() => setLocked(false)} onSubscribe={() => { setLocked(false); navigation.navigate('PrepSubscription'); }} />
    </PaperStack>
  );
};

const MetaFact = ({ value, label }) => (
  <View style={styles.metaFact}>
    <Text style={[type.numeral, styles.metaValue]}>{value}</Text>
    <Text variant="caption" style={styles.muted}>{label}</Text>
  </View>
);

// ═══ E10 — Lecteur de leçon / E12 — Leçon terminée ══════════════════════
const LinedPaper = ({ height }) => (
  <Svg pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]} width="100%" height={height}>
    {Array.from({ length: Math.ceil(height / paperLines.step) }, (_, i) => (
      <Path key={i} d={`M0 ${(i + 1) * paperLines.step} H2000`} stroke={paperLines.color} strokeOpacity={0.5} strokeWidth={1} />
    ))}
  </Svg>
);

const SIZES = [15, 17, 19, 21];

export const LessonScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { programme: programmeCode, lecon: leconCode } = route.params;
  // Cours de langue : même leçon (même code, même progression) dans la version choisie.
  const [version, setVersion, versions] = useModuleVersion(getLesson(leconCode)?.module.code);
  const found = getLesson(leconCode, version);
  const { lecon, module: mod, index } = found;
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
  const [sizeOpen, setSizeOpen] = useState(false);
  const [resumeBubble, setResumeBubble] = useState(false);
  const [contentH, setContentH] = useState(1);
  const [viewH, setViewH] = useState(1);
  const [nearEnd, setNearEnd] = useState(false);
  const [locked, setLocked] = useState(false);
  const scroll = useRef(null);
  const progress = useSharedValue(0);
  const lastPos = useRef(etat.lecons?.[leconCode]?.position || 0);
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
    lessonProgress(programmeCode, leconCode, lastPos.current, terminee);
  }, [addMinutes, lessonProgress, programmeCode, leconCode]);

  useFocusEffect(useCallback(() => () => save(false), [save]));

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
    if (!resumed.current && lastPos.current > 0.04 && lastPos.current < 0.98 && h > viewH) {
      resumed.current = true;
      setTimeout(() => {
        scroll.current?.scrollTo({ y: lastPos.current * (h - viewH), animated: !reduce });
        setResumeBubble(true);
        setTimeout(() => setResumeBubble(false), 2000);
      }, 250);
    }
  };

  const onPos = useCallback((p) => {
    lastPos.current = Math.max(lastPos.current, p);
    if (p > 0.9 && !nearEnd) setNearEnd(true);
  }, [nearEnd]);
  const handler = useAnimatedScrollHandler((e) => {
    const max = Math.max(1, e.contentSize.height - e.layoutMeasurement.height);
    const p = Math.min(1, Math.max(0, e.contentOffset.y / max));
    progress.value = p;
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
          <Pop><Image source={ART.medal} style={styles.doneMedal} resizeMode="contain" accessible={false} /></Pop>
          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={{ alignItems: 'center' }}>
            <Text variant="title" style={[styles.onInk, styles.centerText]} accessibilityRole="header">Leçon terminée</Text>
            <Text variant="body" style={[styles.onSoft, styles.centerText, { marginTop: 6 }]}>{lecon.titre}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.doneStats}>
            <View style={styles.doneStat}><Text style={[type.numeral, styles.doneStatValue]}>{lecon.duree}</Text><Text variant="caption" style={styles.onSoft}>min de lecture</Text></View>
            <View style={styles.doneStatSep} />
            <View style={styles.doneStat}><Text style={[type.numeral, styles.doneStatValue]}>{`${Math.round(minutesJour)}/${objectif}`}</Text><Text variant="caption" style={styles.onSoft}>min aujourd’hui</Text></View>
          </Animated.View>
          {recap.length ? (
            <Animated.View entering={FadeInDown.delay(340).duration(420)} style={styles.doneRecap}>
              <Text variant="h2" style={styles.ink}>Ce qu’il faut retenir</Text>
              {recap.map((r, i) => (
                <View key={r} style={styles.doneRecapRow}>
                  <View style={styles.doneRecapNum}><Text variant="caption" style={{ color: brand.goldInk, fontFamily: theme.fontFamily.bold }}>{i + 1}</Text></View>
                  <Text variant="body" style={[styles.ink, { flex: 1 }]}>{r}</Text>
                </View>
              ))}
            </Animated.View>
          ) : null}
        </ScrollView>
        <View style={[styles.doneActions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <PrepButton title="Passer aux exercices" icon={ArrowRight} onPress={() => navigation.replace('PrepSession', sessionParams.niveau(programmeCode, mod.code, 1))} />
          {nextLessonCode ? <PrepButton title="Leçon suivante" variant="secondary" onPress={() => navigation.replace('PrepLesson', { programme: programmeCode, lecon: nextLessonCode })} style={{ marginTop: 10 }} /> : null}
          <PrepButton title="Retour au module" variant="link" onPress={() => navigation.goBack()} />
        </View>
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
        <View style={styles.row}>
          <SubjectIcon nom={mod.matiere} teinte={ref?.teinte} size={28} />
          <Text variant="caption" style={[styles.modKicker, { color: tint.tint }]}>{`${mod.matiere} · Module ${ref?.numero || ''}`}</Text>
        </View>
        <Text variant="title" style={[styles.ink, { marginTop: 14 }]} accessibilityRole="header">{lecon.titre}</Text>
        <GoldSwash width={120} style={{ marginTop: 4 }} />
        <Text variant="caption" style={[styles.mutedLight, { marginBottom: 22, marginTop: 8 }]}>{`${lecon.duree} min de lecture`}</Text>
        <View style={{ gap: 18 }}>
          {lecon.blocs.map((bloc, i) => (
            <Animated.View key={`${lecon.code}-${i}`} entering={reduce ? undefined : FadeInDown.delay(Math.min(i, 6) * 40).duration(320)}>
              <LessonBlock bloc={bloc} tint={tint.tint} size={size} onMiniResult={(code, ok) => { if (!ok) markFragile(programmeCode, code, mod.notions[0]?.code); }} />
            </Animated.View>
          ))}
        </View>
        <View style={{ height: 130 }} />
      </Animated.ScrollView>
      {sizeOpen ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={styles.sizePicker}>
          {SIZES.map((sz) => (
            <Pressable key={sz} onPress={() => { haptic.select(); setPrefs({ tailleTexte: sz }); }} accessibilityLabel={`Taille ${sz}`} accessibilityState={{ selected: size === sz }} style={[styles.sizeBtn, size === sz && styles.sizeOn]}>
              <Text style={{ fontSize: sz - 2, fontFamily: theme.fontFamily.serif, color: size === sz ? '#FFF' : brand.ink }}>A</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
      {resumeBubble ? <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.bubble}><Text variant="caption" style={{ color: '#FFF' }}>Reprise où tu t’étais arrêté</Text></Animated.View> : null}
      {versionBubble ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.bubble} accessibilityLiveRegion="polite">
          <Text variant="caption" style={{ color: '#FFF' }}>{versionBubble === 'fr' ? 'Cours expliqué en français · même passage' : 'Cours en anglais · même passage'}</Text>
        </Animated.View>
      ) : null}
      {nearEnd || contentH <= viewH + 40 ? (
        <Animated.View entering={FadeInDown.duration(260)} style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <LinearGradient colors={['rgba(252,250,245,0)', brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <PrepButton title="Terminer la leçon" icon={Check} onPress={finish} />
        </Animated.View>
      ) : null}
      <LockedSheet visible={locked && !rights.peutEtudier} onClose={() => navigation.goBack()} onSubscribe={() => navigation.replace('PrepSubscription')} />
    </PaperStack>
  );
};

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: brand.paper },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  mutedLight: { color: brand.inkMuted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
  roundOnInk: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  headerChip: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerChipText: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold },
  headerTitle: { flexShrink: 1, marginHorizontal: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tintDot: { width: 8, height: 8, borderRadius: 4 },
  modContent: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 140 },
  modHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modKicker: { fontFamily: theme.fontFamily.semiBold },
  video: { marginTop: 20 },
  modMeta: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20, padding: 14, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  modPct: { fontFamily: theme.fontFamily.bold, fontSize: 14, color: brand.ink },
  metaFacts: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  metaFact: { alignItems: 'center' },
  metaValue: { fontSize: 24, lineHeight: 29, color: brand.ink },
  metaSep: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: brand.line },
  segment: { marginTop: 22 },
  list: { gap: 10, marginTop: 16 },
  rowTitle: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
  rowCurrent: { borderWidth: 1.5, borderColor: 'rgba(108,40,56,0.55)' },
  lessonRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  lessonNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
  lessonNumText: { fontFamily: theme.fontFamily.bold, fontSize: 15, color: brand.inkSoft },
  lessonNext: { borderColor: brand.burgundy, backgroundColor: brand.burgundyWash },
  lessonDone: { backgroundColor: colors.success, borderColor: colors.success },
  levelCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  levelLocked: { backgroundColor: brand.paperDim, shadowOpacity: 0, elevation: 0 },
  levelGold: { borderColor: brand.gold, borderWidth: 1.5 },
  levelSoon: { opacity: 0.55 },
  levelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  levelScore: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  levelScoreText: { fontSize: 24, lineHeight: 29, color: brand.ink },
  subjectsLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
  subjectsIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.ink },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 24 },
  readBar: { height: 3, backgroundColor: brand.line, overflow: 'hidden' },
  readFill: { height: 3, width: '100%', backgroundColor: brand.burgundy, transformOrigin: 'left' },
  sizePicker: { position: 'absolute', right: 16, top: 12, flexDirection: 'row', gap: 6, padding: 6, borderRadius: 16, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.lg },
  sizeBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sizeOn: { backgroundColor: brand.burgundy },
  readerContent: { paddingHorizontal: 24, paddingTop: 24 },
  bubble: { position: 'absolute', alignSelf: 'center', top: 24, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: brand.ink },
  night: { flex: 1, backgroundColor: brand.inkDeep },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  centerText: { textAlign: 'center' },
  doneContent: { paddingHorizontal: 24, alignItems: 'center', paddingBottom: 24 },
  doneMedal: { width: 168, height: 168 },
  doneStats: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 22, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  doneStat: { alignItems: 'center', minWidth: 96 },
  doneStatValue: { color: brand.goldLight, fontSize: 28, lineHeight: 34 },
  doneStatSep: { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: 'rgba(255,255,255,0.18)' },
  doneRecap: { alignSelf: 'stretch', marginTop: 22, padding: 18, borderRadius: 22, backgroundColor: brand.paper, gap: 12 },
  doneRecapRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  doneRecapNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.goldWash, marginTop: 1 },
  doneActions: { paddingHorizontal: 20, paddingTop: 14, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
