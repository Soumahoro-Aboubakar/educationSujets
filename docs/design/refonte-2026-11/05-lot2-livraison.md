# Lot 2 — Leçon, exercices et bilans

Implémentation du 8 novembre 2026. Compilation et contrôles de code validés ; validation visuelle sur appareil encore nécessaire. Chrome/Playwright s’arrête au lancement dans le sandbox (`SIGABRT`, `EPERM`) : aucune capture après modification ni mesure de fluidité native n’a pu être validée.

## Décisions de design

- **Lecture** : colonne de 24 pt, double filet bordeaux dans la marge, rythme de 24 pt entre blocs. Le tableau mesure sa colonne, la remplit et devient défilable horizontalement quand sa largeur minimale dépasse l’espace disponible. Indication de défilement et adaptation à la taille du texte.
- **Annotations** : À retenir, Piège fréquent et Exemple partagent le même traitement : deux filets fins, titre Playfair italique, espace intérieur cohérent. Le récapitulatif conserve son contraste fort sur encre.
- **Exercices** : le bouton désactivé donne la consigne de saisie. Sélection QCM bordeaux 1,5 pt avec lettre pleine ; lettres adaptées au texte système. La correction révélée barre le choix faux en rouge et entoure le bon en vert. Les commentaires sont en Playfair italique bordeaux, avec coche verte pour un succès. Les explications restent intégralement défilables.
- **Moments de fin** : tampon dessiné en code, double cadre, capitales Playfair espacées, or sur encre / goldInk sur papier, rotation −6°. Pose de 1,15 à 1 en 220 ms. Une seule action principale ; retour et reprise deviennent des actions compactes de troisième niveau. Tout le bilan, actions comprises, peut défiler en grand texte.
- **Module** : leçons et niveaux en lignes de parcours, double marge, numéros d’état et chevrons du lot 1. Coin corné réservé aux leçons terminées et niveaux validés. Le module validé porte un tampon statique.
- **Mouvement** : retour de correction par tracé de 180 ms et célébration par tampon de 220 ms, uniquement en transform sur Reanimated. Le tampon et le tracé sont immédiatement statiques lorsque les animations sont réduites. Le tampon ne rejoue pas pour le même événement pendant la vie de l’app ; aucun indicateur persistant n’est ajouté au store. L’événement existant de validation du module commande le tampon « Maîtrisé » du bilan.

## Fichiers

| Fichier dans `fatafalta/src/prep/` | Changement |
| --- | --- |
| `screens/ModuleLessonScreens.js` | Parcours du module, lecteur et fin de leçon |
| `components/LessonBlocks.js` | Tableau adaptatif, annotations et mini-question |
| `screens/SessionScreen.js` | Retour du correcteur, bouton de saisie et bilan |
| `exercises/Choice.js` | Sélection, trait rouge, cercle vert et libellés accessibles |
| `exercises/kit.js` | Secousse existante désactivée avec Réduire les animations |
| `components/StudyPresentation.js` | Double marge, tampon, trait, annotation et annonces de résultat |

La vidéo, le réglage de taille du texte, le drapeau, les secondes chances, la vérification IA et les actions Lire / Terminer la leçon restent présents. La première erreur conserve le rappel sans révéler la solution ; les marques de correction utilisent uniquement les résultats déjà exposés par le moteur.

## Vérifications

- `node --test tests/*.cjs` : **26/26**.
- Export Android : **réussi**, `/tmp/fatafalta-lot2`.
- Exports complémentaires iOS et web : **réussis**, `/tmp/fatafalta-lot2-ios` et `/tmp/fatafalta-lot2-web`.
- Exports lancés avec `EXPO_NO_DOTENV=1`.
- Comparaison AST avec les fichiers présents avant ce lot : traitements de vérification, seconde chance, session, sauvegarde, appels core/store/API/navigation et contrats des renderers inchangés.
- Contrôles de composants avec environnement simulé : tampon unique, réduction des mouvements, sélection et correction QCM, largeur du tableau à 100 % / 200 %, rappel sans révélation, actions IA, hiérarchie du bilan. Ces contrôles ne remplacent pas le rendu natif.
- `git diff --check` : réussi. Aucune dépendance ajoutée, aucun commit.

## À regarder à l’écran

1. Leçon logarithme : tableau aligné avec les paragraphes ; défilement horizontal au besoin ; annotations et récapitulatif.
2. Mini-question : consigne désactivée, sélection A–D, réponse fausse barrée et bonne réponse entourée.
3. Session : première erreur → rappel → seconde chance ; correction finale complète et accès au raisonnement IA.
4. Fin de leçon et session : pose unique du tampon, synchronisation haptique, trois niveaux d’actions. Module validé : tampon « Maîtrisé » et coins cornés.
5. Petit Android, texte système à 200 %, VoiceOver/TalkBack et Réduire les animations : absence de troncature bloquante, annonces, accès aux actions par défilement et fluidité en build release.
