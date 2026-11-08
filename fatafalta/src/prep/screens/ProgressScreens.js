import { getErrorMessage } from '../../utils/userMessages';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Check, ChevronRight, Flame, NotebookPen, Target, Timer, Trophy } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { getProgramme, programmeModules } from '../content';
import usePrep, { todayKey, useSummary } from '../store';
import prepApi from '../api';
import { brand, colors, subjectTint, theme, type } from '../theme';
import { haptic } from '../feedback';
import { AnimatedNumber, Card, Enter, NightBackground, PrepButton, PressScale, ProgressBar, ProgressRing, SectionTitle, Segmented, StatTile, SubjectIcon } from '../ui/primitives';
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
    prepApi.ranking(programmeCode, 'tout').then((r) => { setRank(r); setOffline(false); }).catch((err) => setOffline(getErrorMessage(err, 'classement')));
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
                <Text variant="bodyMedium" style={styles.onInk}>{offline || 'Ton rang n’est pas encore affiché. Réponds à des questions puis consulte le classement.'}</Text>
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

// Les écrans du classement partagent leur pagination et leurs composants dédiés.
export { RankingScreen, CandidateScreen } from '../components/RankingScreens';

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
  centerAll: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  rankRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 8 },
  chartCard: { padding: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  linkRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
});
