import { Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/*
 * Les documents juridiques ne sont pas dupliqués dans l'application : le site en est la source
 * unique (une seule version en vigueur). Ils s'ouvrent dans le navigateur intégré, avec retour à
 * l'application ; en cas d'échec, dans le navigateur du téléphone.
 */
export const LEGAL_SITE = 'https://fatafalta.com';

export const LEGAL_DOCUMENTS = [
  { slug: 'conditions-utilisation', titre: 'Conditions générales d’utilisation', resume: 'Les règles d’usage du service' },
  { slug: 'conditions-vente', titre: 'Conditions générales d’abonnement', resume: 'Prix, durée, abonnement personnel' },
  { slug: 'politique-confidentialite', titre: 'Politique de confidentialité', resume: 'Tes données et tes droits' },
  { slug: 'politique-cookies', titre: 'Cookies et stockage local', resume: 'Ce que l’appareil conserve' },
  { slug: 'politique-securite', titre: 'Sécurité et utilisation acceptable', resume: 'Robots, tests, signaler une faille' },
  { slug: 'propriete-intellectuelle', titre: 'Propriété intellectuelle', resume: 'Contenus, droits, signalement' },
  { slug: 'mentions-legales', titre: 'Mentions légales', resume: 'Éditeur et contact' },
];

export const legalUrl = (slug) => `${LEGAL_SITE}/${slug}`;

export async function openLegal(slug) {
  const url = legalUrl(slug);
  try {
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Page indisponible', `Ouvre ${url} dans ton navigateur.`);
    }
  }
}
