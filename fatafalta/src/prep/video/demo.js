/**
 * Vidéos de DÉMONSTRATION — développement uniquement, pour tester l'interface :
 *   EXPO_PUBLIC_VIDEOS_DEMO=1 npx expo start --clear      (ou npm run start:videos-demo -- --clear)
 * Jamais actives dans une version publiée (__DEV__ faux). Vidéos YouTube publiques et intégrables
 * (vérifiées par oEmbed le 2026-11-07), sans lien avec Fatafalta : elles ne servent qu'à l'essai.
 * Les vraies vidéos viennent de GET /api/prep/videos, écrites par backend/scripts/video/publish.js.
 *
 * Une vidéo par LEÇON (affichée à l'ouverture de la leçon) ; une vidéo de présentation par concours.
 */
const v = (youtubeId, title, durationSec) => ({
  youtubeId,
  url: `https://www.youtube.com/watch?v=${youtubeId}`,
  title,
  durationSec,
  publishedAt: '2026-11-07T00:00:00.000Z',
  status: 'published',
});

export default {
  lecons: {
    // Module « Logarithme et exponentielle » : une vidéo pour chacune des deux leçons
    'MATH-LNEXP-L1': { fr: v('VJns0RfVWGg', 'LE COURS : Logarithme népérien - Terminale', 1095) },
    'MATH-LNEXP-L2': { fr: v('sCcy4IQKits', 'LE COURS : Fonction exponentielle - Terminale', 1354) },
    // Cours de langue : une vidéo par version de la leçon 1 (la leçon 2 n'en a pas)
    'ANG-GRAM-L1': {
      fr: v('PpRiS0LtOUs', 'Le Present Perfect en anglais enfin expliqué concrètement', 889),
      en: v('XGw2-p2WuJk', 'The Present Perfect Tense | English Grammar Lesson', 822),
    },
  },
  concours: {
    // Présentation d'un concours
    'ENSEA-AS': { fr: v('L3L2zw335uM', 'Corporate presentation of ENSEA', 212) },
  },
};
