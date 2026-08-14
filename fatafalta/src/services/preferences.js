import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PREFERENCES_KEY = 'fatafalta.orientation-preferences.v1';

export const DEFAULT_PREFERENCES = {
  hasCompletedOrientation: false,
  establishment: null,
  contest: null,
  selectedContentType: null,
};

const isWeb = Platform.OS === 'web';

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

/**
 * Reads the user orientation once, before the navigator is rendered.
 * SecureStore is used on device; localStorage keeps the Expo web preview useful.
 */
export const getPreferences = async () => {
  try {
    const raw = isWeb
      ? globalThis.localStorage?.getItem(PREFERENCES_KEY)
      : await SecureStore.getItemAsync(PREFERENCES_KEY);
    return { ...DEFAULT_PREFERENCES, ...(safeParse(raw) || {}) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const savePreferences = async (preferences) => {
  const serialized = JSON.stringify(preferences);

  if (isWeb) {
    globalThis.localStorage?.setItem(PREFERENCES_KEY, serialized);
    return;
  }

  await SecureStore.setItemAsync(PREFERENCES_KEY, serialized);
};

export const clearPreferences = async () => {
  if (isWeb) {
    globalThis.localStorage?.removeItem(PREFERENCES_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(PREFERENCES_KEY);
};
