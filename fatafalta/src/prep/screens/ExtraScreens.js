import Pressable from '../../components/ui/FeedbackPressable';
import StatusBar from '../../theme/ThemeStatusBar';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import { useContext, useEffect, useRef, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated from'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, GraduationCap, ShieldCheck, Sparkles, Timer, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import AuthContext from '../../context/AuthContext';
import { getProgramme, packInfo } from '../content';
import usePrep, { useSummary } from '../store';
import { type } from '../theme';
import { Badge, NightBackground, PaperStack, PrepButton } from '../ui/primitives';
import ART from '../ui/art';
import { PaperStopwatch } from '../ui/Illustrations';
import { CopyMargin } from '../components/StudyPresentation';
import { sessionParams } from './SessionScreen';
import { useCatalogue } from './OnboardingScreens';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import VideoPanel from '../video/VideoPanel';
import VideoDock from '../video/VideoDock';
import useVideoScroll from '../video/useVideoScroll';
import { useVideo } from '../video/useVideos';

// ═══ E32 — Concours blanc : introduction ════════════════════════════════
export const MockIntroScreen = ({ navigation, route }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const programme = getProgramme(route.params.programme);
  const cb = programme.concoursBlanc;
  const matieres = programme.matieres.filter((m) => m.modules.some((x) => x.publie)).length;
  return (
    <View style={styles.night}>
      <StatusBar barStyle="light-content" />
      <NightBackground />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 0 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeDark}><X size={20} color={brand.onInk} /></Pressable>
        <View style={styles.mockHero}>
          <View accessible={false}><PaperStopwatch size={112} /></View>
          <Text style={[type.hero, styles.onInk, { textAlign: 'center' }]} accessibilityRole="header">Concours blanc</Text>
          <Text variant="body" style={[styles.onSoft, { textAlign: 'center' }]}>{`${programme.organisme.sigle} · ${programme.titre}`}</Text>
        </View>
        <View style={styles.mockBoard}>
          {[[`${cb.dureeMinutes} min`, 'durée'], [`${cb.nbQuestions}`, 'questions'], [`${matieres}`, 'matières']].map(([v, l]) => (
            <View key={l} style={styles.mockStat}>
              <Text style={[type.numeral, styles.condNum]}>{v}</Text>
              <Text variant="caption" style={styles.onSoft}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.panel, { marginTop: 28, marginHorizontal: -24, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={{ paddingLeft: 18, marginBottom: 24 }}>
            <CopyMargin />
            <Text variant="h2" style={styles.ink}>À toi de jouer.</Text>
            {['Navigue librement entre les questions.', 'La copie est remise à la fin du temps.', 'Retrouve ta note sur 20 et la correction à la fin. Tes erreurs rejoignent ton cahier.'].map((text, i) => (
              <View key={text} style={styles.mockRule}>
                <Text variant="bodyMedium" style={{ color: brand.burgundy }}>{i + 1}</Text>
                <Text variant="body" style={[styles.muted, { flex: 1 }]}>{text}</Text>
              </View>
            ))}
          </View>
          <PrepButton title="Commencer le concours blanc" iconLeft={Timer} onPress={() => navigation.replace('PrepSession', sessionParams.blanc(programme.code))} />
          <PrepButton title="Plus tard" variant="link" onPress={() => navigation.goBack()} style={{ marginTop: 12, alignSelf: 'center' }} compact />
        </View>
      </ScrollView>
    </View>
  );
};

// ═══ Épreuves officielles et sources ════════════════════════════════════
export const ProgramInfoScreen = ({ navigation, route }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const p = getProgramme(route.params.programme);
  const org = useCatalogue().find((o) => o.sigle === p.organisme.sigle);
  // Vidéo de présentation du concours : absente → l'écran reste exactement comme avant.
  const video = useVideo('concours', p.code);
  const vs = useVideoScroll();
  const panel = useRef(null);
  const [player, setPlayer] = useState({ playing: false, started: false });
  const [dockHold, setDockHold] = useState(false);
  useEffect(() => { if (!vs.panelOut) setDockHold(false); }, [vs.panelOut]);
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
      <Animated.ScrollView ref={vs.scrollRef} onScroll={vs.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: 24, paddingHorizontal: 20, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <Text variant="title" style={styles.ink} accessibilityRole="header">{p.titre}</Text>
        {video ? (
          <VideoPanel
            ref={panel}
            video={video}
            kind="concours"
            onLayout={vs.onPanelLayout}
            onRead={() => vs.scrollToAnchor('epreuves')}
            readLabel="Les épreuves"
            onPlayerChange={setPlayer}
          />
        ) : null}
        <Text variant="body" style={styles.muted}>{p.description}</Text>
        <Badge label={p.fiabilite === 'officielle' ? 'Épreuves issues d’un texte officiel' : 'Matières déduites des anciens sujets'} tone={p.fiabilite === 'officielle' ? 'success' : 'warning'} icon={p.fiabilite === 'officielle' ? ShieldCheck : FileText} />
        <Text variant="h2" style={[styles.ink, { marginTop: 10 }]} onLayout={vs.anchor('epreuves')}>Épreuves</Text>
        <View style={styles.card}>
          {p.epreuves.map((e, i) => (
            <Animated.View key={e.nom} style={[styles.epRow, i < p.epreuves.length - 1 && styles.hair]}>
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
      </Animated.ScrollView>
      {video ? (
        <VideoDock
          visible={vs.panelOut && (player.playing || dockHold)}
          playing={player.playing}
          title={video.title || p.titre}
          durationSec={video.durationSec}
          getCurrentTime={() => panel.current?.getCurrentTime() ?? Promise.resolve(0)}
          onToggle={() => { setDockHold(true); panel.current?.toggle(); }}
          onBack={vs.scrollToPanel}
        />
      ) : null}
    </PaperStack>
  );
};

// ═══ E36 — Abonnement (préparation) ═════════════════════════════════════
export const PrepSubscriptionScreen = ({ navigation }) => {
  const { brand, theme, colors } = useTheme();
  const { styles } = useStyles();
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
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeDark}><X size={20} color={brand.onInk} /></Pressable>
          <View style={{ width: 44 }} />
        </View>
        <Image source={ART.emblem} style={styles.emblem} resizeMode="contain" accessible={false} />
        <Text style={[type.hero, styles.onInk, { textAlign: 'center', marginTop: 6 }]} accessibilityRole="header">Continue ta préparation</Text>
        <Text variant="body" style={[styles.onSoft, { textAlign: 'center', marginTop: 6 }]}>
          Un seul abonnement pour la préparation <Text style={{ fontFamily: theme.fontFamily.bold, color: brand.onInk }}>et</Text> tous les anciens sujets.
        </Text>
        {summary && summary.stats.questions ? (
          <View style={styles.subscriptionStats}>
            {[[summary.modulesValides, 'modules validés'], [summary.stats.questions, 'questions'], [summary.serie, 'jours de série']].map(([v, l]) => (
              <View key={l} style={{ alignItems: 'center', flex: 1, minWidth: 90 }}>
                <Text style={[type.numeral, styles.condNum]}>{v}</Text>
                <Text variant="caption" style={styles.onSoft}>{l}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 14, marginTop: 24 }}>
          {[[GraduationCap, 'Préparation illimitée : leçons, exercices, révisions'], [Sparkles, 'Vérification du raisonnement par IA'], [Timer, 'Concours blancs et test de positionnement'], [FileText, 'Tous les anciens sujets et corrigés']].map(([Icon, label]) => (
            <View key={label} style={styles.subscriptionBenefit}>
              <View style={styles.benefitIcon}><Icon size={18} color={brand.goldLight} /></View>
              <Text variant="bodyMedium" style={[styles.onInk, { flex: 1 }]}>{label}</Text>
            </View>
          ))}
        </View>
      <View style={[styles.panel, { marginTop: 28, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.row}><CheckCircle2 size={18} color={colors.success} /><Text variant="caption" style={[styles.muted, { flex: 1 }]}>Ta progression, ton rang et ton pseudonyme sont conservés.</Text></View>
        <PrepButton title="S’abonner" variant="gold" onPress={subscribe} style={{ marginTop: 12 }} />
        <Text variant="caption" style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>
          {isAuthenticated ? 'Paiement sécurisé · formules et moyens de paiement à l’étape suivante' : 'Paiement sécurisé · ton compte sera créé à l’étape suivante'}
        </Text>
      </View>
      </ScrollView>
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    mockHero: { alignItems: 'center', gap: 12, paddingVertical: 24 },
    mockBoard: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.onInkSoft, paddingVertical: 20, rowGap: 20 },
    mockStat: { flexGrow: 1, flexBasis: 100, alignItems: 'center', gap: 4 },
    mockRule: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.line },
    subscriptionStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, paddingVertical: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.onInkSoft },
    subscriptionBenefit: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: brand.inkGlow },
    night: { ...theme.layout.readingFrame, flex: 1, backgroundColor: brand.inkDeep },
    stackHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
    headerText: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold },
    headerOrg: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    condNum: { color: brand.goldLight, fontSize: 28, lineHeight: 34 },
    emblem: { width: 120, height: 120, alignSelf: 'center', marginTop: 4 },
    benefitIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(228,201,151,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(228,201,151,0.35)' },

    ink: { color: brand.ink },
    muted: { color: brand.inkSoft },
    onInk: { color: brand.onInk },
    onSoft: { color: brand.onInkSoft },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    closeDark: { alignSelf: 'flex-start', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },

    card: { borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
    epRow: { flexDirection: 'row', gap: 12, padding: 14 },
    hair: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, padding: 14, borderRadius: 16, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line },

    panel: { paddingHorizontal: 20, paddingTop: 20, backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  });
  return { styles };
});
