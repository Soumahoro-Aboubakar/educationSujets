import 'react-native-gesture-handler';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
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
import BrandIntro from './src/components/brand/BrandIntro';
import AuthContext, { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import useDownloadStore from './src/store/useDownloadStore';
import usePrep from './src/prep/store';
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
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') usePrep.getState().flush(); });
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
  return Platform.OS === 'android' ? <NavigationBar hidden style="dark" /> : null;
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  // Intro animée : jouée une fois par lancement à froid, jamais au retour d'un autre écran.
  const [introVisible, setIntroVisible] = useState(true);
  const hydrateStore = useDownloadStore((state) => state.hydrate);

  let [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Playfair-SemiBold': PlayfairDisplay_600SemiBold,
    'Playfair-Bold': PlayfairDisplay_700Bold,
    'Playfair-BoldItalic': PlayfairDisplay_700Bold_Italic,
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Hydrate offline downloads state
        await hydrateStore();
        // Copie locale de la préparation (identité, progression, file hors ligne).
        await usePrep.getState().hydrate();
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Le splash natif est masqué par BrandIntro dès sa première mise en page,
  // pour que l'intro prenne le relais sans écran vide entre les deux.

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ImmersiveNavigationBar />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <PrepBridge />
            {/* Web/PWA : sans formatter, React Navigation met le nom technique de l'écran
                (« ExploreTab ») en titre d'onglet, repris par « Sur l'écran d'accueil » d'iOS. */}
            <NavigationContainer linking={linking} documentTitle={{ formatter: () => 'Fatafalta' }}>
              <RootNavigator />
            </NavigationContainer>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
      {introVisible ? <BrandIntro onFinish={() => setIntroVisible(false)} /> : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
