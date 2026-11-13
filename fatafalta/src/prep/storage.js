import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage local de la préparation (copie de travail et file hors ligne, § 25.5).
 * SecureStore est limité à ~2 Ko par valeur : l'état complet va dans un fichier JSON
 * du répertoire de l'application ; le web (aperçu Expo) utilise localStorage.
 */
const FILE = `${FileSystem.documentDirectory || ''}fatafalta-prepa.v1.json`;
const BACKUP = `${FILE}.bak`;
const KEY = 'fatafalta-prepa.v1';
const isWeb = Platform.OS === 'web';

export const loadState = async () => {
  try {
    if (isWeb) {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const info = await FileSystem.getInfoAsync(FILE);
    if (info.exists) {
      try { return JSON.parse(await FileSystem.readAsStringAsync(FILE)); } catch (error) { /* copie de secours ci-dessous */ }
    }
    // Copie de secours : dernier état écrit avec succès (si le fichier principal est illisible).
    const backup = await FileSystem.getInfoAsync(BACKUP);
    return backup.exists ? JSON.parse(await FileSystem.readAsStringAsync(BACKUP)) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Jeton d'identité de préparation (lot 5) : hors du fichier JSON, dans le trousseau sécurisé
 * (SecureStore) ; localStorage sur l'aperçu web.
 */
const TOKEN_KEY = 'fatafaltaPrepToken';
export const loadToken = async () => {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) || null;
    return (await SecureStore.getItemAsync(TOKEN_KEY)) || null;
  } catch (error) {
    return null;
  }
};
export const saveToken = async (token) => {
  try {
    if (isWeb) { if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token); else globalThis.localStorage?.removeItem(TOKEN_KEY); return true; }
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token); else await SecureStore.deleteItemAsync(TOKEN_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

let pending = null;
let timer = null;
let storageError = null;
/** Dernière erreur d'écriture locale (stockage plein…), `null` si la dernière écriture a réussi. */
export const lastStorageError = () => storageError;

/** Écriture immédiate (passage en arrière-plan) : n'attend pas le regroupement de 400 ms. */
export const flushState = async () => {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
  const snapshot = pending;
  pending = null;
  await writeNow(snapshot);
};

// Écritures sérialisées : deux sauvegardes ne se croisent jamais sur le fichier temporaire.
let chain = Promise.resolve();
const writeNow = (snapshot) => { chain = chain.then(() => write(snapshot)); return chain; };
const write = async (snapshot) => {
  try {
    const raw = JSON.stringify(snapshot);
    if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
    else {
      // Écriture dans un fichier temporaire, puis remplacement ; l'ancienne version devient la
      // copie de secours. Un arrêt brutal ne laisse jamais un fichier principal tronqué.
      await FileSystem.writeAsStringAsync(`${FILE}.tmp`, raw);
      if ((await FileSystem.getInfoAsync(FILE)).exists) {
        await FileSystem.deleteAsync(BACKUP, { idempotent: true });
        await FileSystem.moveAsync({ from: FILE, to: BACKUP });
      }
      await FileSystem.moveAsync({ from: `${FILE}.tmp`, to: FILE });
    }
    storageError = null;
  } catch (error) {
    // Stockage plein ou indisponible : l'état reste en mémoire ; signalé à l'écran (lastStorageError).
    storageError = error?.message || 'stockage indisponible';
  }
};

/** Écriture regroupée (≤ 1 par 400 ms) : l'état change à chaque geste pendant une session. */
export const saveState = (state) => {
  pending = state;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const snapshot = pending;
    pending = null;
    writeNow(snapshot);
  }, 400);
};

export const clearState = async () => {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else {
      await FileSystem.deleteAsync(FILE, { idempotent: true });
      await FileSystem.deleteAsync(BACKUP, { idempotent: true });
    }
    await saveToken(null);
  } catch (error) { /* rien à effacer */ }
};
