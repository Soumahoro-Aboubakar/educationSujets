import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_FILENAME = 'edu_cache.json';

const isWeb = typeof window !== 'undefined' && Platform.OS === 'web';

const getFilePath = () => {
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  return `${dir}${CACHE_FILENAME}`;
};

export const save = async (key, value) => {
  try {
    if (isWeb) {
      window.localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    const filePath = getFilePath();
    let existing = {};
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        const raw = await FileSystem.readAsStringAsync(filePath);
        existing = JSON.parse(raw || '{}');
      }
    } catch (e) {
      existing = {};
    }

    existing[key] = value;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(existing));
  } catch (e) {
    // swallow errors — caching is best-effort
    // console.warn('Cache save failed', e);
  }
};

export const load = async (key) => {
  try {
    if (isWeb) {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }

    const filePath = getFilePath();
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(filePath);
    const parsed = JSON.parse(raw || '{}');
    return parsed[key] ?? null;
  } catch (e) {
    return null;
  }
};

export const remove = async (key) => {
  try {
    if (isWeb) {
      window.localStorage.removeItem(key);
      return;
    }

    const filePath = getFilePath();
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return;
    const raw = await FileSystem.readAsStringAsync(filePath);
    const parsed = JSON.parse(raw || '{}');
    delete parsed[key];
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(parsed));
  } catch (e) {
    // ignore
  }
};

export default { save, load, remove };
