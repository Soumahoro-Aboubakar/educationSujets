import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Keyboard } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import { 
  useFonts, 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold, 
  Inter_800ExtraBold 
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import useDownloadStore from './src/store/useDownloadStore';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  useEffect(() => {
    const hideSystemNavigationBar = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      try {
        // 1. Cacher la barre
        await NavigationBar.setVisibilityAsync('hidden');
        // 2. Comportement : 'overlay-swipe' permet de faire réapparaître la barre 
        // temporairement si l'utilisateur glisse depuis le bas, puis elle se recache.
        await NavigationBar.setBehaviorAsync('overlay-swipe');
        // 3. Position absolue pour que la barre ne déforme pas votre layout 
        // quand elle décide de s'afficher (elle se superposera au lieu de pousser le contenu)
        await NavigationBar.setPositionAsync('absolute');
      } catch (error) {
        console.warn('Unable to hide Android navigation bar:', error);
      }
    };

    hideSystemNavigationBar();

    // Réappliquer le masquage quand l'app revient au premier plan
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hideSystemNavigationBar();
      }
    });

    // Réappliquer le masquage quand le clavier se ferme (Android la fait souvent réapparaître)
    const keyboardSubscription = Keyboard.addListener('keyboardDidHide', () => {
      hideSystemNavigationBar();
    });

    return () => {
      appStateSubscription.remove();
      keyboardSubscription.remove();
    };
  }, []);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});