import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { ArrowLeft, Check, ChevronRight, Flame, NotebookPen, Target, Timer, Trophy } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { getProgramme, programmeModules } from '../content';
import usePrep, { todayKey, useSummary } from '../store';
import prepApi, { isServiceMissing } from '../api';
import { brand, colors, motion, PODIUM, subjectTint, theme, type } from '../theme';
import { haptic } from '../feedback';
import { AnimatedNumber, Avatar, Card, Enter, NightBackground, PaperStack, PrepButton, PressScale, ProgressBar, ProgressRing, SectionTitle, Segmented, StatTile, SubjectIcon } from '../ui/primitives';
import { CloudOffArt } from '../ui/Illustrations';
import ART from '../ui/art';
import { sessionParams } from './SessionScreen';

const pct = (v) => `${Math.round((v || 0) * 100)} %`;
const nf = (n) => Number(n || 0).toLocaleString('fr-FR');

// ── Histogramme d'activité 28 jours (une série : pas de légende) ──────────
const ActivityChart = ({ etat, today }) => {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(null);
  const days = Array.from({ length: 28 }, (_, i) => core.addDays(today, i - 27));
  const vals = days.map((d) => etat.minutesParJour?.[d] || 0);
  const max = Math.max(etat.objectifQuotidien || 10, ...vals);
  const h = 96;
  const gap = 2;
  const bw = w ? (w - gap * 27) / 28 : 0;
  const total = vals.reduce((a, b) => a + b, 0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={h + 10} accessibilityLabel={`Activité des 28 derniers jours : ${Math.round(total)} minutes`}>
          <Line x1={0} y1={h} x2={w} y2={h} stroke={brand.line} strokeWidth={1} />
          {vals.map((v, i) => {
            const bh = v ? Math.max(4, (v / max) * (h - 12)) : 0;
            const x = i * (bw + gap);
            const goal = v >= (etat.objectifQuotidien || 10);
            return (
              <React.Fragment key={days[i]}>
                {bh ? <Path d={`M${x} ${h} V${h - bh + 3} Q${x} ${h - bh} ${x + 3} ${h - bh} H${x + bw - 3} Q${x + bw} ${h - bh} ${x + bw} ${h - bh + 3} V${h} Z`} fill={sel === i ? brand.inkGlow : brand.ink} /> : null}
                {goal ? <Circle cx={x + bw / 2} cy={h - bh - 7} r={4} fill={brand.gold} stroke="#FFF" strokeWidth={2} /> : null}
                <Rect x={x - 1} y={0} width={bw + 2} height={h} fill="transparent" onPress={() => { haptic.select(); setSel(i === sel ? null : i); }} />
              </React.Fragment>
            );
          })}
        </Svg>
      ) : <View style={{ height: h + 10 }} />}
      <Text variant="caption" style={styles.muted}>
        {sel != null
          ? `${new Date(`${days[sel]}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · ${Math.round(vals[sel])} min`
          : `${Math.floor(total / 60)} h ${String(Math.round(total % 60)).padStart(2, '0')} sur 28 jours · point or = objectif atteint`}
      </Text>
    </View>
  );
};

// ── Courbe des notes aux concours blancs ──────────────────────────────────
const MockChart = ({ blancs }) => {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState(null);
  const pts = blancs.map((b) => (b.sur ? (20 * b.note) / b.sur : 0));
  const h = 110;
  const pad = 10;
  const xy = (v, i) => [pad + (pts.length > 1 ? (i * (w - 2 * pad)) / (pts.length - 1) : (w - 2 * pad) / 2), pad + (1 - v / 20) * (h - 2 * pad)];
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${xy(v, i).join(' ')}`).join(' ');
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={h} accessibilityLabel={`Notes aux concours blancs : ${pts.map((p) => p.toFixed(1)).join(', ')} sur 20`}>
          {[0, 10, 20].map((g) => <Line key={g} x1={0} x2={w} y1={pad + (1 - g / 20) * (h - 2 * pad)} y2={pad + (1 - g / 20) * (h - 2 * pad)} stroke={brand.line} strokeDasharray={g === 10 ? '3 4' : undefined} />)}
          <Path d={d} stroke={brand.ink} strokeWidth={2} fill="none" strokeLinejoin="round" />
          {pts.map((v, i) => {
            const [x, y] = xy(v, i);
            return <Circle key={i} cx={x} cy={y} r={sel === i ? 6 : 5} fill={brand.gold} stroke="#FFF" strokeWidth={2} onPress={() => { haptic.select(); setSel(i); }} />;
          })}
        </Svg>
      ) : null}
      <Text variant="caption" style={styles.muted}>
        {sel != null ? `Concours blanc ${sel + 1} · ${pts[sel].toFixed(1).replace('.', ',')} / 20` : `Meilleure note : ${Math.max(...pts).toFixed(1).replace('.', ',')} / 20`}
      </Text>
    </View>
  );
};

// ═══ E33 — Onglet Progrès ═══════════════════════════════════════════════
export const ProgressScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const programmeCode = usePrep((s) => s.programme);
  const summary = useSummary(programmeCode);
  const [rank, setRank] = useState(null);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState('progression');
  useFocusEffect(useCallback(() => {
    if (!programmeCode) return;
    prepApi.ranking(programmeCode, 'tout').then((r) => { setRank(r); setOffline(false); }).catch((err) => setOffline(isServiceMissing(err) ? 'indisponible' : 'reseau'));
  }, [programmeCode]));

  if (!summary) {
    return (
      <View style={[styles.paper, styles.centerAll, { paddingTop: insets.top }]}>
        <Text variant="h3" style={styles.ink}>Choisis un concours pour suivre ta progression</Text>
        <PrepButton title="Choisir mon concours" onPress={() => navigation.navigate('PrepContestPicker')} style={{ marginTop: 16 }} />
      </View>
    );
  }
  const { programme, etat, stats } = summary;
  const today = todayKey();
  const modules = programmeModules(programme);
  const notions = new Set(); let notionsTotal = 0;
  modules.filter((m) => m.publie).forEach((m) => {
    notionsTotal += m.module.notions.length;
    if (core.moduleStatus(m.module, etat).valide) m.module.notions.forEach((n) => notions.add(`${m.code}/${n.code}`));
  });
  const premierParNiveau = [1, 2, 3].map((n) => { const p = etat.premierCoup?.[n] || [0, 0]; return p[1] ? p[0] / p[1] : null; });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <NightBackground />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text variant="caption" style={styles.headKicker} numberOfLines={1}>{`${programme.organisme.sigle} · ${programme.titre}`}</Text>
          <Text variant="title" style={styles.onInk} accessibilityRole="header">Mon bilan</Text>
          <PressScale onPress={() => navigation.navigate('PrepRanking', { programme: programmeCode })} style={styles.rankCard} accessibilityLabel={rank?.rang ? `Rang ${rank.rang} sur ${rank.total}. Voir le classement` : 'Voir le classement'}>
            <View style={styles.rankLaurel}>
              <Image source={ART.laurels[0]} style={styles.rankLaurelImg} resizeMode="contain" accessible={false} />
              <Trophy size={18} color={brand.goldLight} />
            </View>
            <View style={{ flex: 1 }}>
              {rank?.rang ? (
                <>
                  <View style={styles.rankRow}>
                    <AnimatedNumber value={rank.rang} suffix="ᵉ" style={[type.numeral, styles.rankNum]} />
                    <Text variant="body" style={styles.onSoft}>{`sur ${rank.total} candidat${rank.total > 1 ? 's' : ''}`}</Text>
                  </View>
                  {rank.variation ? <Text variant="caption" style={{ color: rank.variation > 0 ? '#8FD9B4' : '#F3ADA4', fontFamily: theme.fontFamily.semiBold }}>{`${rank.variation > 0 ? '▲' : '▼'} ${Math.abs(rank.variation)} cette semaine`}</Text> : null}
                </>
              ) : (
                <Text variant="bodyMedium" style={styles.onInk}>{offline === 'indisponible' ? 'Classement bientôt disponible pour ce cycle' : offline ? 'Classement disponible avec une connexion' : 'Classement en cours de calcul'}</Text>
              )}
            </View>
            <View style={styles.rankGo}><ChevronRight size={18} color={brand.ink} /></View>
          </PressScale>
        </View>

        <View style={styles.sheetWrap}>
          <View style={styles.ghost} pointerEvents="none" />
          <View style={styles.sheet}>
            <Segmented items={[{ key: 'progression', label: 'Progression' }, { key: 'matieres', label: 'Matières' }, { key: 'activite', label: 'Activité' }]} value={tab} onChange={setTab} />

            {tab === 'progression' ? (
              <View style={styles.tabBody}>
                <Enter index={0}>
                  <View style={styles.globalCard}>
                    <ProgressRing size={84} stroke={7} value={summary.pourcentage} track={brand.line}>
                      <AnimatedNumber value={Math.round(summary.pourcentage * 100)} suffix=" %" style={[type.numeral, styles.globalPct]} />
                    </ProgressRing>
                    <View style={{ flex: 1 }}>
                      <Text variant="h2" style={styles.ink}>Progression globale</Text>
                      <Text variant="caption" style={[styles.muted, { marginTop: 2 }]}>{`${summary.modulesValides} module${summary.modulesValides > 1 ? 's' : ''} validé${summary.modulesValides > 1 ? 's' : ''} sur ${summary.modulesTotal}`}</Text>
                    </View>
                  </View>
                </Enter>
                <View style={styles.statGrid}>
                  <StatTile icon={NotebookPen} value={nf(stats.questions)} label="questions" style={styles.statHalf} />
                  <StatTile icon={Check} value={summary.modulesValides} label={`module${summary.modulesValides > 1 ? 's' : ''} validé${summary.modulesValides > 1 ? 's' : ''}`} tint={colors.success} wash={colors.successWash} style={styles.statHalf} />
                  <StatTile icon={Target} value={pct(stats.reussite)} label="de réussite du 1ᵉʳ coup" tint={brand.inkGlow} wash="#E9EEF5" style={styles.statHalf} />
                  <StatTile icon={Flame} value={summary.serie} label="jours de série" tint={brand.goldInk} wash={brand.goldWash} style={styles.statHalf} />
                </View>
                <SectionTitle style={styles.sectionGap}>Résultats</SectionTitle>
                <Card style={{ paddingHorizontal: 4 }}>
                  {[[stats.questions, 'Questions répondues'], [etat.compteurs.secondesChancesReussies, 'Secondes chances réussies'], [stats.erreurs, 'Erreurs effectuées'], [stats.erreursCorrigees, 'Erreurs corrigées'], [stats.raisonnementsValides, 'Raisonnements validés par l’IA']].map(([v, l], i, arr) => (
                    <View key={l} style={[styles.resultRow, i < arr.length - 1 && styles.hair]}>
                      <Text variant="body" style={styles.ink}>{l}</Text>
                      <Text style={[type.numeral, styles.resultNum]}>{nf(v)}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {tab === 'matieres' ? (
              <View style={styles.tabBody}>
                {programme.matieres.map((m, i) => {
                  const val = m.modules.filter((x) => x.publie && (etat.modulesValides || []).includes(x.code)).length;
                  const ratio = m.modules.length ? val / m.modules.length : 0;
                  const t = subjectTint(m.teinte);
                  return (
                    <Enter key={m.nom} index={i}>
                      <View style={styles.subjectRow}>
                        <SubjectIcon nom={m.nom} teinte={m.teinte} size={44} soft />
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.between}>
                            <Text variant="bodyMedium" style={styles.inkStrong} numberOfLines={1}>{m.nom}</Text>
                            <Text style={[type.numeral, styles.subjectPct]}>{pct(ratio)}</Text>
                          </View>
                          <ProgressBar value={ratio} color={t.tint} height={5} delay={i * 60} />
                          <Text variant="caption" style={styles.muted}>{`${val} / ${m.modules.length} modules validés`}</Text>
                        </View>
                      </View>
                    </Enter>
                  );
                })}
                <View style={styles.noteCard}>
                  <Text variant="bodyMedium" style={styles.inkStrong}>{`Notions maîtrisées : ${notions.size} sur ${notionsTotal}`}</Text>
                  <Text variant="caption" style={styles.muted}>{`Réussite du 1ᵉʳ coup · ${premierParNiveau.map((p, i) => `Niveau ${i + 1} : ${p == null ? '—' : pct(p)}`).join(' · ')}`}</Text>
                </View>
              </View>
            ) : null}

            {tab === 'activite' ? (
              <View style={styles.tabBody}>
                <Card style={styles.chartCard}>
                  <Text variant="h3" style={[styles.ink, { marginBottom: 12 }]}>28 derniers jours</Text>
                  <ActivityChart etat={etat} today={today} />
                  <Text variant="caption" style={[styles.muted, { marginTop: 10 }]}>{`Série actuelle : ${summary.serie} · record : ${etat.serie?.record || 0} jours`}</Text>
                </Card>
                <SectionTitle style={styles.sectionGap}>Concours blancs</SectionTitle>
                {etat.blancs?.length ? <Card style={styles.chartCard}><MockChart blancs={etat.blancs} /></Card> : (
                  <PressScale onPress={() => navigation.navigate('PrepMockIntro', { programme: programmeCode })} style={styles.linkRow}>
                    <View style={[styles.linkIcon, { backgroundColor: brand.ink }]}><Timer size={18} color={brand.goldLight} /></View>
                    <Text variant="bodyMedium" style={[styles.inkStrong, { flex: 1 }]}>Fais ton premier concours blanc</Text>
                    <ChevronRight size={18} color={brand.burgundy} />
                  </PressScale>
                )}
              </View>
            ) : null}

            <SectionTitle style={styles.sectionGap}>Raccourcis</SectionTitle>
            <View style={{ gap: 10 }}>
              <PressScale onPress={() => navigation.navigate('PrepReviews', { programme: programmeCode, onglet: 'cahier' })} style={styles.linkRow}>
                <View style={[styles.linkIcon, { backgroundColor: brand.burgundyWash }]}><NotebookPen size={18} color={brand.burgundy} /></View>
                <Text variant="bodyMedium" style={[styles.inkStrong, { flex: 1 }]}>{`Cahier d’erreurs (${Object.keys(etat.erreurs || {}).length})`}</Text><ChevronRight size={18} color={brand.burgundy} />
              </PressScale>
              <PressScale onPress={() => navigation.navigate('PrepSession', sessionParams.test(programmeCode))} style={styles.linkRow}>
                <View style={[styles.linkIcon, { backgroundColor: '#E9EEF5' }]}><Target size={18} color={brand.inkGlow} /></View>
                <Text variant="bodyMedium" style={[styles.inkStrong, { flex: 1 }]}>Test de positionnement</Text><ChevronRight size={18} color={brand.burgundy} />
              </PressScale>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ═══ E34 — Candidats du cycle ═══════════════════════════════════════════
const PERIODES = [['semaine', 'Semaine'], ['mois', 'Mois'], ['tout', 'Depuis le début']];

const PLACE_LABEL = ['1er', '2e', '3e'];
const PodiumColumn = ({ c, place, height, delay, onPress }) => {
  const y = useSharedValue(60);
  useEffect(() => { const t = setTimeout(() => { y.value = withSpring(0, motion.snap); }, delay); return () => clearTimeout(t); }, [delay, y]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: 1 - y.value / 60 }));
  const color = PODIUM[place - 1];
  const big = place === 1;
  return (
    <Animated.View style={[styles.podiumCol, s]}>
      <Pressable onPress={onPress} style={{ alignItems: 'center' }} accessibilityLabel={`${place}ᵉ, ${c.pseudonyme}, score ${Math.round(c.score)}`}>
        <View style={[styles.laurelWrap, big && styles.laurelWrapBig]}>
          <Image source={ART.laurels[place - 1]} style={StyleSheet.absoluteFill} resizeMode="contain" accessible={false} />
          <Avatar name={c.pseudonyme} tint={c.avatarTeinte} size={big ? 52 : 44} />
        </View>
        <Text variant="caption" style={[styles.inkStrong, { marginTop: 2 }]} numberOfLines={1}>{c.moi ? 'Toi' : c.pseudonyme}</Text>
        <Text style={[type.numeral, styles.podiumScore]}>{Math.round(c.score)}</Text>
      </Pressable>
      <View style={[styles.podiumSheet, { height }]}>
        <LinearGradient colors={[`${color}33`, 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
        <Text style={[type.numeral, styles.podiumPlace, { color }]}>{PLACE_LABEL[place - 1]}</Text>
      </View>
    </Animated.View>
  );
};

const CandidateRow = ({ c, rang, onPress }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.candRow, c.moi && styles.candMe, pressed && { backgroundColor: brand.paperDim }]} accessibilityLabel={`${rang}ᵉ, ${c.moi ? 'toi' : c.pseudonyme}, score ${Math.round(c.score)}, ${nf(c.stats.questions)} questions, ${c.stats.modulesValides} modules validés, ${nf(c.stats.erreurs)} erreurs, ${pct(c.stats.reussite)} de réussite`}>
    <Text style={[type.numeral, styles.candRank]}>{rang}</Text>
    <Avatar name={c.pseudonyme} tint={c.avatarTeinte} size={40} />
    <View style={{ flex: 1 }}>
      <Text variant="bodyMedium" style={styles.ink} numberOfLines={1}>{c.moi ? `Toi · ${c.pseudonyme}` : c.pseudonyme}</Text>
      <Text variant="caption" style={styles.muted} numberOfLines={1}>{`${nf(c.stats.questions)} questions · ${c.stats.modulesValides} modules · ${nf(c.stats.erreurs)} erreurs · ${pct(c.stats.reussite)}`}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[type.numeral, styles.candScore]}>{Math.round(c.score)}</Text>
      {c.stats.serie ? <View style={styles.row}><Flame size={12} color={brand.goldInk} /><Text variant="caption" style={styles.muted}>{c.stats.serie}</Text></View> : null}
    </View>
  </Pressable>
);

export const RankingScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const programmeCode = route.params.programme;
  const programme = getProgramme(programmeCode);
  const [periode, setPeriode] = useState('tout');
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [meVisible, setMeVisible] = useState(true);
  const list = useRef(null);

  const load = useCallback(() => {
    setError(false);
    prepApi.ranking(programmeCode, periode).then(setData).catch((err) => setError(isServiceMissing(err) ? 'indisponible' : 'reseau'));
  }, [programmeCode, periode]);
  useEffect(load, [load]);

  const candidats = data?.candidats || [];
  const podium = candidats.slice(0, 3);
  const rest = candidats.length >= 3 ? candidats.slice(3) : candidats;
  const me = candidats.find((c) => c.moi);
  const meIndex = rest.findIndex((c) => c.moi);
  const open = (c) => { haptic.select(); if (!c.moi) navigation.navigate('PrepCandidate', { programme: programmeCode, identite: c.identite, rang: c.rangApprox }); };

  const onViewable = useRef(({ viewableItems }) => { setMeVisible(viewableItems.some((v) => v.item.moi)); }).current;

  return (
    <PaperStack header={(
      <View style={styles.stackHeader}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" hitSlop={6} style={styles.roundDark}><ArrowLeft size={20} color="#FFF" /></Pressable>
        <View style={{ width: 44 }} />
      </View>
    )}>
      <View style={{ paddingTop: 24, paddingHorizontal: 20 }}>
        <Text variant="title" style={styles.ink} accessibilityRole="header">Classement</Text>
        <Text variant="caption" style={[styles.muted, { marginTop: 4 }]}>{`${programme.organisme.sigle} · ${programme.titre}${data ? ` · ${data.total} candidat${data.total > 1 ? 's' : ''}` : ''}`}</Text>
        <Segmented items={PERIODES.map(([k, l]) => ({ key: k, label: l }))} value={periode} onChange={setPeriode} style={{ marginTop: 16, marginBottom: 8 }} />
      </View>
      {error ? (
        error === 'indisponible' ? (
        <View style={[styles.centerAll, { flex: 1 }]}>
          <Image source={ART.laurels[0]} style={{ width: 96, height: 96 }} resizeMode="contain" accessible={false} />
          <Text variant="h2" style={[styles.ink, { textAlign: 'center' }]}>Classement bientôt disponible</Text>
          <Text variant="body" style={[styles.muted, { textAlign: 'center' }]}>Le classement de ce cycle s’ouvrira prochainement. Ta progression est déjà comptée.</Text>
        </View>
      ) : (
        <View style={[styles.centerAll, { flex: 1 }]}><CloudOffArt /><Text variant="h3" style={styles.ink}>Connexion impossible</Text><PrepButton title="Réessayer" variant="secondary" onPress={load} /></View>
      )
      ) : !data ? (
        <View style={{ padding: 20, gap: 10 }}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={styles.skeleton} />)}</View>
      ) : (
        <FlatList
          ref={list}
          data={rest}
          keyExtractor={(c) => c.identite}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          ListHeaderComponent={candidats.length >= 3 ? (
            <View style={styles.podium}>
              <PodiumColumn c={podium[1]} place={2} height={62} delay={100} onPress={() => open(podium[1])} />
              <PodiumColumn c={podium[0]} place={1} height={88} delay={0} onPress={() => open(podium[0])} />
              <PodiumColumn c={podium[2]} place={3} height={46} delay={200} onPress={() => open(podium[2])} />
            </View>
          ) : <Text variant="body" style={[styles.muted, { textAlign: 'center', padding: 20 }]}>Sois parmi les premiers de ton cycle.</Text>}
          renderItem={({ item, index }) => <CandidateRow c={item} rang={item.rangApprox} onPress={() => open(item)} />}
          ListFooterComponent={data.moi && !data.moi.visible ? <Text variant="caption" style={[styles.muted, { padding: 20, textAlign: 'center' }]}>Tu n’apparais pas dans le classement des autres.</Text> : null}
        />
      )}
      {me && !meVisible && meIndex >= 0 ? (
        <Animated.View entering={FadeInUp} style={[styles.pinned, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <CandidateRow c={me} rang={data.rang} onPress={() => list.current?.scrollToIndex({ index: meIndex, viewPosition: 0.5 })} />
        </Animated.View>
      ) : null}
    </PaperStack>
  );
};

// ═══ E35 — Profil d'un candidat ═════════════════════════════════════════
export const CandidateScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { programme: programmeCode, identite } = route.params;
  const programme = getProgramme(programmeCode);
  const mine = useSummary(programmeCode);
  const [p, setP] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { prepApi.candidate(programmeCode, identite).then(setP).catch(() => setError(true)); }, [programmeCode, identite]);

  const compare = p ? [
    ['Questions répondues', mine.stats.questions, p.stats.questions],
    ['Modules validés', mine.modulesValides, p.stats.modulesValides],
    ['Réussite du 1ᵉʳ coup', Math.round(mine.stats.reussite * 100), Math.round((p.stats.reussite || 0) * 100), '%'],
    ['Série record', mine.etat.serie?.record || 0, p.stats.serieRecord || 0],
  ] : [];
  const biggestGap = compare.length ? compare.reduce((a, c) => ((c[2] - c[1]) / Math.max(1, c[2]) > (a[2] - a[1]) / Math.max(1, a[2]) ? c : a)) : null;

  return (
    <View style={styles.paper}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8, alignItems: 'center' }]}>
          <NightBackground />
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={[styles.roundDark, { alignSelf: 'flex-start' }]}><ArrowLeft size={22} color="#FFF" /></Pressable>
          {p ? (
            <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: 6 }}>
              <Avatar name={p.pseudonyme} tint={p.avatarTeinte} size={72} ring={PODIUM[p.rang - 1] || brand.goldLight} />
              <Text variant="h2" style={styles.onInk}>{p.pseudonyme}</Text>
              <Text variant="bodyMedium" style={{ color: brand.goldLight }}>{`${p.rang}ᵉ · ${programme.organisme.sigle} ${programme.titre}`}</Text>
            </Animated.View>
          ) : <Text variant="body" style={styles.onSoft}>{error ? 'Profil indisponible' : 'Chargement…'}</Text>}
        </View>
        {p ? (
          <View style={styles.section}>
            <View style={styles.grid}>
              {[[nf(p.stats.questions), 'questions'], [p.stats.modulesValides, 'modules validés'], [nf(p.stats.erreurs), 'erreurs effectuées'], [pct(p.stats.reussite), 'de réussite'], [p.stats.raisonnementsValides || 0, 'raisonnements validés'], [p.stats.meilleurBlanc != null ? `${String(p.stats.meilleurBlanc).replace('.', ',')}/20` : '—', 'meilleur concours blanc']].map(([v, l], i) => (
                <Enter key={l} index={i} style={styles.gridCell}><Card style={styles.statCard}><Text style={[type.numeral, styles.statNum]}>{v}</Text><Text variant="caption" style={styles.muted}>{l}</Text></Card></Enter>
              ))}
            </View>
            {p.matieresFortes?.length ? (
              <View style={{ gap: 8 }}>
                <Text variant="h3" style={styles.ink}>Matières fortes</Text>
                <View style={[styles.row, { flexWrap: 'wrap' }]}>{p.matieresFortes.map((m) => <View key={m} style={styles.strong}><Text variant="caption" style={styles.ink}>{m}</Text></View>)}</View>
              </View>
            ) : null}
            <SectionTitle>{`Toi / ${p.pseudonyme}`}</SectionTitle>
            {compare.map(([l, a, b, unit], i) => {
              const m = Math.max(a, b, 1);
              return (
                <View key={l} style={{ gap: 6 }}>
                  <View style={styles.between}><Text variant="caption" style={styles.ink}>{l}</Text><Text variant="caption" style={[styles.muted, type.tabular]}>{`${nf(a)}${unit || ''} · ${nf(b)}${unit || ''}`}</Text></View>
                  <ProgressBar value={a / m} color={brand.burgundy} delay={i * 60} />
                  <ProgressBar value={b / m} color={brand.gold} delay={i * 60} />
                </View>
              );
            })}
            <Text variant="caption" style={styles.muted}>Barre bordeaux : toi · barre or : {p.pseudonyme}</Text>
            {biggestGap && biggestGap[2] > biggestGap[1] ? (
              <View style={styles.advice}><Trophy size={18} color={brand.goldInk} /><Text variant="body" style={[styles.ink, { flex: 1 }]}>{`Ce qui fait la différence : ${biggestGap[0].toLowerCase()} (${nf(biggestGap[2])}${biggestGap[3] || ''}).`}</Text></View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: brand.paper },
  root: { flex: 1, backgroundColor: brand.inkDeep },
  inkStrong: { color: brand.ink, fontFamily: theme.fontFamily.semiBold },
  headKicker: { color: brand.goldLight, fontFamily: theme.fontFamily.semiBold, marginBottom: 4 },
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(228,201,151,0.3)' },
  rankLaurel: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rankLaurelImg: { position: 'absolute', width: 56, height: 56 },
  rankNum: { color: brand.goldLight, fontSize: 36, lineHeight: 42 },
  rankGo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.goldLight },
  sheetWrap: { flexGrow: 1, marginTop: 10 },
  ghost: { position: 'absolute', top: -10, left: 16, right: 16, height: 48, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: 'rgba(244,240,230,0.34)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' },
  sheet: { flexGrow: 1, minHeight: 620, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32 },
  tabBody: { marginTop: 16, gap: 10 },
  globalCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  globalPct: { color: brand.ink, fontSize: 21, lineHeight: 26 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  statHalf: { flexBasis: '47%', flexGrow: 1 },
  sectionGap: { marginTop: 24, marginBottom: 10 },
  resultNum: { color: brand.ink, fontSize: 19, lineHeight: 24 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  subjectPct: { color: brand.ink, fontSize: 17, lineHeight: 22 },
  noteCard: { marginTop: 6, padding: 14, borderRadius: 16, backgroundColor: brand.goldWash, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.35)' },
  linkIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
  statNum: { color: brand.ink, fontSize: 24, lineHeight: 30 },
  laurelWrap: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  laurelWrapBig: { width: 100, height: 100 },
  podiumScore: { color: brand.ink, fontSize: 18, lineHeight: 22 },
  podiumPlace: { fontSize: 24, lineHeight: 30 },
  candScore: { color: brand.ink, fontSize: 18, lineHeight: 23 },
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  rankRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 },
  ghostBtn: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginTop: -36 },
  gridCell: { width: '48%' },
  statCard: { padding: 16, gap: 2, minHeight: 92 },
  section: { paddingHorizontal: 20, marginTop: 24, gap: 12 },
  tintDot: { width: 8, height: 8, borderRadius: 4 },
  chartCard: { padding: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  linkRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
  roundDark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  periods: { flexDirection: 'row', gap: 4, padding: 4, marginTop: 16, marginBottom: 8, borderRadius: 999, backgroundColor: brand.paperDim },
  period: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  periodOn: { backgroundColor: colors.surface, ...theme.shadows.sm },
  skeleton: { height: 64, borderRadius: 14, backgroundColor: brand.skeleton },
  podium: { height: 260, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  podiumArt: { position: 'absolute', bottom: 0, opacity: 0 },
  podiumCol: { width: 104, alignItems: 'center', gap: 6 },
  podiumSheet: { width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...theme.shadows.soft },
  podiumFold: { position: 'absolute', top: -1, right: -1, width: 0, height: 0, borderTopWidth: 14, borderLeftWidth: 14, borderLeftColor: 'transparent', borderTopRightRadius: 10 },
  candRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, backgroundColor: brand.sheet },
  candMe: { backgroundColor: brand.goldWash, borderColor: 'rgba(180,138,72,0.55)', borderWidth: 1 },
  candRank: { width: 32, textAlign: 'center', color: brand.inkSoft, fontSize: 18, lineHeight: 23 },
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: brand.paper, shadowColor: brand.ink, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  strong: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: brand.goldWash },
  advice: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 18, backgroundColor: brand.goldWash, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.35)' },
});
