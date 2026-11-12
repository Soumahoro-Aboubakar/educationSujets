import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { lightPalette, darkPalette } from './tokens';
import { createPrepPalette } from '../prep/theme';
import { usePreferences } from '../context/PreferencesContext';

// La copie s'ouvre en clair, même si le système est sombre. La préférence
// hydratée prend le relais avant l'affichage du navigateur.
if (Platform.OS !== 'web') Appearance.setColorScheme('light');

export const lightTheme = { ...lightPalette, ...createPrepPalette(lightPalette) };
export const nightTheme = { ...darkPalette, ...createPrepPalette(darkPalette) };
const ThemeContext = createContext(lightTheme);
const ThemePreferenceContext = createContext(null);

/** Préférence de présentation uniquement ; aucune clé ne remonte le navigateur. */
export function ThemeProvider({ children }) {
  const { preferences, isPreferencesReady, updatePreferences } = usePreferences();
  const [selectedMode, setSelectedMode] = useState(null);
  const mode = selectedMode ?? (preferences.appearance === 'dark' ? 'dark' : 'light');
  const [saveError, setSaveError] = useState(false);
  const pendingWrite = useRef(Promise.resolve());
  const revision = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(mode);
  }, [mode]);

  const setMode = useCallback((nextMode) => {
    if (nextMode !== 'light' && nextMode !== 'dark') return;
    const currentRevision = ++revision.current;
    const previousMode = selectedMode ?? (preferences.appearance === 'dark' ? 'dark' : 'light');
    setSelectedMode(nextMode);
    setSaveError(false);
    // Le rendu change tout de suite. Les écritures locales suivent l'ordre
    // des appuis, même si SecureStore répond lentement.
    const saved = pendingWrite.current.then(() => updatePreferences({ appearance: nextMode }));
    pendingWrite.current = saved.catch(() => {});
    return saved.catch((error) => { if (revision.current === currentRevision) { setSelectedMode(previousMode); setSaveError(error); } });
  }, [updatePreferences, selectedMode, preferences.appearance]);
  const preference = useMemo(() => ({ mode, setMode, isReady: isPreferencesReady, saveError }), [mode, setMode, isPreferencesReady, saveError]);

  return <ThemePreferenceContext.Provider value={preference}>
    <ThemeContext.Provider value={mode === 'dark' ? nightTheme : lightTheme}>{children}</ThemeContext.Provider>
  </ThemePreferenceContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useThemePreference = () => useContext(ThemePreferenceContext);

/** Deux feuilles de styles au plus par module, partagées par toutes ses instances. */
export function createThemedStyles(factory) {
  const cache = new WeakMap();
  return function useThemedStyles() {
    const palette = useTheme();
    if (!cache.has(palette)) cache.set(palette, factory(palette));
    return cache.get(palette);
  };
}
