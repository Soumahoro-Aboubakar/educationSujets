import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Linking, Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isRunningInExpoGo } from 'expo';
import { ArrowUpRight } from 'lucide-react-native';
import Text from './ui/Text';
import { useTheme, createThemedStyles } from '../theme/ThemeProvider';
import { NightBackground, PrepButton } from '../prep/ui/primitives';
import ART from '../prep/ui/art';
import { type } from '../prep/theme';
import { haptic, useReduceMotion } from '../prep/feedback';
import { decideUpdate, fetchPolicy, installedBuild, readDismissed, rememberDismissed, storeLinks } from '../services/appUpdate';

/*
 * Écran « moment » de mise à jour (politique réglée dans l'administration) : fond nuit, emblème,
 * panneau papier en bas. Obligatoire : aucun moyen de le fermer (retour Android compris) tant que
 * l'application n'est pas mise à jour. Conseillée : « Plus tard », une seule fois par version.
 * Vérifié au lancement puis au retour au premier plan (au plus toutes les 10 minutes).
 */
const RECHECK_MS = 10 * 60 * 1000;
// Aperçu en développement uniquement : EXPO_PUBLIC_UPDATE_PREVIEW=required (ou recommended).
const PREVIEW = __DEV__ ? process.env.EXPO_PUBLIC_UPDATE_PREVIEW : null;

const AppUpdateGate = () => {
  const [state, setState] = useState({ decision: 'none', policy: null });
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (PREVIEW === 'required' || PREVIEW === 'recommended') {
      setState({ decision: PREVIEW, policy: { latestBuild: 99, latestVersion: '1.2.0', mode: PREVIEW, message: '' } });
      return;
    }
    if (isRunningInExpoGo()) return; // Expo Go : son numéro de build n'est pas celui de Fatafalta.
    if (Date.now() - lastCheck.current < RECHECK_MS) return;
    lastCheck.current = Date.now();
    try {
      const [policy, dismissedBuild] = await Promise.all([fetchPolicy(), readDismissed()]);
      const decision = decideUpdate({ installed: installedBuild(), policy, dismissedBuild });
      setState({ decision, policy });
      if (decision !== 'none') haptic.select?.();
    } catch (error) {
      lastCheck.current = 0; // Hors ligne : on réessaiera au prochain retour dans l'application.
    }
  }, []);

  useEffect(() => {
    check();
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') check(); });
    return () => subscription.remove();
  }, [check]);

  const { decision, policy } = state;
  const required = decision === 'required';

  const openStore = async () => {
    for (const url of storeLinks(policy)) {
      try { await Linking.openURL(url); return; } catch (error) { /* lien suivant */ }
    }
  };
  const later = async () => {
    await rememberDismissed(policy?.latestBuild);
    setState({ decision: 'none', policy });
  };

  if (decision === 'none') return null;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={required ? () => {} : later}>
      {/* Une fenêtre modale a son propre arbre : elle a besoin de son fournisseur de zones sûres. */}
      <SafeAreaProvider>
        <UpdateScreen policy={policy} required={required} onUpdate={openStore} onLater={later} />
      </SafeAreaProvider>
    </Modal>
  );
};

const UpdateScreen = ({ policy, required, onUpdate, onLater }) => {
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const version = policy?.latestVersion ? `Version ${policy.latestVersion}` : null;
  return (
    <View style={styles.root} accessibilityViewIsModal>
      <NightBackground />
      <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        <Animated.View entering={reduce ? FadeIn.duration(150) : FadeInDown.duration(420)}>
          <Image source={ART.emblem} style={styles.emblem} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
        <Text style={[type.hero, styles.title]} accessibilityRole="header">
          {required ? 'Une mise à jour est nécessaire' : 'Une nouvelle version est disponible'}
        </Text>
        {version ? <Text variant="caption" style={styles.version}>{version}</Text> : null}
      </View>
      <Animated.View entering={reduce ? FadeIn.duration(150) : FadeInDown.delay(80).duration(420)} style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.body}>
          {policy?.message || (required
            ? 'Cette version de Fatafalta n’est plus prise en charge. Installe la mise à jour pour continuer : ta progression est conservée.'
            : 'Installe la mise à jour pour profiter des dernières améliorations. Ta progression est conservée.')}
        </Text>
        <PrepButton title="Mettre à jour" icon={ArrowUpRight} onPress={onUpdate} accessibilityLabel="Mettre à jour Fatafalta" />
        {required ? null : <PrepButton title="Plus tard" variant="link" onPress={onLater} style={styles.secondary} />}
      </Animated.View>
    </View>
  );
};

const useStyles = createThemedStyles(({ brand }) => ({
  styles: StyleSheet.create({
    root: { flex: 1, justifyContent: 'space-between', backgroundColor: brand.inkDeep },
    hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
    emblem: { width: 148, height: 148 },
    title: { color: brand.onInk, textAlign: 'center' },
    version: { color: brand.onInkSoft },
    panel: { backgroundColor: brand.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, gap: 14 },
    body: { color: brand.inkSoft, fontSize: 15, lineHeight: 22, marginBottom: 6 },
    secondary: { marginTop: 2 },
  }),
}));

export default AppUpdateGate;
