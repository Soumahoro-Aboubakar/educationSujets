import 'react-native-gesture-handler';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme, useThemePreference } from './src/theme/ThemeProvider';
import ThemeStatusBar from './src/theme/ThemeStatusBar';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
// Import par graisse : seules les 5 graisses utilisées sont embarquées (et non les 18 du paquet).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
// Serif d'apparat (titres, chiffres héros) : Playfair Display, 3 graisses seulement.
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display/700Bold_Italic';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationBar } from 'expo-navigation-bar';
import RootNavigator from './src/navigation/RootNavigator';
import LaunchExperience from './src/launch/LaunchExperience';
import useLaunchReadiness from './src/launch/useLaunchReadiness';
import { launch as launchColors } from './src/theme/brand';
import AuthContext, { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import usePrep from './src/prep/store';
import { flushState } from './src/prep/storage';
import prepApi, { setPrepToken } from './src/prep/api';
import { useEntitlements } from './src/hooks/useAccount';

/**
 * Pont entre le compte et la préparation : statut d'abonné (même abonnement, § 24) et
 * rattachement de l'identité appareil au compte à la connexion (§ 25.5).
 */
const PrepBridge = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const entitlements = useEntitlements();
  const setAbonneLocal = usePrep((s) => s.setAbonneLocal);
  const token = usePrep((s) => s.token);
  const attached = useRef(false);
  useEffect(() => {
    setAbonneLocal(isAuthenticated && entitlements.data?.subscription?.status === 'ACTIVE');
  }, [isAuthenticated, entitlements.data?.subscription?.status, setAbonneLocal]);
  useEffect(() => {
    if (!isAuthenticated) { attached.current = false; return; }
    if (!token || attached.current) return;
    attached.current = true;
    prepApi.attach().then((out) => {
      if (!out?.token) return;
      setPrepToken(out.token);
      usePrep.setState({ token: out.token, identite: out.identite });
      usePrep.getState().persist();
      usePrep.getState().flush();
    }).catch(() => { attached.current = false; });
  }, [isAuthenticated, token]);
  // Retour au premier plan : envoi des réponses faites hors ligne (§ 22).
  useEffect(() => {
    // Retour au premier plan : envoi des réponses en file, puis contenus publiés depuis la dernière ouverture.
    const sub = AppState.addEventListener('change', (state) => {
      // Arrière-plan : écriture locale immédiate (l'OS peut arrêter l'app sans prévenir).
      if (state === 'background' || state === 'inactive') { flushState(); return; }
      if (state !== 'active') return;
      usePrep.getState().flush();
      usePrep.getState().pullProgress();
      usePrep.getState().refreshContent();
    });
    return () => sub.remove();
  }, []);
  return null;
};

/**
 * Barre de navigation Android (boutons système) masquée en mode immersif dans toute l'application :
 * un glissement depuis le bord bas la fait réapparaître un instant (Android ne permet pas de la
 * supprimer). Réappliqué au retour au premier plan, Android la réaffichant parfois (clavier, feuilles).
 * Aussi déclaré dans app.json (plugin expo-navigation-bar) pour être masquée dès le lancement.
 */
const ImmersiveNavigationBar = () => {
  const { isDark } = useTheme();
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    NavigationBar.setHidden(true);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Forcer la réapplication : la valeur mémorisée peut être déjà « masquée ».
        NavigationBar.setHidden(false);
        NavigationBar.setHidden(true);
      }
    });
    return () => sub.remove();
  }, []);
  return Platform.OS === 'android' ? <NavigationBar hidden style={isDark ? "light" : "dark"} /> : null;
};

/*
 * Démarrage en deux temps, sans écran vide entre les deux :
 *  1. le splash natif (app.json → expo-splash-screen) s'affiche dès le lancement du processus,
 *     avant JavaScript : l'encre et le F « éteint » ;
 *  2. l'expérience de lancement (src/launch) le masque dès qu'elle est posée — sa première image
 *     est identique — puis joue pendant que l'application se prépare réellement dessous.
 */
SplashScreen.preventAutoHideAsync();
// Relais natif → animé en fondu court : il absorbe l'écart d'un pixel éventuel entre les deux rendus.
if (!isRunningInExpoGo()) SplashScreen.setOptions({ duration: 180, fade: true });

// Retour de l'app au premier plan (ex. après un paiement sur le site) = « focus » pour React
// Query : les requêtes qui l'acceptent (état du compte) sont relues auprès du serveur.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
  return () => subscription.remove();
});

/*
 * Liens directs vers un sujet (partage, Google, assistant IA) : la fiche s'ouvre dans l'application,
 * l'accueil est placé dessous pour que « Retour » y mène. Même adresse que le site web.
 */
const linking = {
  prefixes: [Linking.createURL('/'), 'https://fatafalta.com', 'https://www.fatafalta.com', 'https://fatafalta.onrender.com'],
  config: {
    initialRouteName: 'MainTabs',
    screens: {
      DocumentDetail: 'sujets/document/:documentId',
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemedNavigation({ children, onReady }) {
  const { isDark, brand } = useTheme();
  const navigationTheme = React.useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: brand.burgundy, background: brand.paper, card: brand.sheet, text: brand.ink, border: brand.line, notification: brand.burgundy } };
  }, [isDark, brand]);
  return <NavigationContainer theme={navigationTheme} linking={linking} onReady={onReady} documentTitle={{ formatter: () => 'Fatafalta' }}>{children}</NavigationContainer>;
}

export default function App() {
  return <PreferencesProvider><ThemeProvider><AppContent /></ThemeProvider></PreferencesProvider>;
}

function AppContent() {
  const { isDark, brand } = useTheme();
  const { isReady: isThemeReady } = useThemePreference();
  // Expérience de lancement : jouée une fois par démarrage, jamais au retour d'un autre écran.
  const [launchVisible, setLaunchVisible] = useState(true);
  const hideLaunch = useCallback(() => setLaunchVisible(false), []);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Playfair-SemiBold': PlayfairDisplay_600SemiBold,
    'Playfair-Bold': PlayfairDisplay_700Bold,
    'Playfair-BoldItalic': PlayfairDisplay_700Bold_Italic,
  });

  // Préférences, polices, fichiers hors ligne, copie locale de la préparation, navigation :
  // le démarrage réel, suivi étape par étape (aucune ne dépend du réseau).
  const launch = useLaunchReadiness({ preferencesReady: isThemeReady, fontsLoaded, fontError });

  return (
    <GestureHandlerRootView
      style={[
        styles.container,
        // Encre sous l'expérience de lancement : aucun éclair clair possible avant le premier écran.
        launchVisible ? { backgroundColor: launchColors.base } : isDark && { backgroundColor: brand.paper },
      ]}
    >
      {launch.core ? (
        <>
          <ThemeStatusBar barStyle="default" />
          <ImmersiveNavigationBar />
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <PrepBridge />
                {/* Web/PWA : sans formatter, React Navigation met le nom technique de l'écran
                    (« ExploreTab ») en titre d'onglet, repris par « Sur l'écran d'accueil » d'iOS. */}
                <ThemedNavigation onReady={launch.onNavigationReady}>
                  <RootNavigator />
                </ThemedNavigation>
            </AuthProvider>
          </QueryClientProvider>
        </>
      ) : null}
      {launchVisible ? (
        <LaunchExperience
          ready={launch.ready}
          progress={launch.progress}
          fault={launch.fault}
          slow={launch.slow}
          onRetry={launch.retry}
          onFinish={hideLaunch}
          fontsReady={fontsLoaded}
        />
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
