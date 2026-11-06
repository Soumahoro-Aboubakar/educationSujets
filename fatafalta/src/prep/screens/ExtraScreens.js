import React, { useContext } from 'react';
import { Image, Linking, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, GraduationCap, ShieldCheck, Sparkles, Timer, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import AuthContext from '../../context/AuthContext';
import { getProgramme, packInfo } from '../content';
import usePrep, { useSummary } from '../store';
import { brand, colors, theme, type } from '../theme';
import { AnimatedNumber, Badge, NightBackground, PaperStack, PrepButton } from '../ui/primitives';
import ART from '../ui/art';
import { PaperStopwatch } from '../ui/Illustrations';
import { sessionParams } from './SessionScreen';
import { useCatalogue } from './OnboardingScreens';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';

// ═══ E32 — Concours blanc : introduction ════════════════════════════════
export const MockIntroScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const programme = getProgramme(route.params.programme);
  const cb = programme.concoursBlanc;
  const matieres = programme.matieres.filter((m) => m.modules.some((x) => x.publie)).length;
  return (
    <View style={styles.night}>
      <StatusBar barStyle="light-content" />
      <NightBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Fermer" style={styles.closeDark}><X size={20} color={brand.onInk} /></Pressable>
        <PaperStopwatch size={150} />
        <Text style={[type.hero, styles.onInk, { textAlign: 'center', marginTop: 18 }]} accessibilityRole="header">Concours blanc</Text>
        <Text variant="bodyMedium" style={{ color: brand.goldLight, textAlign: 'center', marginTop: 4 }}>{`${programme.organisme.sigle} · ${programme.titre}`}</Text>
        <View style={styles.condCard}>
          {[[`${cb.dureeMinutes} min`, 'durée'], [`${cb.nbQuestions}`, 'questions'], [`${matieres}`, 'matières']].map(([v, l]) => (
            <View key={l} style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[type.numeral, styles.condNum]}>{v}</Text>
              <Text variant="caption" style={styles.onSoft}>{l}</Text>
            </View>
          ))}
        </View>
        <Text variant="caption" style={[styles.onSoft, { textAlign: 'center', marginTop: 14 }]}>Aucune correction avant la fin · navigation libre · remise automatique à la fin du temps. Note sur 20, erreurs ajoutées au cahier.</Text>
      </ScrollView>
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <PrepButton title="Commencer le concours blanc" iconLeft={Timer} onPress={() => navigation.replace('PrepSession', sessionParams.blanc(programme.code))} />
        <PrepButton title="Plus tard" variant="link" onPress={() => navigation.goBack()} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

// ═══ Épreuves officielles et sources ════════════════════════════════════
export const ProgramInfoScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const p = getProgramme(route.params.programme);
  const org = useCatalogue().find((o) => o.sigle === p.organisme.sigle);
  return (
    <PaperStack header={(
      <View style={styles.stackHeader}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" hitSlop={6} style={styles.closeDark}><ArrowLeft size={20} color={brand.onInk} /></Pressable>
        <View style={styles.headerOrg}>
          <OrganismeLogo organisme={{ nom: p.organisme.sigle, logo: org?.logo }} size={28} />
          <Text variant="bodyMedium" style={styles.headerText}>{p.organisme.sigle}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
    )}>
      <ScrollView contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Text variant="title" style={styles.ink} accessibilityRole="header">{p.titre}</Text>
        <Text variant="body" style={styles.muted}>{p.description}</Text>
        <Badge label={p.fiabilite === 'officielle' ? 'Épreuves issues d’un texte officiel' : 'Matières déduites des anciens sujets'} tone={p.fiabilite === 'officielle' ? 'success' : 'warning'} icon={p.fiabilite === 'officielle' ? ShieldCheck : FileText} />
        <Text variant="h2" style={[styles.ink, { marginTop: 10 }]}>Épreuves</Text>
        <View style={styles.card}>
          {p.epreuves.map((e, i) => (
            <Animated.View key={e.nom} entering={FadeInDown.delay(i * 30)} style={[styles.epRow, i < p.epreuves.length - 1 && styles.hair]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={styles.ink}>{e.nom}</Text>
                {e.note ? <Text variant="caption" style={styles.muted}>{e.note}</Text> : null}
              </View>
              <Text variant="caption" style={[styles.muted, type.tabular, { textAlign: 'right' }]}>{[e.duree, e.coefficient ? `coef. ${e.coefficient}` : null].filter(Boolean).join('\n') || 'à confirmer'}</Text>
            </Animated.View>
          ))}
        </View>
        {p.noteSources ? <Text variant="caption" style={styles.muted}>{p.noteSources}</Text> : null}
        <Text variant="h2" style={[styles.ink, { marginTop: 10 }]}>Sources</Text>
        {p.sources.map((s) => (
          <Pressable key={s.titre} disabled={!s.url} onPress={() => Linking.openURL(s.url)} style={styles.sourceRow} accessibilityRole={s.url ? 'link' : undefined}>
            <Text variant="caption" style={[styles.ink, { flex: 1 }]}>{s.titre}</Text>
            {s.url ? <ExternalLink size={16} color={brand.burgundy} /> : null}
          </Pressable>
        ))}
        <Text variant="caption" style={styles.muted}>{`Contenu pilote — ${packInfo.provenance.statut}. Rédaction : ${packInfo.provenance.redaction}. ${packInfo.provenance.relecture}. Signale toute erreur depuis un exercice (drapeau).`}</Text>
      </ScrollView>
    </PaperStack>
  );
};

// ═══ E36 — Abonnement (préparation) ═════════════════════════════════════
export const PrepSubscriptionScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useContext(AuthContext);
  const programme = usePrep((s) => s.programme);
  const summary = useSummary(programme);
  const subscribe = () => {
    // Même abonnement que les anciens sujets (§ 24) : le paiement passe par le compte (§ 25.5).
    if (!isAuthenticated) navigation.navigate('Register', { returnTo: 'back' });
    else navigation.navigate('Subscription');
  };
  return (
    <View style={styles.night}>
      <StatusBar barStyle="light-content" />
      <NightBackground />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={styles.between}>
          <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Fermer" style={styles.closeDark}><X size={20} color={brand.onInk} /></Pressable>
          <View style={{ width: 44 }} />
        </View>
        <Image source={ART.emblem} style={styles.emblem} resizeMode="contain" accessible={false} />
        <Text style={[type.hero, styles.onInk, { textAlign: 'center', marginTop: 6 }]} accessibilityRole="header">Continue ta préparation</Text>
        <Text variant="body" style={[styles.onSoft, { textAlign: 'center', marginTop: 6 }]}>
          Un seul abonnement pour la préparation <Text style={{ fontFamily: theme.fontFamily.bold, color: brand.onInk }}>et</Text> tous les anciens sujets.
        </Text>
        {summary && summary.stats.questions ? (
          <View style={styles.condCard}>
            {[[summary.modulesValides, 'modules validés'], [summary.stats.questions, 'questions'], [summary.serie, 'jours de série']].map(([v, l]) => (
              <View key={l} style={{ alignItems: 'center', flex: 1 }}>
                <AnimatedNumber value={v} style={[type.numeral, styles.condNum]} />
                <Text variant="caption" style={styles.onSoft}>{l}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 14, marginTop: 24 }}>
          {[[GraduationCap, 'Préparation illimitée : leçons, exercices, révisions'], [Sparkles, 'Vérification du raisonnement par IA'], [Timer, 'Concours blancs et test de positionnement'], [FileText, 'Tous les anciens sujets et corrigés']].map(([Icon, label], i) => (
            <Animated.View key={label} entering={FadeInDown.delay(150 + i * 60)} style={styles.benefit}>
              <View style={styles.benefitIcon}><Icon size={18} color={brand.goldLight} /></View>
              <Text variant="bodyMedium" style={[styles.onInk, { flex: 1 }]}>{label}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.row}><CheckCircle2 size={18} color={colors.success} /><Text variant="caption" style={styles.muted}>Ta progression, ton rang et ton pseudonyme sont conservés.</Text></View>
        <PrepButton title="S’abonner" variant="gold" onPress={subscribe} style={{ marginTop: 12 }} />
        <Text variant="caption" style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>
          {isAuthenticated ? 'Paiement sécurisé · formules et moyens de paiement à l’étape suivante' : 'Paiement sécurisé · ton compte sera créé à l’étape suivante'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  night: { flex: 1, backgroundColor: brand.inkDeep },
  stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
  headerText: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold },
  headerOrg: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  condNum: { color: brand.goldLight, fontSize: 28, lineHeight: 34 },
  emblem: { width: 120, height: 120, alignSelf: 'center', marginTop: 4 },
  benefitIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(228,201,151,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(228,201,151,0.35)' },
  paper: { flex: 1, backgroundColor: brand.paper },
  ink: { color: brand.ink },
  muted: { color: brand.inkSoft },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeDark: { alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
  condCard: { alignSelf: 'stretch', flexDirection: 'row', marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(228,201,151,0.3)' },
  card: { borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  epRow: { flexDirection: 'row', gap: 12, padding: 14 },
  hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 14, borderRadius: 16, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  panel: { paddingHorizontal: 20, paddingTop: 20, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
