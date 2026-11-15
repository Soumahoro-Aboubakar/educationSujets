/**
 * Vidéos de DÉMONSTRATION — développement uniquement, pour tester l'interface :
 *   EXPO_PUBLIC_VIDEOS_DEMO=1 npx expo start --clear      (ou npm run start:videos-demo -- --clear)
 * Jamais actives dans une version publiée (__DEV__ faux). Vidéos YouTube publiques et intégrables
 * (vérifiées par oEmbed le 2026-11-07), sans lien avec Fatafalta : elles ne servent qu'à l'essai.
 * Les vraies vidéos viennent de GET /api/prep/videos, écrites par backend/scripts/video/publish.js.
 *
 * Une vidéo par LEÇON (affichée à l'ouverture de la leçon) ; une vidéo de présentation par concours.
 */
const v = (youtubeId, title, durationSec, auteur) => ({
  youtubeId,
  ...(auteur ? { auteur } : {}),
  url: `https://www.youtube.com/watch?v=${youtubeId}`,
  title,
  durationSec,
  publishedAt: '2026-11-07T00:00:00.000Z',
  status: 'published',
});

export default {
  lecons: {
    // Module « Logarithme et exponentielle » : vidéos externes réellement sélectionnées (pilote du
    // 2026-11-15, backend/data/prep/videos-externes/selections.json), créditées à leur chaîne.
    'MATH-LNEXP-L1': { fr: v('FBmVDGvUtJ4', 'Appliquer les formules sur les puissances - Seconde', 385, 'Yvan Monka') },
    'MATH-LNEXP-L3': { fr: v('HGrK77-SCl4', 'Appliquer les formules sur les logarithmes - Terminale', 458, 'Yvan Monka') },
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
