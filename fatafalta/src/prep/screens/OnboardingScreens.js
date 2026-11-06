import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ArrowRight, ChevronRight, FileText, GraduationCap, Target } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import BrandMark from '../../components/brand/BrandMark';
import { usePreferences } from '../../context/PreferencesContext';
import { localCatalogue } from '../content';
import prepApi from '../api';
import { fetchPublishedOrganismes } from '../../services/catalog';
import cache from '../../services/cache';
import usePrep from '../store';
import { brand, colors, motion, theme, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { Badge, CornerFold, GoldSwash, PaperStack, PrepButton, PressScale } from '../ui/primitives';

const WELCOME_ART = require('../../../assets/illustrations/welcome-sheet.png');
import { PaperCompass } from '../ui/Illustrations';
import BottomSheet from '../ui/BottomSheet';
import ContestAccordion from '../components/ContestAccordion';

const FLAG = ['#F77F00', '#FFFFFF', '#009E60'];

/**
 * Logos des organismes : repris du catalogue des anciens sujets (/api/catalog/organismes), déjà
 * administré sur le web, en attendant que le service de préparation fournisse les siens.
 * Rapprochement par sigle normalisé (« inphb », « INP-HB » → INPHB). Mémoire partagée entre écrans
 * + copie sur l'appareil : les logos restent affichés hors ligne après le premier chargement.
 */
const LOGO_CACHE_KEY = 'prep-organisme-logos';
const keyOf = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
let logoIndex = null;
let logoRequest = null;
const indexLogos = (organismes) => {
  const index = {};
  (organismes || []).forEach((o) => {
    if (!o?.logo) return;
    const entry = { logo: o.logo, organismeId: o._id, nom: o.name || o.nom };
    [o.abbreviation, o.name, o.nom].forEach((label) => { const k = keyOf(label); if (k && !index[k]) index[k] = entry; });
  });
  return index;
};
const loadLogoIndex = () => {
  if (logoIndex) return Promise.resolve(logoIndex);
  if (!logoRequest) {
    logoRequest = (async () => {
      const cached = await cache.load(LOGO_CACHE_KEY);
      if (cached && typeof cached === 'object') logoIndex = cached;
      try {
        const result = await fetchPublishedOrganismes({ limit: 100 });
        logoIndex = indexLogos(result.data);
        cache.save(LOGO_CACHE_KEY, logoIndex);
      } catch (error) {
        // Hors ligne : la copie locale (ou les monogrammes) prend le relais.
      }
      logoRequest = null;
      return logoIndex || {};
    })();
  }
  return logoRequest;
};
const withLogos = (catalogue, index) => catalogue.map((o) => {
  const found = index?.[keyOf(o.sigle)];
  return found ? { ...o, logo: o.logo || found.logo, organismeId: o.organismeId || found.organismeId } : o;
});

/** Catalogue « organismes → cycles » : embarqué tout de suite, enrichi par l'API (logos). */
export const useCatalogue = () => {
  const [catalogue, setCatalogue] = useState(() => withLogos(localCatalogue(), logoIndex));
  useEffect(() => {
    let alive = true;
    loadLogoIndex().then((index) => { if (alive) setCatalogue((current) => withLogos(current, index)); });
    prepApi.catalogue().then((remote) => {
      if (!alive || !Array.isArray(remote)) return;
      setCatalogue((local) => withLogos(local.map((o) => {
        const r = remote.find((x) => x.sigle === o.sigle);
        return r ? { ...o, nom: r.nom || o.nom, logo: r.logo || o.logo || null, organismeId: r.organismeId || o.organismeId, cycles: o.cycles.map((c) => ({ ...c, parcoursTypeId: r.cycles.find((rc) => rc.programme === c.programme)?.parcoursTypeId || null })) } : o;
      }), logoIndex));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return catalogue;
};

// ═══ E01 — « Que veux-tu faire ? » ══════════════════════════════════════
// Pile de copies : la marque sur l'encre, la copie notée 18/20 en héros, deux choix nets.
const ChoiceCard = ({ featured, icon: Icon, title, text, badge, onPress, accessibilityLabel, delay }) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(460)}>
    <PressScale onPress={onPress} accessibilityLabel={accessibilityLabel} style={[styles.choice, featured && styles.choiceFeatured]}>
      {featured ? <CornerFold size={26} radius={20} /> : null}
      <View style={[styles.choiceIcon, { backgroundColor: featured ? brand.burgundy : brand.ink }]}>
        <Icon size={22} color={featured ? '#FFF' : brand.goldLight} strokeWidth={1.9} />
      </View>
      <View style={styles.choiceText}>
        <View style={styles.row}>
          <Text variant="h2" style={[styles.ink, styles.choiceTitle]}>{title}</Text>
          {badge ? <Badge label={badge} tone="gold" /> : null}
        </View>
        <Text variant="caption" style={styles.muted}>{text}</Text>
      </View>
      <View style={[styles.choiceGo, featured && styles.choiceGoFeatured]}>
        <ArrowRight size={18} color={featured ? '#FFF' : brand.burgundy} strokeWidth={2.2} />
      </View>
    </PressScale>
  </Animated.View>
);

export const WelcomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const completeOnboarding = usePrep((s) => s.completeOnboarding);
  const { updatePreferences } = usePreferences();
  const float = useSharedValue(0);
  useEffect(() => { if (!reduce) float.value = withRepeat(withSequence(withTiming(1, { duration: 2600 }), withTiming(0, { duration: 2600 })), -1); }, [reduce, float]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * float.value }, { rotate: `${-3 + float.value * 1.2}deg` }] }));

  const choose = (choix) => {
    haptic.select();
    updatePreferences({ hasCompletedOrientation: true, selectedContentType: choix === 'prepa' ? 'training' : 'subjects' }).catch(() => {});
    if (choix === 'prepa') { navigation.navigate('PrepContestPicker', { onboarding: true }); return; }
    completeOnboarding('sujets');
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'ExploreTab' } }] });
  };

  const header = (
    <View style={styles.brandRow}>
      <BrandMark size={26} variant="onDark" />
      <Text variant="bodyMedium" style={styles.brandName}>Fatafalta</Text>
      <View style={styles.flag}>{FLAG.map((c) => <View key={c} style={[styles.flagBand, { backgroundColor: c }]} />)}</View>
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={[styles.welcomeContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.welcomeArt}>
          <Animated.Image source={WELCOME_ART} style={[styles.welcomeImg, floatStyle]} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(460)} style={styles.welcomeCopy}>
          <Text variant="title" style={[styles.ink, styles.center]} accessibilityRole="header">
            {'Réussis ton concours,\n'}<Text variant="title" style={styles.titleAccent}>à ton rythme.</Text>
          </Text>
          <GoldSwash width={132} style={styles.swash} />
          <Text variant="body" style={[styles.muted, styles.center, styles.lead]}>Cours, exercices et anciens sujets, réunis en une seule application.</Text>
        </Animated.View>
        <View style={styles.choices}>
          <ChoiceCard
            featured
            delay={220}
            icon={GraduationCap}
            title="Me préparer"
            badge="Nouveau"
            text="Cours en modules, exercices du simple à l’avancé, suivi de ta progression"
            onPress={() => choose('prepa')}
            accessibilityLabel="Me préparer à un concours. Cours en modules, exercices, suivi de ta progression"
          />
          <ChoiceCard
            delay={290}
            icon={FileText}
            title="Anciens sujets"
            text="Concours et examens, avec leurs corrigés"
            onPress={() => choose('sujets')}
            accessibilityLabel="Consulter les anciens sujets. Concours et examens, avec leurs corrigés"
          />
        </View>
        <Text variant="caption" style={[styles.mutedLight, styles.center, styles.footNote]}>Tu pourras passer de l’un à l’autre à tout moment.</Text>
      </ScrollView>
    </PaperStack>
  );
};

// ═══ E02 / E06 — « Quel concours ? » ════════════════════════════════════
export const ContestPickerScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const onboarding = route.params?.onboarding;
  const catalogue = useCatalogue();
  const current = usePrep((s) => s.programme);
  const suivis = usePrep((s) => s.programmesSuivis);
  const chooseProgramme = usePrep((s) => s.chooseProgramme);
  const completeOnboarding = usePrep((s) => s.completeOnboarding);
  const [selected, setSelected] = useState(current);
  const scroll = useRef(null);
  const cycle = catalogue.flatMap((o) => o.cycles.map((c) => ({ ...c, sigle: o.sigle }))).find((c) => c.programme === selected);

  const confirm = () => {
    haptic.success();
    chooseProgramme(selected);
    if (onboarding) {
      completeOnboarding('prepa');
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs', params: { screen: 'PrepTab', params: { accueil: true } } }] });
    } else {
      navigation.goBack();
    }
  };

  const header = (
    <View style={styles.stackHeader}>
      <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" hitSlop={6} style={styles.roundOnInk}><ArrowLeft size={20} color={brand.onInk} /></Pressable>
      {onboarding ? <StepDots step={1} total={2} /> : <Text variant="bodyMedium" style={styles.headerTitle}>Changer de concours</Text>}
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <PaperStack header={header}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView ref={scroll} contentContainerStyle={styles.pickerContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.pickerHead}>
          <View style={{ flex: 1 }}>
            <Text variant="title" style={styles.ink} accessibilityRole="header">Quel concours prépares-tu ?</Text>
            <Text variant="body" style={[styles.muted, { marginTop: 8 }]}>Choisis l’organisme, puis ton cycle.</Text>
          </View>
          <PaperCompass size={60} />
        </View>
        {!onboarding && suivis.length > 1 ? (
          <View style={{ marginBottom: 22, gap: 8 }}>
            <Text variant="h3" style={styles.ink}>Tes programmes</Text>
            {suivis.map((code) => {
              const c = catalogue.flatMap((o) => o.cycles.map((x) => ({ ...x, sigle: o.sigle }))).find((x) => x.programme === code);
              if (!c) return null;
              return (
                <PressScale key={code} onPress={() => { haptic.select(); setSelected(code); }} style={[styles.followed, selected === code && styles.followedSel]} accessibilityState={{ selected: selected === code }}>
                  <Text variant="bodyMedium" style={styles.ink}>{`${c.sigle} · ${c.nom}`}</Text>
                </PressScale>
              );
            })}
            <Text variant="h3" style={[styles.ink, { marginTop: 14 }]}>Tous les concours</Text>
          </View>
        ) : null}
        <ContestAccordion catalogue={catalogue} selected={selected} onSelect={(c) => setSelected(c.programme)} scrollTo={(y) => scroll.current?.scrollTo({ y: Math.max(0, y + 120), animated: true })} />
      </ScrollView>
      <View style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <LinearGradient colors={['rgba(252,250,245,0)', brand.paper]} style={styles.veil} pointerEvents="none" />
        <PrepButton title={cycle ? `Continuer avec ${cycle.sigle} · ${cycle.nom}` : 'Continuer'} disabled={!selected} onPress={confirm} icon={ArrowRight} />
      </View>
    </PaperStack>
  );
};

/** Progression d'étape : pastille longue pour l'étape en cours (références E01–E03). */
export const StepDots = ({ step, total, onInk = true }) => (
  <View style={styles.dots} accessibilityLabel={`Étape ${step} sur ${total}`}>
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[styles.dot, { backgroundColor: onInk ? 'rgba(255,255,255,0.28)' : brand.line }, i + 1 === step && styles.dotOn]} />
    ))}
  </View>
);

// ═══ E03 — Feuille « Ton rythme » ═══════════════════════════════════════
const PACES = [[5, 'Tranquille'], [10, 'Régulier'], [20, 'Intensif']];

const PaceTile = ({ minutes, label, selected, onPress }) => {
  const s = useSharedValue(selected ? 1 : 0);
  useEffect(() => { s.value = withSpring(selected ? 1 : 0, motion.snap); }, [selected, s]);
  const num = useAnimatedStyle(() => ({ transform: [{ scale: 1 + s.value * 0.04 }] }));
  return (
    <PressScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${minutes} minutes par jour, ${label}`} style={[styles.tile, selected && styles.tileSel]}>
      {minutes === 10 ? <Badge label="Conseillé" tone="gold" style={styles.tileBadge} /> : null}
      <Animated.Text style={[type.display, styles.tileNum, num]}>{minutes}</Animated.Text>
      <Text variant="caption" style={styles.muted}>{`min · ${label}`}</Text>
    </PressScale>
  );
};

export const RhythmSheet = ({ visible, onClose, onPlacementTest }) => {
  const setPrefs = usePrep((s) => s.setPrefs);
  const objectif = usePrep((s) => s.prefs.objectif);
  const [pace, setPace] = useState(objectif || 10);
  const done = (test) => {
    haptic.success();
    setPrefs({ objectif: pace, rythmeFait: true });
    onClose();
    if (test) setTimeout(onPlacementTest, 350);
  };
  return (
    <BottomSheet visible={visible} onClose={() => done(false)} maxHeight={0.8} footer={<PrepButton title="C’est parti" onPress={() => done(false)} />}>
      <StepDots step={2} total={2} onInk={false} />
      <Text variant="title" style={[styles.ink, { marginTop: 12, marginBottom: 18, fontSize: 26, lineHeight: 32 }]}>Combien de temps par jour ?</Text>
      <View style={styles.tiles}>
        {PACES.map(([m, l]) => <PaceTile key={m} minutes={m} label={l} selected={pace === m} onPress={() => { haptic.select(); setPace(m); }} />)}
      </View>
      <View style={styles.testBox}>
        <View style={styles.row}><Target size={20} color={brand.gold} /><Text variant="h3" style={styles.ink}>Faire le test de positionnement ?</Text></View>
        <Text variant="caption" style={styles.muted}>5 minutes pour savoir par où commencer.</Text>
        <View style={[styles.row, { marginTop: 6 }]}>
          <PrepButton title="Faire le test" variant="secondary" onPress={() => done(true)} style={{ flex: 1 }} compact />
          <PrepButton title="Plus tard" variant="link" onPress={() => done(false)} style={{ flex: 1 }} compact />
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  paper: { flex: 1, backgroundColor: brand.paper },
  ink: { color: brand.ink },
  onInk: { color: brand.onInk },
  onSoft: { color: brand.onInkSoft, marginTop: 6 },
  muted: { color: brand.inkSoft },
  mutedLight: { color: brand.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingTop: 10, minHeight: 44 },
  brandName: { color: brand.onInk, fontFamily: theme.fontFamily.serif, fontSize: 19, letterSpacing: -0.2 },
  flag: { marginLeft: 4, flexDirection: 'row', overflow: 'hidden', borderRadius: 1 },
  flagBand: { width: 7, height: 3 },
  welcomeContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 8 },
  welcomeArt: { alignItems: 'center', height: 236, justifyContent: 'center' },
  welcomeImg: { width: 236, height: 236 },
  welcomeCopy: { alignItems: 'center', marginTop: -4 },
  titleAccent: { color: brand.burgundy, fontFamily: theme.fontFamily.serifItalic },
  swash: { marginTop: 4 },
  lead: { marginTop: 10, maxWidth: 300 },
  choices: { gap: 12, marginTop: 26 },
  choice: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingLeft: 16, paddingRight: 14, borderRadius: 20, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  choiceFeatured: { borderColor: 'rgba(108,40,56,0.28)', borderWidth: 1 },
  choiceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { fontSize: 21, lineHeight: 26 },
  choiceGo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: 'rgba(108,40,56,0.4)' },
  choiceGoFeatured: { backgroundColor: brand.burgundy, borderColor: brand.burgundy },
  footNote: { marginTop: 18 },
  stackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, minHeight: 50 },
  roundOnInk: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)' },
  headerTitle: { color: brand.onInk, fontFamily: theme.fontFamily.semiBold },
  headerSpacer: { width: 44 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 22, backgroundColor: brand.gold },
  pickerContent: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 150 },
  pickerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  followed: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, backgroundColor: brand.sheet, borderWidth: 1, borderColor: brand.line },
  followedSel: { borderColor: 'rgba(108,40,56,0.45)', borderWidth: 1.5, backgroundColor: brand.burgundyWash },
  stickyBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 22 },
  veil: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, height: 116, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: brand.paperDim, borderWidth: 1.5, borderColor: 'transparent' },
  tileSel: { backgroundColor: brand.sheet, borderColor: brand.burgundy, ...theme.shadows.soft },
  tileBadge: { position: 'absolute', top: -11, alignSelf: 'center' },
  tileNum: { color: brand.ink, fontSize: 36, lineHeight: 42 },
  testBox: { marginTop: 20, padding: 16, borderRadius: 18, backgroundColor: brand.goldWash, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.35)' },
});
