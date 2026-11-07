/**
 * Vidéos de DÉMONSTRATION — développement uniquement, pour tester l'interface :
 *   EXPO_PUBLIC_VIDEOS_DEMO=1 npx expo start      (ou npm run start:videos-demo)
 * Jamais actives dans une version publiée (__DEV__ faux). Vidéos YouTube publiques et intégrables
 * (vérifiées par oEmbed le 2026-11-07), sans lien avec Fatafalta : elles ne servent qu'à l'essai.
 * Les vraies vidéos viennent de GET /api/prep/videos, écrites par backend/scripts/video/publish.js.
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
  modules: {
    // Module de mathématiques (version unique)
    'MATH-LNEXP': { fr: v('VJns0RfVWGg', 'LE COURS : Logarithme népérien - Terminale', 1095) },
    // Cours de langue : une vidéo par version
    'ANG-GRAM': {
      fr: v('PpRiS0LtOUs', 'Le Present Perfect en anglais enfin expliqué concrètement', 889),
      en: v('XGw2-p2WuJk', 'The Present Perfect Tense | English Grammar Lesson', 822),
    },
  },
  concours: {
    // Présentation d'un concours
    'ENSEA-AS': { fr: v('L3L2zw335uM', 'Corporate presentation of ENSEA', 212) },
  },
};
