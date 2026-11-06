import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Stockage local de la préparation (copie de travail et file hors ligne, § 25.5).
 * SecureStore est limité à ~2 Ko par valeur : l'état complet va dans un fichier JSON
 * du répertoire de l'application ; le web (aperçu Expo) utilise localStorage.
 */
const FILE = `${FileSystem.documentDirectory || ''}fatafalta-prepa.v1.json`;
const KEY = 'fatafalta-prepa.v1';
const isWeb = Platform.OS === 'web';

export const loadState = async () => {
  try {
    if (isWeb) {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(FILE));
  } catch (error) {
    return null;
  }
};

let pending = null;
let timer = null;

/** Écriture regroupée (≤ 1 par 400 ms) : l'état change à chaque geste pendant une session. */
export const saveState = (state) => {
  pending = state;
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    const snapshot = pending;
    pending = null;
    try {
      const raw = JSON.stringify(snapshot);
      if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
      else await FileSystem.writeAsStringAsync(FILE, raw);
    } catch (error) {
      // Stockage plein ou indisponible : l'état reste en mémoire et sur le serveur.
    }
  }, 400);
};

export const clearState = async () => {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else await FileSystem.deleteAsync(FILE, { idempotent: true });
  } catch (error) { /* rien à effacer */ }
};
