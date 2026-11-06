import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BookOpen, Check, Circle as CircleIcon, Flag, Lock, RotateCcw, Sparkles } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import BottomSheet, { Dialog } from '../ui/BottomSheet';
import { Badge, PrepButton } from '../ui/primitives';
import { brand, colors, theme, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import prepApi from '../api';
import usePrep, { useRights } from '../store';

// ═══ Mini-cours (E24, § 12.1) ═══════════════════════════════════════════
export const MiniCoursSheet = ({ visible, miniCours, notion, onRetry, onSkip, onOpenLesson }) => {
  const [confirm, setConfirm] = useState(false);
  if (!miniCours) return null;
  return (
    <>
      <BottomSheet
        visible={visible && !confirm}
        maxHeight={0.8}
        onDismissRequest={() => { setConfirm(true); return false; }}
        onClose={() => setConfirm(true)}
        footer={<PrepButton title="Réessayer" iconLeft={RotateCcw} onPress={onRetry} />}
      >
        <Animated.View entering={FadeInDown.duration(300)} style={styles.row}>
          <Badge label="Rappel" tone="burgundy" />
          {notion ? <Text variant="caption" style={styles.muted} numberOfLines={1}>{notion}</Text> : null}
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(40).duration(300)} style={[theme.typography.h2, styles.title]}>{miniCours.titre}</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(300)} style={[type.reading, styles.body]}>{miniCours.corps}</Animated.Text>
        {miniCours.aRetenir ? (
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.retain}>
            <Text variant="h3" style={{ color: brand.goldInk }}>À retenir</Text>
            <Text variant="bodyMedium" style={{ color: brand.ink }}>{miniCours.aRetenir}</Text>
          </Animated.View>
        ) : null}
        {onOpenLesson ? <PrepButton title="Voir la leçon complète" variant="link" iconLeft={BookOpen} onPress={onOpenLesson} /> : null}
      </BottomSheet>
      <Dialog
        visible={visible && confirm}
        title="Passer la seconde chance ?"
        message="La question sera comptée fausse et ajoutée à ton cahier d’erreurs."
        cancelLabel="Revenir au rappel"
        confirmLabel="Passer"
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); onSkip(); }}
      />
    </>
  );
};

// ═══ Raisonnement et verdict IA (E25, § 12.2, § 13) ═════════════════════
const Thinking = () => {
  const reduce = useReduceMotion();
  const phrases = ['Lecture de ta démarche…', 'Comparaison avec les étapes clés…', 'Rédaction du retour…'];
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % phrases.length), 1300); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const Dot = ({ d }) => {
    const v = useSharedValue(0.3);
    useEffect(() => { if (!reduce) v.value = withDelay(d, withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })), -1)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.8 + v.value * 0.3 }] }));
    return <Animated.View style={[styles.dot, s]} />;
  };
  return (
    <View style={styles.thinking} accessibilityLiveRegion="polite">
      <View style={styles.dots}><Dot d={0} /><Dot d={140} /><Dot d={280} /></View>
      <Animated.Text key={i} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[theme.typography.body, styles.muted]}>{phrases[i]}</Animated.Text>
    </View>
  );
};

const VERDICTS = {
  exact: { label: 'Bien raisonné', color: colors.success, wash: colors.successWash },
  partiel: { label: 'Tu y es presque', color: colors.warning, wash: colors.warningWash },
  faux: { label: 'Reprenons la logique', color: colors.error, wash: colors.errorWash },
};

export const ReasoningSheet = ({ visible, exercice, programme, onClose, onSubscribe, onDone }) => {
  const rights = useRights();
  const useIA = usePrep((s) => s.useIA);
  const markFragile = usePrep((s) => s.markFragile);
  const [texte, setTexte] = useState('');
  const [step, setStep] = useState('saisie');
  const [result, setResult] = useState(null);
  useEffect(() => { if (visible) { setTexte(''); setStep('saisie'); setResult(null); } }, [visible, exercice?.code]);
  if (!exercice) return null;
  const locked = !rights.abonne && rights.iaRestantes <= 0;

  const verify = async () => {
    setStep('analyse');
    try {
      const out = await prepApi.reasoning(exercice.code, { texte, programme });
      if (out.disponible) {
        useIA();
        if (out.verdict === 'exact') haptic.success(); else haptic.warning();
        if (out.verdict !== 'exact') markFragile(programme, exercice.code, (exercice.notions || [])[0]);
      }
      setResult(out);
    } catch (error) {
      // Hors ligne ou service indisponible : démarche de référence, non décomptée (§ 13.4).
      setResult({ disponible: false, reference: exercice.raisonnement?.reference, etapesCles: exercice.raisonnement?.etapesCles || [], horsLigne: true });
    }
    setStep('verdict');
  };

  const v = result?.verdict ? VERDICTS[result.verdict] : null;
  const footer = step === 'saisie' && !locked ? (
    <View style={{ gap: 4 }}>
      <PrepButton title="Vérifier mon raisonnement" iconLeft={Sparkles} disabled={texte.trim().length < 10} onPress={verify} />
      <PrepButton title="Passer" variant="link" onPress={onClose} />
    </View>
  ) : step === 'verdict' ? <PrepButton title="Question suivante" onPress={() => { onDone?.(result); onClose(); }} /> : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.9} dismissible={step !== 'analyse'} footer={footer}>
      {locked ? (
        <View style={styles.lockedBox}>
          <View style={styles.lockIcon}><Sparkles size={26} color={brand.goldInk} /></View>
          <Text variant="h3" style={styles.center}>Vérification réservée aux abonnés</Text>
          <Text variant="body" style={[styles.muted, styles.center]}>Tes 3 vérifications offertes sont utilisées. Ta démarche reste importante : compare-la à la correction.</Text>
          <PrepButton title="S’abonner" variant="gold" onPress={onSubscribe} style={{ alignSelf: 'stretch' }} />
          <PrepButton title="Question suivante" variant="link" onPress={onClose} />
        </View>
      ) : null}

      {!locked && step !== 'verdict' ? (
        <View style={{ gap: 12 }}>
          <View style={styles.row}>
            <View style={styles.sparkle}><Sparkles size={14} color={brand.goldInk} /></View>
            <Text variant="h2" style={{ color: brand.ink }}>Explique ton raisonnement</Text>
          </View>
          <Text variant="caption" style={styles.muted}>Facultatif · vérifié par l’IA</Text>
          <Text variant="caption" style={styles.recall} numberOfLines={2}>{exercice.consigne}</Text>
          {step === 'saisie' ? (
            <>
              <TextInput
                value={texte}
                onChangeText={(t) => setTexte(t.slice(0, 1000))}
                multiline
                placeholder="J’ai d’abord… puis… donc…"
                placeholderTextColor={brand.inkMuted}
                style={styles.input}
                accessibilityLabel="Ton raisonnement"
              />
              <View style={styles.between}>
                {!rights.abonne ? (
                  <View style={styles.row}>
                    {[0, 1, 2].map((i) => <View key={i} style={[styles.quota, i < rights.iaRestantes && styles.quotaOn]} />)}
                    <Text variant="caption" style={styles.muted}>{`${rights.iaRestantes} vérification${rights.iaRestantes > 1 ? 's' : ''} offerte${rights.iaRestantes > 1 ? 's' : ''} restante${rights.iaRestantes > 1 ? 's' : ''}`}</Text>
                  </View>
                ) : <View />}
                <Text variant="caption" style={[styles.muted, type.tabular]}>{`${texte.length} / 1000`}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.quote}><Text variant="body" style={styles.quoteText}>{texte}</Text></View>
              <Thinking />
            </>
          )}
        </View>
      ) : null}

      {step === 'verdict' && result ? (
        <View style={{ gap: 14 }}>
          {v ? (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.verdict, { backgroundColor: v.wash }]}>
              <View style={[styles.verdictIcon, { backgroundColor: v.color }]}><Sparkles size={18} color="#FFF" /></View>
              <Text variant="h3" style={{ color: v.color }}>{v.label}</Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.verdict, { backgroundColor: brand.paperDim }]}>
              <Text variant="bodyMedium" style={{ color: brand.inkSoft, flex: 1 }}>
                {result.horsLigne ? 'Vérification disponible avec une connexion. Voici la démarche attendue — rien n’a été décompté.' : 'Vérification momentanément indisponible. Voici la démarche attendue — rien n’a été décompté.'}
              </Text>
            </Animated.View>
          )}
          <Text variant="h3" style={{ color: brand.ink }}>Étapes clés</Text>
          {(result.etapesCles || []).map((etape, i) => {
            const ok = result.etapesValidees?.includes(etape);
            return (
              <Animated.View key={etape} entering={FadeInDown.delay(120 * i).duration(260)} style={styles.stepRow}>
                {ok ? <View style={styles.stepOk}><Check size={12} color="#FFF" strokeWidth={3} /></View> : <CircleIcon size={20} color={brand.inkMuted} />}
                <Text variant="body" style={[styles.stepText, !ok && v && { color: brand.inkSoft }]}>{etape}</Text>
              </Animated.View>
            );
          })}
          <View style={styles.explBox}>
            <Text variant="body" style={{ color: brand.ink }}>{result.explication || result.reference}</Text>
          </View>
          {v ? (
            <PrepButton
              title="Je conteste ce verdict"
              variant="link"
              iconLeft={Flag}
              onPress={() => { prepApi.report({ element: exercice.code, motif: 'verdict', texte }).catch(() => {}); haptic.select(); }}
            />
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

// ═══ Verrou « Abonnés » (E37) ═══════════════════════════════════════════
export const LockedSheet = ({ visible, onClose, onSubscribe, message }) => (
  <BottomSheet visible={visible} onClose={onClose} maxHeight={0.6}>
    <View style={styles.lockedBox}>
      <View style={styles.lockIcon}><Lock size={24} color={brand.goldInk} /></View>
      <Text variant="h2" style={[styles.center, { color: brand.ink }]}>Réservé aux abonnés</Text>
      <Text variant="body" style={[styles.muted, styles.center]}>{message || 'Ton essai gratuit est terminé. Ta progression, ton cahier d’erreurs et ton rang sont conservés.'}</Text>
      <PrepButton title="Voir l’abonnement" variant="gold" onPress={onSubscribe} style={{ alignSelf: 'stretch' }} />
      <PrepButton title="Plus tard" variant="link" onPress={onClose} />
    </View>
  </BottomSheet>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: brand.inkSoft },
  center: { textAlign: 'center' },
  title: { color: brand.ink, marginTop: 12 },
  body: { color: brand.ink, marginTop: 8 },
  retain: { marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: brand.goldWash, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.35)', gap: 6 },
  sparkle: { width: 24, height: 24, borderRadius: 12, backgroundColor: brand.goldWash, alignItems: 'center', justifyContent: 'center' },
  recall: { color: brand.inkSoft, padding: 12, borderRadius: 14, backgroundColor: brand.paperDim },
  input: { minHeight: 160, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.sheet, textAlignVertical: 'top', color: brand.ink, fontFamily: theme.fontFamily.regular, fontSize: 16, lineHeight: 23 },
  quota: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: brand.gold },
  quotaOn: { backgroundColor: brand.gold },
  quote: { padding: 16, borderRadius: 16, backgroundColor: brand.paperDim },
  quoteText: { color: brand.inkSoft, fontStyle: 'italic' },
  thinking: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: brand.gold },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18 },
  verdictIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepOk: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepText: { flex: 1, color: brand.ink },
  explBox: { padding: 16, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, ...theme.shadows.soft },
  lockedBox: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  lockIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: brand.goldWash, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(180,138,72,0.4)' },
});
