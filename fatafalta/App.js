import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
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
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import BrandIntro from './src/components/brand/BrandIntro';
import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import useDownloadStore from './src/store/useDownloadStore';

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
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Hydrate offline downloads state
        await hydrateStore();
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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <NavigationContainer linking={linking}>
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
