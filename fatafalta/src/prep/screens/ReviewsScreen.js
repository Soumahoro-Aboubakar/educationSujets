import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Play, RotateCcw } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { getExercise, getProgramme, programmeModules } from '../content';
import { todayKey, useProgress, useRights } from '../store';
import { brand, colors, motion, subjectTint, theme, type } from '../theme';
import { haptic } from '../feedback';
import { GoldSwash, PaperStack, PrepButton, PressScale, Segmented } from '../ui/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorNotebook } from '../ui/Illustrations';
import BottomSheet from '../ui/BottomSheet';
import { LockedSheet } from '../components/Sheets';
import { sessionParams } from './SessionScreen';

const describeAnswer = (ex, cle) => {
  const c = ex.contenu;
  switch (ex.type) {
    case 'qcm': return (cle.ids || []).map((id) => c.options.find((o) => o.id === id)?.texte).join(' · ');
    case 'entourer': return (cle.ids || []).map((id) => c.elements.find((o) => o.id === id)?.texte).join(' · ');
    case 'surligner': return (cle.ids || []).map((id) => c.segments.find((o) => o.id === id)?.texte).join(' ');
    case 'vraiFaux': return c.affirmations.map((a) => `${cle.valeurs[a.id] ? 'Vrai' : 'Faux'} — ${a.texte}`).join('\n');
    case 'glisser': return Object.values(cle.trous).map((ids) => c.etiquettes.find((e) => e.id === ids[0])?.texte).join(' · ');
    case 'ordre': return cle.ordre.map((id, i) => `${i + 1}. ${c.elements.find((e) => e.id === id)?.texte}`).join('\n');
    case 'relier': return Object.entries(cle.paires).map(([g, d]) => `${c.gauche.find((x) => x.id === g)?.texte} → ${c.droite.find((x) => x.id === d)?.texte}`).join('\n');
    case 'classer': return c.categories.map((k) => `${k.nom} : ${c.cartes.filter((x) => cle.cartes[x.id] === k.id).map((x) => x.texte).join(', ')}`).join('\n');
    case 'numerique': return `${String(cle.valeur).replace('.', ',')}${c.unite ? ` ${c.unite}` : ''}`;
    default: return '';
  }
};

/** E29 — Révisions du jour / Cahier d'erreurs, E30 — Fiche d'erreur. */
const ReviewsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const programmeCode = route.params.programme;
  const programme = getProgramme(programmeCode);
  const etat = useProgress(programmeCode);
  const rights = useRights();
  const [tab, setTab] = useState(route.params.onglet === 'cahier' ? 'cahier' : 'jour');
  const [chip, setChip] = useState('Toutes');
  const [fiche, setFiche] = useState(null);
  const [locked, setLocked] = useState(false);

  const today = todayKey();
  const due = core.dueReviews(etat, today);
  const modules = programmeModules(programme);
  const matiereOf = (moduleCode) => modules.find((m) => m.code === moduleCode);
  const erreurs = Object.entries(etat.erreurs || {}).map(([code, e]) => ({ code, ...e, found: getExercise(code) })).filter((e) => e.found);
  const filtered = erreurs.filter((e) => chip === 'Toutes' || matiereOf(e.found.module.code)?.matiere === chip);
  const groups = useMemo(() => {
    const g = {};
    filtered.forEach((e) => { const k = e.found.module.titre; (g[k] = g[k] || []).push(e); });
    return Object.entries(g);
  }, [filtered]);
  const parMatiere = programme.matieres.map((m) => ({ nom: m.nom, teinte: m.teinte, n: due.codes.filter((c) => matiereOf(getExercise(c)?.module.code)?.matiere === m.nom).length })).filter((m) => m.n);

  const switchTab = (t) => { setTab(t); };
  const start = (codes) => {
    if (!rights.peutEtudier) { setLocked(true); return; }
    navigation.navigate('PrepSession', sessionParams.revision(programmeCode, core.seededShuffle(codes, `${today}:${codes.length}`)));
  };
  const ago = (d) => {
    if (!d) return '';
    const days = Math.round((new Date(`${today}T00:00:00Z`) - new Date(`${d}T00:00:00Z`)) / 864e5);
    return days <= 0 ? 'aujourd’hui' : days === 1 ? 'hier' : `il y a ${days} j`;
  };

  return (
    <PaperStack header={(
      <View style={styles.stackHeader}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" hitSlop={6} style={styles.roundOnInk}><ArrowLeft size={20} color="#FFF" /></Pressable>
        <View style={{ width: 44 }} />
      </View>
    )}>
      <ScrollView contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Text variant="title" style={styles.ink} accessibilityRole="header">À réviser</Text>
        <GoldSwash width={96} style={{ marginTop: 2 }} />
        <Segmented items={[{ key: 'jour', label: `Aujourd’hui (${due.total})` }, { key: 'cahier', label: `Cahier d’erreurs (${erreurs.length})` }]} value={tab} onChange={switchTab} style={{ marginVertical: 18 }} />

        {tab === 'jour' ? (
          due.total ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 18 }}>
              <PressScale onPress={() => start(due.codes)} style={styles.hero} accessibilityLabel={`Lancer ${due.codes.length} révisions`}>
                <LinearGradient colors={[brand.burgundyBright, brand.burgundy, brand.burgundyDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={styles.play}><Play size={20} color={brand.burgundy} fill={brand.burgundy} style={{ marginLeft: 2 }} /></View>
                <View style={{ flex: 1 }}>
                  <Text variant="h2" style={styles.onInk}>{`${due.codes.length} question${due.codes.length > 1 ? 's' : ''}`}</Text>
                  <Text variant="caption" style={styles.onSoft}>{`Environ ${Math.max(2, Math.round(due.codes.length * 0.7))} min · révisions du jour`}</Text>
                </View>
              </PressScale>
              {parMatiere.map((m) => (
                <View key={m.nom} style={{ gap: 6 }}>
                  <View style={styles.between}><Text variant="caption" style={styles.ink}>{m.nom}</Text><Text variant="caption" style={[styles.muted, type.tabular]}>{m.n}</Text></View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${(100 * m.n) / due.codes.length}%`, backgroundColor: subjectTint(m.teinte).tint }]} /></View>
                </View>
              ))}
              <Text variant="caption" style={styles.muted}>Les questions reviennent après 1, 3, 7 et 14 jours.</Text>
            </Animated.View>
          ) : (
            <View style={styles.empty}><ErrorNotebook /><Text variant="h3" style={styles.ink}>Tout est à jour</Text><Text variant="body" style={[styles.muted, { textAlign: 'center' }]}>Aucune révision prévue aujourd’hui. Continue comme ça.</Text></View>
          )
        ) : erreurs.length ? (
          <View style={{ gap: 14 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['Toutes', ...programme.matieres.map((m) => m.nom)].map((m) => (
                <Pressable key={m} onPress={() => { haptic.select(); setChip(m); }} style={[styles.chip, chip === m && styles.chipOn]} accessibilityState={{ selected: chip === m }}>
                  <Text variant="caption" style={[styles.muted, chip === m && { color: '#FFF' }]}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {groups.map(([titre, list]) => (
              <Animated.View key={titre} layout={LinearTransition} style={{ gap: 8 }}>
                <Text variant="h3" style={[styles.ink, { marginTop: 6 }]}>{titre}</Text>
                {list.map((e, i) => (
                  <Animated.View key={e.code} entering={FadeInDown.delay(i * 30)} layout={LinearTransition}>
                    <PressScale onPress={() => setFiche(e)} style={styles.errRow} accessibilityLabel={`${e.found.exercice.consigne}, ratée ${e.rates} fois`}>
                      <View style={styles.errIcon}><RotateCcw size={16} color={colors.error} /></View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" style={styles.ink} numberOfLines={2}>{e.found.exercice.consigne}</Text>
                        <Text variant="caption" style={styles.muted}>{`Ratée ${e.rates} fois · ${ago(e.derniereTentative)}`}</Text>
                      </View>
                      <View style={styles.dots}>{[0, 1].map((k) => <View key={k} style={[styles.dot, k < (e.reussites || 0) && styles.dotOn]} />)}</View>
                    </PressScale>
                  </Animated.View>
                ))}
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}><ErrorNotebook /><Text variant="h3" style={styles.ink}>Aucune erreur pour l’instant</Text><Text variant="body" style={[styles.muted, { textAlign: 'center' }]}>Continue comme ça.</Text></View>
        )}
      </ScrollView>
      {tab === 'cahier' && filtered.length ? (
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <LinearGradient colors={['rgba(252,250,245,0)', brand.paper]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <PrepButton title="Réviser mes erreurs" iconLeft={RotateCcw} onPress={() => start(filtered.map((e) => e.code).slice(0, 20))} />
        </View>
      ) : null}

      <BottomSheet visible={Boolean(fiche)} onClose={() => setFiche(null)} maxHeight={0.88} footer={fiche ? <PrepButton title="Réessayer maintenant" onPress={() => { const c = fiche.code; setFiche(null); start([c]); }} /> : null}>
        {fiche ? (
          <View style={{ gap: 12 }}>
            <Text variant="h3" style={styles.ink}>{fiche.found.exercice.consigne}</Text>
            <View style={styles.answerBox}>
              <Text variant="h3" style={{ color: colors.success }}>Bonne réponse</Text>
              <Text variant="body" style={styles.ink}>{describeAnswer(fiche.found.exercice, fiche.found.exercice.cle)}</Text>
            </View>
            <Text variant="body" style={styles.ink}>{fiche.found.exercice.explication}</Text>
            <View style={styles.retain}>
              <Text variant="h3" style={{ color: brand.goldInk }}>{fiche.found.exercice.miniCours.titre}</Text>
              <Text variant="body" style={styles.ink}>{fiche.found.exercice.miniCours.corps}</Text>
            </View>
            {fiche.found.exercice.raisonnement ? (
              <View style={{ gap: 4 }}>
                <Text variant="h3" style={styles.ink}>Raisonnement de référence</Text>
                <Text variant="body" style={styles.ink}>{fiche.found.exercice.raisonnement.reference}</Text>
              </View>
            ) : null}
            <Text variant="caption" style={styles.muted}>{`Ratée ${fiche.rates} fois · dernière tentative ${ago(fiche.derniereTentative)}`}</Text>
          </View>
        ) : null}
      </BottomSheet>
      <LockedSheet visible={locked} onClose={() => setLocked(false)} message="Les fiches restent consultables ; les sessions de révision sont réservées aux abonnés après l’essai." onSubscribe={() => { setLocked(false); navigation.navigate('PrepSubscription'); }} />
    </PaperStack>
  );
};

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: brand.paper },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
  roundOnInk: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 22, overflow: 'hidden', ...theme.shadows.button },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper },
  bar: { height: 6, borderRadius: 3, backgroundColor: brand.line, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  empty: { alignItems: 'center', gap: 10, marginTop: 30 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
  chipOn: { backgroundColor: brand.burgundy, borderColor: brand.burgundy },
  errRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  errIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.errorWash },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.success },
  dotOn: { backgroundColor: colors.success },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 24 },
  answerBox: { padding: 16, borderRadius: 16, backgroundColor: colors.successWash, gap: 6 },
  retain: { padding: 16, borderRadius: 16, backgroundColor: brand.goldWash, gap: 6 },
});

export default ReviewsScreen;
