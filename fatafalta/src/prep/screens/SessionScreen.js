import Pressable from '../../components/ui/FeedbackPressable';
import { useOpenSubscription } from '../../hooks/useAccountLink';
import StatusBar from '../../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';

import { ordinal } from '../../utils/ordinal';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Flag, LayoutGrid, Lightbulb, MoreHorizontal, NotebookPen, RotateCcw, Sparkles, Trophy, X,
} from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import RENDERERS, { GESTURE_HEAVY } from '../exercises';
import { getExercise, getModule, getProgramme, levelExercises, pickAcrossProgramme, programmeModules } from '../content';
import usePrep, { todayKey, useRights } from '../store';
import prepApi from '../api';
import { type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { Badge, GoldSwash, LevelDots, NightBackground, PaperStack, PrepButton } from '../ui/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { answerPrompt, CompletionStamp, CopyMargin, CorrectorNote, useResultAnnouncement } from '../components/StudyPresentation';
import BottomSheet, { Dialog } from '../ui/BottomSheet';
import { LockedSheet, MiniCoursSheet, ReasoningSheet } from '../components/Sheets';

/**
 * Session d'exercices plein écran (§ 10, § 12 ; maquettes E13 à E27).
 * Modes : 'niveau' (module + niveau), 'revision' (révisions du jour + cahier d'erreurs),
 * 'blanc' (concours blanc, § 17) et 'test' (test de positionnement, § 16).
 */

const SESSION_SIZE = { niveau: 15, revision: 20 };
const MAX_MINUTES_PAR_QUESTION = 3;

const buildSession = ({ mode, programme, module, niveau, codes, nombre, dureeMinutes }) => {
  const id = `${mode}-${programme}-${module || 'p'}-${niveau || 0}-${Date.now().toString(36)}`;
  const seed = id;
  let list = codes || [];
  if (mode === 'niveau') list = core.seededShuffle(levelExercises(getModule(module), niveau).map((e) => e.code), seed).slice(0, SESSION_SIZE.niveau);
  if (mode === 'blanc' || mode === 'test') list = pickAcrossProgramme(getProgramme(programme), { nombre, mode, graine: seed });
  return {
    id, mode, programme, module: module || null, niveau: niveau || null, seed,
    codes: list, index: 0, items: {}, debut: Date.now(),
    finA: mode === 'blanc' ? Date.now() + dureeMinutes * 60000 : null,
    pauseUtilisee: false, termine: false,
  };
};

const emptyItem = () => ({ essai: 1, value: null, phase: 'answer', result: null, indices: 0, final: false, points: 0, premierCoup: null, aRevoir: false, debut: Date.now() });

// ── En-tête : quitter · progression segmentée · indice (E13) ───────────────
const Segments = ({ session }) => {
  const { brand, colors } = useTheme();
  const { styles } = useStyles();
  return (<View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: session.codes.length, now: session.index + 1 }}>
    {session.codes.map((code, i) => {
      const it = session.items[code];
      let bg = brand.line;
      if (i === session.index && !it?.final) bg = brand.ink;
      if (it?.final && session.mode !== 'blanc' && session.mode !== 'test') bg = it.result?.correct ? (it.essai === 2 ? colors.warning : colors.success) : colors.error;
      if (session.mode === 'blanc' && it?.value) bg = brand.ink;
      if (session.mode === 'test' && it?.final) bg = brand.ink;
      return <View key={code} style={[styles.segment, { backgroundColor: bg }, it?.essai === 2 && !it.final && styles.segmentSecond]} />;
    })}
  </View>);
};

const Timer = ({ finA, onEnd }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const [left, setLeft] = useState(Math.max(0, finA - Date.now()));
  const ended = useRef(false);
  useEffect(() => {
    const t = setInterval(() => {
      const l = Math.max(0, finA - Date.now());
      setLeft(l);
      if (l === 0 && !ended.current) { ended.current = true; onEnd(); }
    }, 500);
    return () => clearInterval(t);
  }, [finA, onEnd]);
  const m = Math.floor(left / 60000); const s = Math.floor((left % 60000) / 1000);
  const tone = left < 120000 ? colors.error : left < 600000 ? colors.warning : brand.ink;
  return (
    <View style={[styles.timer, { backgroundColor: tone }]} accessibilityLabel={`Temps restant ${m} minutes ${s} secondes`}>
      <Text variant="h3" style={[styles.timerText, type.tabular]}>{`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`}</Text>
    </View>
  );
};

// ── Bandeau de correction (E23) ───────────────────────────────────────────
const CorrectionBanner = ({ item, exercice, mode, onShowRecall, onReason, onNext, iaLabel }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const r = item.result;
  const { height, fontScale } = useWindowDimensions();
  useResultAnnouncement(r ? (r.pending ? 'Réponse enregistrée. Elle sera corrigée dès le retour de la connexion.' : `${r.correct ? (item.essai === 1 ? 'Bien joué' : 'Bien rattrapé') : item.final ? 'La bonne réponse' : 'Pas tout à fait'}. ${item.final ? r.explication || exercice.explication || '' : 'Petit rappel avant de réessayer.'}`) : null);
  if (!r) return null;
  const canReason = exercice.raisonnement?.actif && r.correct;
  const explication = r.explication || exercice.explication;
  let tone; let title; let body; let actions;
  if (r.pending) {
    tone = { bg: colors.warningWash, fg: colors.warning }; title = 'Réponse enregistrée';
    body = 'Pas de connexion pour la corriger maintenant. Elle sera corrigée dès que tu seras de nouveau en ligne, et comptera dans ta progression.';
  } else if (r.correct && item.essai === 1) {
    tone = { bg: colors.successWash, fg: colors.success }; title = 'Bien joué'; body = explication;
  } else if (r.correct) {
    tone = { bg: colors.warningWash, fg: colors.warning }; title = 'Bien rattrapé'; body = `50 % des points. ${explication || ''}`;
  } else if (!item.final) {
    tone = { bg: colors.errorWash, fg: colors.error }; title = 'Pas tout à fait'; body = 'Petit rappel avant de réessayer.';
    actions = <PrepButton title="Voir le rappel" onPress={onShowRecall} />;
  } else {
    tone = { bg: colors.errorWash, fg: colors.error }; title = 'La bonne réponse'; body = explication;
  }
  if (!actions) {
    actions = canReason ? (
      <View style={[styles.bannerActions, fontScale >= 1.3 && { flexDirection: 'column' }]}>
        <PrepButton title="Expliquer" variant="secondary" iconLeft={Sparkles} onPress={onReason} style={styles.half} accessibilityLabel={`Expliquer mon raisonnement${iaLabel ? `, ${iaLabel}` : ''}`} />
        <PrepButton title="Suivante" icon={ArrowRight} onPress={onNext} style={styles.half} />
      </View>
    ) : <PrepButton title="Continuer" icon={ArrowRight} onPress={onNext} />;
  }
  return (
    <View style={styles.banner}>
      <ScrollView style={{ maxHeight: height * 0.32 }} contentContainerStyle={{ paddingBottom: 12 }} nestedScrollEnabled>
        <View accessibilityLiveRegion="polite">
          <CorrectorNote title={title} correct={r.correct} color={tone.fg}>
            {body ? <Text variant="body" style={styles.bannerBody}>{body}</Text> : null}
            {item.final && !r.correct && mode !== 'test' ? (
              <View style={styles.notebook}>
                <NotebookPen size={16} color={brand.inkSoft} />
                <Text variant="caption" style={styles.muted}>Ajoutée à ton cahier d’erreurs</Text>
              </View>
            ) : null}
            {canReason && iaLabel ? <Text variant="caption" style={[styles.muted, { marginBottom: 6 }]}>{iaLabel}</Text> : null}
          </CorrectorNote>
        </View>
      </ScrollView>
      {actions}
    </View>
  );
};

// ── Bilan (E27) ───────────────────────────────────────────────────────────
const SessionReview = ({ session, navigation, onRestart, celebrations }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const items = session.codes.map((c) => session.items[c]).filter(Boolean);
  const total = session.codes.length;
  const pts = items.reduce((a, it) => a + (it.points || 0), 0);
  const ratio = total ? pts / total : 0;
  const premier = items.filter((it) => it.result?.correct && it.essai === 1).length;
  const rattrapees = items.filter((it) => it.result?.correct && it.essai === 2).length;
  const auCahier = items.filter((it) => it.final && !it.result?.correct && !it.result?.pending).length;
  const enAttente = items.filter((it) => it.result?.pending).length;
  const [rank, setRank] = useState(null);
  useEffect(() => { prepApi.ranking(session.programme, 'tout').then(setRank).catch(() => {}); }, [session.programme]);
  const versions = usePrep((s) => s.prefs.versions);
  const mod = session.module ? getModule(session.module, versions) : null;
  const title = session.mode === 'blanc' ? 'Copie remise' : ratio >= 0.8 ? 'Excellente session' : ratio >= 0.5 ? 'Bonne progression' : 'Chaque erreur te fait avancer';
  const label = session.mode === 'niveau' ? `Niveau ${session.niveau} · ${mod?.titre || ''}` : session.mode === 'revision' ? 'Révisions' : session.mode === 'blanc' ? 'Concours blanc' : 'Test de positionnement';
  const reviewCodes = items.filter((it) => !it.result?.correct || it.essai === 2).length;

  const pct = Math.round(ratio * 100);
  useResultAnnouncement(`${title}. ${pct} % de réussite.`);
  const scoreText = session.mode === 'blanc' ? null : `${Math.round(pts * 10) / 10 === Math.round(pts) ? Math.round(pts) : (Math.round(pts * 10) / 10).toString().replace('.', ',')}`;
  const rows = session.mode === 'test' ? [] : [
    [Check, colors.success, colors.successWash, premier, `bonne${premier > 1 ? 's' : ''} réponse${premier > 1 ? 's' : ''} du premier coup`],
    [RotateCcw, colors.warning, colors.warningWash, rattrapees, `rattrapée${rattrapees > 1 ? 's' : ''} en seconde chance`],
    [NotebookPen, colors.error, colors.errorWash, auCahier, 'ajoutée' + (auCahier > 1 ? 's' : '') + ' au cahier d’erreurs'],
  ];

  return (
    <View style={styles.reviewRoot}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <NightBackground />
      <ScrollView contentContainerStyle={[styles.reviewContent, { paddingTop: insets.top + 8 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Fermer" style={styles.reviewClose} hitSlop={6}><X size={20} color={brand.onInk} /></Pressable>
        <View style={styles.reviewHero} accessibilityLiveRegion="polite">
          <CompletionStamp label={celebrations.some((c) => c.startsWith('Module ')) ? 'Maîtrisé' : 'Session terminée'} eventKey={celebrations.some((c) => c.startsWith('Module ')) ? `module:${session.programme}:${session.module}` : session.id} feedback onInk />
          <Text style={[type.hero, styles.reviewTitle]} accessibilityRole="header">{title}</Text>
          <Text variant="caption" style={styles.reviewLabel}>{label}</Text>
          {session.mode === 'blanc' ? (
            <View style={styles.scoreRow}>
              <Text style={[type.display, styles.reviewScore]}>{(20 * ratio).toFixed(1).replace('.', ',')}</Text>
              <Text style={[type.numeral, styles.reviewScoreSur]}>/ 20</Text>
            </View>
          ) : (
            <View style={styles.scoreRow} accessibilityLabel={`${scoreText} sur ${total}`}>
              <Text style={[type.display, styles.reviewScore]}>{scoreText}</Text>
              <Text style={[type.numeral, styles.reviewScoreSur]}>{`/ ${total}`}</Text>
            </View>
          )}
          <Text variant="bodyMedium" style={styles.reviewPct}>{enAttente ? `${session.mode === 'blanc' ? 'Note provisoire' : 'Score provisoire'} · ${enAttente} réponse${enAttente > 1 ? 's' : ''} en attente de correction` : `${pct} % de réussite`}</Text>
        </View>
        {rows.length || rank?.rang ? (
          <View style={styles.reviewCard}>
            <CopyMargin style={{ left: 12, top: 18, bottom: 18 }} />
            {rows.map(([Icon, fg, bg, n, l]) => (
              <View key={l} style={styles.reviewRow}>
                <View style={[styles.reviewRowIcon, { backgroundColor: bg }]}><Icon size={16} color={fg} strokeWidth={2.2} /></View>
                <Text style={[type.numeral, styles.reviewRowNum]}>{n}</Text>
                <Text variant="body" style={styles.reviewRowText}>{l}</Text>
              </View>
            ))}
            {rank?.rang ? (
              <View style={[styles.reviewRow, rows.length ? styles.reviewRowTop : null]}>
                <View style={[styles.reviewRowIcon, { backgroundColor: brand.goldWash }]}><Trophy size={16} color={brand.goldInk} /></View>
                <Text style={[type.numeral, styles.reviewRowNum]}>{ordinal(rank.rang)}</Text>
                <Text variant="body" style={styles.reviewRowText}>{`sur ${rank.total} au classement`}</Text>
                {rank.variation ? <Text variant="bodyMedium" style={{ color: rank.variation > 0 ? colors.success : colors.error }}>{rank.variation > 0 ? `▲ ${rank.variation}` : `▼ ${-rank.variation}`}</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {celebrations.map((c) => (
          <View key={c} style={styles.celebration}>
            <Check size={18} color={brand.goldLight} />
            <Text variant="bodyMedium" style={{ color: brand.goldLight, flexShrink: 1 }}>{c}</Text>
          </View>
        ))}
        <View style={styles.reviewSpacer} />
        <View style={[styles.reviewPanel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <PrepButton title="Continuer" icon={ArrowRight} onPress={() => navigation.goBack()} />
          {reviewCodes && session.mode !== 'test' ? <PrepButton title="Revoir mes erreurs" variant="secondary" onPress={() => navigation.replace('PrepReviews', { programme: session.programme, onglet: 'cahier' })} style={{ marginTop: 10 }} /> : null}
          {session.mode === 'niveau' ? <PrepButton title="Refaire la session" variant="link" iconLeft={RotateCcw} onPress={onRestart} style={styles.tertiaryAction} textStyle={styles.tertiaryText} /> : null}
        </View>
      </ScrollView>
    </View>
  );
};

// ── Bilan du test de positionnement (E31) ─────────────────────────────────
const placementResult = (session) => {
  const programme = getProgramme(session.programme);
  const mods = programmeModules(programme).filter((m) => m.publie);
  const parMatiere = {};
  session.codes.forEach((code) => {
    const found = getExercise(code);
    if (!found) return;
    const ref = mods.find((m) => m.code === found.module.code);
    const matiere = ref?.matiere || found.module.matiere;
    parMatiere[matiere] = parMatiere[matiere] || { justes: 0, total: 0, modules: {} };
    const ok = session.items[code]?.result?.correct;
    parMatiere[matiere].total += 1;
    if (ok) parMatiere[matiere].justes += 1;
    parMatiere[matiere].modules[found.module.code] = (parMatiere[matiere].modules[found.module.code] || 0) + (ok ? 1 : 0);
  });
  return Object.entries(parMatiere).map(([matiere, v]) => {
    const taux = v.total ? v.justes / v.total : 0;
    const niveau = taux >= 0.75 ? 'Avancé' : taux >= 0.4 ? 'Intermédiaire' : 'Débutant';
    const ordre = mods.filter((m) => m.matiere === matiere);
    const depart = ordre.find((m) => !v.modules[m.code]) || ordre[0];
    return { matiere, taux, niveau, depart: depart ? { code: depart.code, titre: depart.titre, numero: depart.numero } : null, aSurvoler: ordre.filter((m) => v.modules[m.code] >= 2).map((m) => m.code) };
  });
};

const PlacementReview = ({ result, navigation }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  useEffect(() => { haptic.celebrate(); }, []);
  return (
    <PaperStack header={<View style={styles.stackHeader}><View style={{ width: 44 }} /><Text variant="bodyMedium" style={styles.headerText}>Test de positionnement</Text><View style={{ width: 44 }} /></View>}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 26, gap: 14 }}>
        <Text variant="title" style={{ color: brand.ink }} accessibilityRole="header">Ton profil</Text>
        <GoldSwash width={96} style={{ marginTop: -10 }} />
        {result.map((r) => (
          <Animated.View key={r.matiere} entering={reduce ? undefined : FadeIn.duration(150)} style={styles.placeCard}>
            <View style={styles.placeHead}>
              <Text variant="h3" style={{ color: brand.ink, flex: 1 }}>{r.matiere}</Text>
              <Badge label={r.niveau} tone={r.niveau === 'Avancé' ? 'success' : r.niveau === 'Intermédiaire' ? 'gold' : 'neutral'} />
            </View>
            <View style={styles.placeBar}><View style={[styles.placeFill, { width: `${Math.round(r.taux * 100)}%` }]} /></View>
            {r.depart ? <Text variant="caption" style={styles.muted}>{`Commence par : Module ${r.depart.numero} · ${r.depart.titre}`}</Text> : null}
          </Animated.View>
        ))}
      </ScrollView>
      <View style={{ padding: 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <PrepButton title="Voir mon parcours" icon={ArrowRight} onPress={() => navigation.goBack()} />
      </View>
    </PaperStack>
  );
};

// ═════════════════════════════════════════════════════════════════════════
const SessionScreen = ({ navigation, route }) => {
  const subscription = useOpenSubscription(navigation);
  const { brand, LEVELS, theme, colors } = useTheme();
  const { styles } = useStyles();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const params = route.params || {};
  const store = usePrep();
  const rights = useRights();
  const [session, setSession] = useState(() => {
    if (params.sessionId && store.sessions[params.sessionId]) return store.sessions[params.sessionId];
    return buildSession(params);
  });
  const [sheet, setSheet] = useState(null); // 'mini' | 'reason' | 'quit' | 'grid' | 'locked' | 'report' | 'submit'
  const [hint, setHint] = useState(false);
  const [celebrations, setCelebrations] = useState([]);
  const [placement, setPlacement] = useState(null);
  const lastCheckpoint = useRef(Date.now());

  const mode = session.mode;
  const code = session.codes[session.index];
  // Cours de langue : consignes, explications et mini-cours dans la version choisie (clés identiques).
  const found = code ? getExercise(code, store.prefs.versions) : null;
  const exercice = found?.exercice;
  const item = session.items[code] || emptyItem();
  const Renderer = exercice ? RENDERERS[exercice.type] : null;
  const itemSeed = `${session.seed}:${code}:${item.essai}`;

  // Sauvegarde continue (§ 11.11) et « Continuer » sur Prépa (§ 7.1).
  useEffect(() => {
    if (session.termine) { store.dropSession(session.id); store.setEnCours(session.programme, null); return; }
    store.saveSession(session);
    if (mode === 'niveau' || mode === 'revision') store.setEnCours(session.programme, { type: 'session', id: session.id, mode, module: session.module, niveau: session.niveau, index: session.index, total: session.codes.length });
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const countMinutes = () => {
    const minutes = Math.min(MAX_MINUTES_PAR_QUESTION, (Date.now() - lastCheckpoint.current) / 60000);
    lastCheckpoint.current = Date.now();
    store.addMinutes(session.programme, minutes);
  };

  const update = (patch) => setSession((s) => ({ ...s, items: { ...s.items, [code]: { ...(s.items[code] || emptyItem()), ...patch } } }));

  const finish = useCallback((s) => {
    const final = { ...s, termine: true };
    const done = final.codes.map((c) => final.items[c]).filter(Boolean);
    const pts = done.reduce((a, it) => a + (it.points || 0), 0);
    const score = final.codes.length ? pts / final.codes.length : 0;
    if (final.mode === 'niveau') {
      const mod = getModule(final.module, store.prefs.versions);
      const before = core.moduleStatus(mod, usePrep.getState().progress(final.programme));
      store.finishSession({ programme: final.programme, module: final.module, niveau: final.niveau, session: final.id, score, nbQuestions: final.codes.length });
      const after = core.moduleStatus(mod, usePrep.getState().progress(final.programme));
      const c = [];
      if (!before.niveau3Debloque && after.niveau3Debloque) c.push('Niveau avancé débloqué');
      if (!before.valide && after.valide) c.push(`Module « ${mod.titre} » validé`);
      setCelebrations(c);
    }
    if (final.mode === 'blanc') {
      // Correction à la remise uniquement (§ 17) : chaque réponse est enregistrée maintenant.
      final.codes.forEach((c) => {
        const it = final.items[c] || emptyItem();
        const f = getExercise(c);
        if (!f) return;
        const r = it.value ? store.attempt({ programme: final.programme, exercice: c, module: f.module.code, reponse: it.value, essai: 1, indices: 0, contexte: 'blanc', session: final.id }) : null;
        // Exercice corrigé par le serveur : réponse en file, note recalculée par le serveur.
        final.items[c] = { ...it, result: r?.pending ? { pending: true, correct: false, score: 0 } : (r || { correct: false, score: 0 }), points: r?.pending ? 0 : r?.points || 0, final: true };
      });
      const total = final.codes.reduce((a, c) => a + (final.items[c].points || 0), 0);
      store.finishMockExam({ programme: final.programme, session: final.id, note: Math.round((20 * total / Math.max(1, final.codes.length)) * 10) / 10, nbQuestions: final.codes.length, duree: Math.round((Date.now() - final.debut) / 60000) });
    }
    if (final.mode === 'test') {
      const res = placementResult(final);
      store.savePlacement(final.programme, { le: todayKey(), resultats: res });
      setPlacement(res);
    }
    setSession(final);
  }, [store]);

  // Quitter en cours : confirmation et sauvegarde (§ 5.3, E26).
  const askQuit = () => { setSheet('quit'); return true; };
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => (session.termine ? false : askQuit()));
    return () => sub.remove();
  }, [session.termine]));

  if (session.termine) {
    if (placement) return <PlacementReview result={placement} navigation={navigation} />;
    return <SessionReview session={session} navigation={navigation} celebrations={celebrations} onRestart={() => { setCelebrations([]); setSession(buildSession({ mode: 'niveau', programme: session.programme, module: session.module, niveau: session.niveau })); }} />;
  }
  if (!exercice || !Renderer) {
    return (
      <View style={[styles.flex, styles.centerAll, { backgroundColor: brand.paper }]}>
        <Text variant="h3" style={{ color: brand.ink }}>Rien à réviser pour l’instant</Text>
        <PrepButton title="Retour" variant="link" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const complete = core.isComplete(exercice, item.value);
  const corrected = item.phase === 'corrected';

  // Exercice d'un module téléchargé : la correction vient du serveur. Hors connexion, la réponse
  // est gardée en file et marquée « en attente » : aucun score n'est inventé sur l'appareil.
  const resolveAttempt = async (r) => {
    if (!r?.pending) return r;
    const server = await store.awaitResult(r.cle);
    if (!server) return { pending: true, correct: false, score: 0, points: 0 };
    if (server.ok === false) return server.erreur === 'ESSAI_EPUISE' ? { locked: true } : { pending: true, correct: false, score: 0, points: 0 };
    return { ...server, cle: server.correction?.cle, explication: server.correction?.explication };
  };

  const verify = async () => {
    countMinutes();
    if (mode === 'test') {
      const r = await resolveAttempt(store.attempt({ programme: session.programme, exercice: code, module: found.module.code, reponse: item.value, essai: 1, indices: 0, contexte: 'test', session: session.id }));
      if (r?.locked) { setSheet('locked'); return; }
      const nextItems = { ...session.items, [code]: { ...item, result: r, final: true, phase: 'corrected', points: r.points } };
      haptic.select();
      if (session.index + 1 >= session.codes.length) finish({ ...session, items: nextItems });
      else setSession({ ...session, items: nextItems, index: session.index + 1 });
      return;
    }
    const r = await resolveAttempt(store.attempt({ programme: session.programme, exercice: code, module: found.module.code, reponse: item.value, essai: item.essai, indices: item.indices, contexte: mode, session: session.id, duree: Math.round((Date.now() - item.debut) / 1000) }));
    if (r?.locked) { setSheet('locked'); return; }
    if (r.pending) {
      haptic.select();
      update({ result: r, phase: 'corrected', final: true, points: 0 });
      setHint(false);
      return;
    }
    const final = r.correct || item.essai === 2;
    if (r.correct) haptic.success(); else haptic.error();
    update({ result: { ...r, cle: r.cle ?? exercice.cle }, phase: 'corrected', final, points: final ? r.points : 0, premierCoup: item.essai === 1 ? r.correct : item.premierCoup });
    setHint(false);
  };

  const retry = () => {
    setSheet(null);
    update({ essai: 2, value: null, phase: 'answer', result: null });
  };
  const skipSecond = async () => {
    setSheet(null);
    // Passer la seconde chance : la question est comptée fausse et entre au cahier d'erreurs (§ 12.1).
    const r = await resolveAttempt(store.attempt({ programme: session.programme, exercice: code, module: found.module.code, reponse: item.value || {}, essai: 2, indices: item.indices, contexte: mode, session: session.id }));
    update({ essai: 2, result: { ...(r || { correct: false }), cle: r?.cle ?? exercice.cle, correct: false }, phase: 'corrected', final: true, points: 0 });
  };
  const next = () => {
    setHint(false);
    if (session.index + 1 >= session.codes.length) finish(session);
    else setSession((s) => ({ ...s, index: s.index + 1 }));
  };
  const useHint = () => {
    if (!exercice.indice) return;
    haptic.select();
    if (!item.indices) update({ indices: 1 });
    setHint((h) => !h);
  };

  const notionLabel = found.module.notions.find((n) => n.code === exercice.notions?.[0])?.libelle;
  const iaLabel = rights.abonne ? null : (rights.iaRestantes > 0 ? `${rights.iaRestantes} vérification${rights.iaRestantes > 1 ? 's' : ''} offerte${rights.iaRestantes > 1 ? 's' : ''}` : 'Abonnés');
  const answeredCount = session.codes.filter((c) => session.items[c]?.value && core.isComplete(getExercise(c).exercice, session.items[c].value)).length;

  const header = (
    <View style={styles.stackHeader}>
      <Pressable onPress={askQuit} hitSlop={6} accessibilityLabel="Quitter la session" style={styles.roundOnInk}><X size={20} color={brand.onInk} /></Pressable>
      {mode === 'blanc' ? <Timer finA={session.finA} onEnd={() => finish(session)} /> : (
        <Text variant="bodyMedium" style={styles.headerText}>{`Question ${session.index + 1} sur ${session.codes.length}`}</Text>
      )}
      {mode === 'blanc' ? (
        <Pressable onPress={() => setSheet('grid')} hitSlop={6} accessibilityLabel="Grille des questions" style={styles.roundOnInk}><LayoutGrid size={19} color={brand.onInk} /></Pressable>
      ) : mode !== 'test' && exercice.indice ? (
        <Pressable onPress={useHint} disabled={corrected} hitSlop={6} accessibilityLabel="Indice, coûte 20 % des points" style={[styles.roundOnInk, item.indices ? styles.hintOn : null]}>
          <Lightbulb size={19} color={item.indices ? brand.goldLight : brand.onInk} />
          {item.indices ? <View style={styles.hintBadge}><Text variant="overline" style={styles.hintBadgeText}>−20 %</Text></View> : null}
        </Pressable>
      ) : (
        <Pressable onPress={() => setSheet('report')} hitSlop={6} accessibilityLabel="Signaler un problème" style={styles.roundOnInk}><MoreHorizontal size={19} color={brand.onInk} /></Pressable>
      )}
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.progressWrap}>
        {mode === 'blanc' ? <Text variant="caption" style={styles.muted}>{`Question ${session.index + 1} sur ${session.codes.length}`}</Text> : null}
        <Segments session={session} />
      </View>

      {/* ── Consigne + zone d'interaction ── */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={fontScale >= 1.3 || !GESTURE_HEAVY.has(exercice.type) || corrected}
      >
        <Animated.View key={`${code}-${item.essai}`} entering={reduce ? FadeIn.duration(150) : FadeInRight.duration(260)} exiting={reduce ? undefined : FadeOutLeft.duration(200)}>
          <View style={styles.meta}>
            <View style={styles.levelPill}>
              <LevelDots niveau={exercice.niveau} size={6} />
              <Text variant="caption" style={styles.levelPillText}>{`Niveau ${exercice.niveau} · ${LEVELS[exercice.niveau]?.label || ''}`}</Text>
            </View>
            <Text variant="caption" style={[styles.mutedLight, { flexShrink: 1 }]} numberOfLines={1}>{core.TYPES[exercice.type]}</Text>
            {item.essai === 2 && !corrected ? <Badge label="Seconde chance" tone="warning" /> : null}
            {mode !== 'test' && mode !== 'blanc' ? (
              <Pressable onPress={() => setSheet('report')} hitSlop={8} accessibilityLabel="Signaler" style={styles.flag}><Flag size={15} color={brand.inkMuted} /></Pressable>
            ) : null}
          </View>
          <Text variant="h3" style={styles.consigne}>{exercice.consigne}</Text>
          {hint && exercice.indice ? (
            <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} style={styles.hintBubble}>
              <Lightbulb size={16} color={brand.goldInk} />
              <Text variant="body" style={{ color: brand.ink, flex: 1 }}>{exercice.indice}</Text>
            </Animated.View>
          ) : null}
          {/* Après une 1re erreur, rien n'est révélé (§ 12.1) : la réponse est figée jusqu'au rappel. */}
          <View style={styles.zone} pointerEvents={corrected && (!item.final || item.result?.pending) ? 'none' : 'auto'}>
            <Renderer
              exercice={exercice}
              value={item.value}
              onChange={(v) => update({ value: v })}
              phase={mode === 'blanc' || (corrected && !item.final) || item.result?.pending ? 'answer' : item.phase}
              correction={mode === 'blanc' || !item.final || item.result?.pending ? null : item.result}
              seed={itemSeed}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* ── Zone d'action ── */}
      <ScrollView style={{ flexGrow: 0, maxHeight: fontScale >= 1.3 ? '42%' : '55%' }} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
        <LinearGradient colors={[theme.brand.paperTransparent, brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {corrected && mode !== 'test' && mode !== 'blanc' ? (
          <CorrectionBanner
            item={item}
            exercice={exercice}
            mode={mode}
            iaLabel={iaLabel}
            onShowRecall={() => setSheet('mini')}
            onReason={() => setSheet('reason')}
            onNext={next}
          />
        ) : mode === 'blanc' ? (
          <View style={[styles.blancNav, fontScale >= 1.3 && { flexDirection: 'column', alignItems: 'stretch' }] }>
            <PrepButton title="Précédente" variant="secondary" iconLeft={ChevronLeft} disabled={session.index === 0} onPress={() => setSession((s) => ({ ...s, index: s.index - 1 }))} style={styles.half} compact />
            <Pressable onPress={() => update({ aRevoir: !item.aRevoir })} accessibilityRole="button" accessibilityState={{ selected: Boolean(item.aRevoir) }} accessibilityLabel={item.aRevoir ? "Retirer le repère à revoir" : "Marquer à revoir"} style={[styles.flagBtn, item.aRevoir && styles.flagOn]}><Flag size={18} color={item.aRevoir ? brand.onInk : colors.warning} /></Pressable>
            {session.index + 1 < session.codes.length
              ? <PrepButton title="Suivante" icon={ChevronRight} onPress={() => setSession((s) => ({ ...s, index: s.index + 1 }))} style={styles.half} compact />
              : <PrepButton title="Remettre" onPress={() => setSheet('submit')} style={styles.half} compact />}
          </View>
        ) : (
          <PrepButton title={!complete ? answerPrompt(exercice.type) : mode === 'test' ? 'Valider' : 'Vérifier'} disabled={!complete} onPress={verify} />
        )}
      </ScrollView>

      <MiniCoursSheet
        visible={sheet === 'mini'}
        miniCours={exercice.miniCours}
        notion={notionLabel}
        onRetry={retry}
        onSkip={skipSecond}
        onOpenLesson={found.module.lecons[0] ? () => { setSheet(null); navigation.navigate('PrepLesson', { programme: session.programme, lecon: found.module.lecons[0].code, retour: true }); } : null}
      />
      <ReasoningSheet
        visible={sheet === 'reason'}
        exercice={exercice}
        programme={session.programme}
        onClose={() => setSheet(null)}
        onDone={() => setTimeout(next, 250)}
        onSubscribe={() => { setSheet(null); subscription.go(); }}
      />
      <LockedSheet visible={sheet === 'locked'} onClose={() => setSheet(null)} onSubscribe={() => { setSheet(null); subscription.go(); }} />
      <Dialog
        visible={sheet === 'quit'}
        title="Quitter la session ?"
        message={mode === 'blanc' ? 'Le temps continue de s’écouler. Tu pourras reprendre ta copie.' : `Ta progression est enregistrée. Tu reprendras à la question ${session.index + 1}.`}
        cancelLabel="Continuer la session"
        confirmLabel="Quitter"
        onCancel={() => setSheet(null)}
        onConfirm={() => { setSheet(null); countMinutes(); navigation.goBack(); }}
      />
      <Dialog
        visible={sheet === 'submit'}
        title="Remettre ta copie ?"
        message={`${answeredCount} question${answeredCount > 1 ? 's' : ''} répondue${answeredCount > 1 ? 's' : ''} sur ${session.codes.length}. Aucune modification ne sera possible ensuite.`}
        cancelLabel="Relire ma copie"
        confirmLabel="Remettre ma copie"
        onCancel={() => setSheet(null)}
        onConfirm={() => { setSheet(null); finish(session); }}
      />
      <BottomSheet visible={sheet === 'grid'} onClose={() => setSheet(null)} maxHeight={0.7} footer={<PrepButton title="Remettre ma copie" onPress={() => setSheet('submit')} />}>
        <Text variant="h2" style={{ color: brand.ink, marginBottom: 8 }}>Ta copie</Text>
        <Text variant="body" style={[styles.muted, { marginBottom: 18 }]}>{`${answeredCount} réponses sur ${session.codes.length}. Bordeaux : répondue. Contour ocre : à revoir.`}</Text>
        <View style={styles.grid}>
          {session.codes.map((c, i) => {
            const it = session.items[c];
            const done = it?.value && core.isComplete(getExercise(c).exercice, it.value);
            return (
              <Pressable key={c} onPress={() => { setSession((s) => ({ ...s, index: i })); setSheet(null); }} accessibilityRole="button" accessibilityState={{ selected: i === session.index }} accessibilityLabel={`Question ${i + 1}${done ? ', répondue' : ''}${it?.aRevoir ? ', à revoir' : ''}`} style={[styles.gridCell, done && styles.gridDone, it?.aRevoir && styles.gridFlag]}>
                <Text variant="bodyMedium" style={[type.tabular, { color: done ? brand.onInk : brand.ink }]}>{i + 1}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
      <BottomSheet visible={sheet === 'report'} onClose={() => setSheet(null)} maxHeight={0.5}>
        <Text variant="h3" style={{ color: brand.ink, marginBottom: 12 }}>Signaler un problème</Text>
        {[['enonce', 'Erreur dans l’énoncé'], ['reponse', 'Réponse contestable'], ['autre', 'Autre']].map(([motif, label]) => (
          <PrepButton key={motif} title={label} variant="secondary" style={{ marginBottom: 8 }} onPress={async () => { await prepApi.report({ element: code, motif }); haptic.success(); setSheet(null); }} />
        ))}
      </BottomSheet>
    </PaperStack>
  );
};

/** Lanceurs, pour garder la construction des sessions dans ce module. */
export const sessionParams = {
  niveau: (programme, module, niveau) => ({ mode: 'niveau', programme, module, niveau }),
  revision: (programme, codes) => ({ mode: 'revision', programme, codes }),
  blanc: (programme) => {
    const p = getProgramme(programme);
    return { mode: 'blanc', programme, nombre: p?.concoursBlanc?.nbQuestions || 20, dureeMinutes: p?.concoursBlanc?.dureeMinutes || 30 };
  },
  test: (programme) => ({ mode: 'test', programme, nombre: 18 }),
};

export default SessionScreen;

const useStyles = createThemedStyles(({ brand, theme, colors, subjectPalette }) => {
  const styles = StyleSheet.create({
    flex: { flex: 1 },
    centerAll: { alignItems: 'center', justifyContent: 'center', gap: 8 },
    muted: { color: brand.inkSoft },
    mutedLight: { color: brand.inkMuted },
    stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50, gap: 12 },
    roundOnInk: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
    hintOn: { backgroundColor: 'rgba(228,201,151,0.2)', borderColor: 'rgba(228,201,151,0.5)' },
    headerText: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold, flexShrink: 1, textAlign: 'center' },
    progressWrap: { paddingHorizontal: 20, paddingTop: 18, gap: 6 },
    segments: { flexDirection: 'row', gap: 3 },
    segment: { flex: 1, height: 5, borderRadius: 3 },
    segmentSecond: { backgroundColor: colors.warningSolid, opacity: 0.6 },
    hintBadge: { position: 'absolute', bottom: -8, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, backgroundColor: brand.goldLight },
    hintBadgeText: { color: brand.ink, fontSize: 8 },
    timer: { alignItems: 'center', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16, minWidth: 104 },
    timerText: { color: brand.onInk },
    content: { padding: 20, paddingTop: 18, paddingBottom: 40 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 30, paddingVertical: 6, paddingHorizontal: 12, flexShrink: 1, borderRadius: 15, backgroundColor: subjectPalette.inkWash },
    levelPillText: { color: brand.ink, fontFamily: theme.fontFamily.semiBold, flexShrink: 1 },
    flag: { marginLeft: 'auto', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    consigne: { color: brand.ink, marginTop: 16, fontFamily: theme.fontFamily.semiBold, fontSize: 19, lineHeight: 27, letterSpacing: -0.2 },
    hintBubble: { flexDirection: 'row', gap: 10, marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: brand.goldWash, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.35)' },
    zone: { marginTop: 22 },
    actions: { paddingHorizontal: 20, paddingTop: 12 },
    banner: { marginBottom: 4, gap: 8 },
    bannerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bannerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    bannerBody: { color: brand.ink },
    bannerActions: { alignItems: 'stretch', flexDirection: 'row', gap: 10 },
    half: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' },
    notebook: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    blancNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    flagBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.warning },
    flagOn: { backgroundColor: colors.warningSolid },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridCell: { minWidth: 48, minHeight: 48, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
    gridDone: { backgroundColor: brand.burgundySolid, borderColor: brand.burgundy },
    gridFlag: { borderWidth: 2.5, borderColor: colors.warning },
    reviewRoot: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.inkDeep },
    reviewContent: { flexGrow: 1, paddingHorizontal: 20, alignItems: 'center' },
    reviewClose: { alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
    reviewHero: { alignItems: 'center', alignSelf: 'stretch', marginTop: 4 },
    reviewMedal: { width: 168, height: 168 },
    ringPctNight: { color: brand.onInk, fontSize: 28, lineHeight: 34 },
    reviewLabel: { color: brand.onInkSoft, marginTop: 10, textAlign: 'center' },
    reviewTitle: { color: brand.onInk, marginTop: 4, textAlign: 'center' },
    scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
    reviewScore: { color: brand.onInk, fontSize: 60, lineHeight: 68 },
    reviewScoreSur: { color: brand.onInkMuted, fontSize: 28, lineHeight: 34 },
    reviewPct: { color: brand.goldLight, fontFamily: theme.fontFamily.semiBold, fontSize: 17, marginTop: 2 },
    reviewCard: { alignSelf: 'stretch', marginTop: 24, paddingVertical: 8, paddingLeft: 28, paddingRight: 16, borderRadius: 22, backgroundColor: brand.paper },
    reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12 },
    reviewRowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: brand.line },
    reviewRowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    reviewRowNum: { color: brand.ink, fontSize: 22, lineHeight: 28, minWidth: 30 },
    reviewRowText: { color: brand.inkSoft, flex: 1 },
    onInk: { color: brand.onInk },
    onSoft: { color: brand.onInkSoft, textAlign: 'center' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 26, alignSelf: 'stretch' },
    statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 2 },
    rankLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
    celebration: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingVertical: 12 },
    tertiaryAction: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 4, backgroundColor: brand.paper, borderColor: brand.line },
    tertiaryText: { color: brand.inkSoft, fontSize: 14 },
    reviewSpacer: { flex: 1, minHeight: 28 },
    reviewPanel: { alignSelf: 'stretch', marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 20, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    placeCard: { padding: 16, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, gap: 10, ...theme.shadows.soft },
    placeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    placeBar: { height: 6, borderRadius: 3, backgroundColor: brand.line, overflow: 'hidden' },
    placeFill: { height: 6, borderRadius: 3, backgroundColor: brand.burgundySolid },
  });
  return { styles };
});
