import { Dimensions, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Identifiants de rapprochement de l'appareil (§ 25.4) — jamais d'IMEI, de numéro de série
 * ni d'adresse MAC (interdits par Apple et Google).
 *  - appareilId : UUID aléatoire conservé dans le Trousseau iOS (survit à la désinstallation)
 *    ou le Keystore Android via SecureStore ;
 *  - androidId : ANDROID_ID (stable pour une même application et un même appareil) ;
 *  - vendorId : identifierForVendor (iOS).
 */
const KEY = 'fatafalta.prep.appareil';

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.floor(Math.random() * 16);
  return (c === 'x' ? r : ((r % 4) + 8)).toString(16);
});

const readStore = async () => {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) || null;
  try { return await SecureStore.getItemAsync(KEY, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }); } catch { return null; }
};

const writeStore = async (value) => {
  if (Platform.OS === 'web') { globalThis.localStorage?.setItem(KEY, value); return; }
  try { await SecureStore.setItemAsync(KEY, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }); } catch { /* indisponible */ }
};

let Application = null;
try {
  // eslint-disable-next-line global-require
  Application = require('expo-application');
} catch (error) {
  Application = null;
}

export const deviceIdentifiers = async () => {
  let appareilId = await readStore();
  if (!appareilId) {
    appareilId = uuid();
    await writeStore(appareilId);
  }
  let androidId = null;
  let vendorId = null;
  try {
    if (Platform.OS === 'android') androidId = Application?.getAndroidId?.() || null;
    if (Platform.OS === 'ios') vendorId = (await Application?.getIosIdForVendorAsync?.()) || null;
  } catch (error) { /* module natif absent (ancienne version installée) */ }
  const { width, height, scale } = Dimensions.get('screen');
  const empreinte = [Platform.OS, Platform.Version, Math.round(width), Math.round(height), scale, Intl.DateTimeFormat?.().resolvedOptions?.().locale].join('|');
  return { appareilId, androidId, vendorId, empreinte };
};
