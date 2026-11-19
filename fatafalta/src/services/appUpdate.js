import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import api from './api';

/*
 * Mise à jour de l'application, pilotée depuis l'administration (GET /api/app/version/:plateforme) :
 * - « required » : l'application installée est plus ancienne que la version publiée → écran bloquant ;
 * - « recommended » : message qu'on peut fermer, une seule fois par version publiée ;
 * - « none » ou application à jour : rien.
 * Le numéro de build (versionCode Android, CFBundleVersion iOS) sert de comparaison : il augmente à
 * chaque publication, contrairement au numéro affiché.
 */

const DISMISS_KEY = 'fatafalta.maj.ignoree';

export const installedBuild = () => {
  const build = Number.parseInt(Application.nativeBuildVersion, 10);
  return Number.isFinite(build) ? build : null;
};

/** Décision pure : 'none' | 'recommended' | 'required'. */
export const decideUpdate = ({ installed, policy, dismissedBuild = null }) => {
  if (!policy || !installed || !policy.latestBuild || installed >= policy.latestBuild) return 'none';
  if (policy.mode === 'required') return 'required';
  if (policy.mode === 'recommended' && Number(dismissedBuild) !== policy.latestBuild) return 'recommended';
  return 'none';
};

export const fetchPolicy = async () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  const { data } = await api.get(`/api/app/version/${Platform.OS}`);
  return data?.data || null;
};

export const readDismissed = async () => {
  try { return await SecureStore.getItemAsync(DISMISS_KEY); } catch (error) { return null; }
};

export const rememberDismissed = async (build) => {
  try { await SecureStore.setItemAsync(DISMISS_KEY, String(build)); } catch (error) { /* rien : le message reviendra */ }
};

/** Lien du magasin : application Play Store si possible, sinon la page web officielle. */
export const storeLinks = (policy) => {
  const web = policy?.storeUrl || '';
  if (Platform.OS === 'android') {
    const id = /[?&]id=([\w.]+)/.exec(web)?.[1] || Application.applicationId || 'com.fatafalta.mobile';
    return [`market://details?id=${id}`, web || `https://play.google.com/store/apps/details?id=${id}`];
  }
  return [web].filter(Boolean);
};
