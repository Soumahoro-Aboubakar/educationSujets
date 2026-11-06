/**
 * Aperçu web uniquement (voir metro.config.js) : expo-secure-store n'existe pas sur le web.
 * Même API minimale, adossée à localStorage. Sur Android et iOS, le vrai module est utilisé.
 */
const get = (key) => { try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; } };
const set = (key, value) => { try { globalThis.localStorage?.setItem(key, value); } catch { /* indisponible */ } };
const del = (key) => { try { globalThis.localStorage?.removeItem(key); } catch { /* indisponible */ } };

export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
export const isAvailableAsync = async () => true;
export const getItemAsync = async (key) => get(key);
export const getItem = (key) => get(key);
export const setItemAsync = async (key, value) => set(key, value);
export const setItem = (key, value) => set(key, value);
export const deleteItemAsync = async (key) => del(key);
export default { AFTER_FIRST_UNLOCK, AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY, WHEN_UNLOCKED, isAvailableAsync, getItemAsync, getItem, setItemAsync, setItem, deleteItemAsync };
