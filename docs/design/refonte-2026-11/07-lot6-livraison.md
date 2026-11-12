# Lot 6 — Parcours d’entrée

Implémentation du 9 novembre 2026. Rendu uniquement ; validation visuelle sur appareil encore nécessaire.

## Décisions

| Avant | Après | Intention |
| --- | --- | --- |
| Deux cartes de choix proches, coin corné sur une invitation | Une copie de préparation avec double marge, action PrepButton ; archives en ligne secondaire | Une action principale ; le coin corné garde son sens de validation |
| Orientation fixe, bouton spécifique sur encre | Contenu défilable, titre Playfair, panneau papier à double marge et PrepButton bordeaux | Cohérence de l’entrée Sujets avec Prépa ; accès en grand texte |
| Organismes en cartes, hauteur et bordure animées, entrées décalées | Lignes à filets, dépliage immédiat, chevron partagé animé en transform uniquement | Lecture du catalogue plus calme et absence d’animation de layout |
| Cycles indisponibles à 45 % d’opacité, « Me prévenir » sans gestionnaire | Fond paperDim, texte lisible et badge « À venir » | Expliquer l’indisponibilité sans présenter une action sans effet |
| Confirmation du concours superposée au défilement | Pied dans le flux flex, dégradé papier, sélection lisible et action principale concise | Réserver la place réelle du pied en grand texte |
| Rythmes en trois tuiles serrées | Choix radio en lignes, test secondaire, étape explicitement nommée | Étapes claires, libellés pouvant se répartir sur plusieurs lignes |
| Révisions en grand bouton dégradé, erreurs en cartes répétitives | Copie à double marge, détail par matière à filets et PrepButton ; erreurs en lignes avec chevron | Continuité avec la copie du jour et la leçon |
| Filtre sans résultat silencieux | État vide expliquant comment retrouver les erreurs | Rendre le parcours récupérable |
| Concours blanc avec conditions en carte et actions hors défilement | Conditions en tableau d’affichage, trois consignes sur papier, actions dans le défilement | Un moment de départ lisible, une action principale |
| Grille de session à cellules fixes | Cellules d’au moins 48 pt, hauteur adaptable, légende, sélection accessible et repère à revoir nommé | Repérage explicite et grand texte |

Le catalogue Sujets conserve la grille d’organismes du lot 4 : ce sont les objets du catalogue. Les autres choix de SelectionScreen et les types de concours passent en lignes sur papier. Chargement, erreur, recherche et navigation conservent leurs traitements existants.

Les nouvelles compositions sont statiques. Les boutons et chevrons réutilisent leurs mécanismes partagés. BottomSheet lit aussi la préférence initiale de Reanimated : sous « Réduire les animations », le fond se fond sans déplacement de la feuille. Ce correctif de présentation partagé bénéficie également aux autres consommateurs.

## Fichiers

Dans `fatafalta/src/` :

- `prep/screens/OnboardingScreens.js` : Welcome, PrepContestPicker, RhythmSheet et étapes.
- `prep/components/ContestAccordion.js` : catalogue en lignes et sélections.
- `screens/OrientationScreen.js`, `ContestTypeSelectionScreen.js`, `SelectionScreen.js` : entrée Sujets et choix.
- `prep/screens/ReviewsScreen.js` : révisions, cahier et fiche de correction.
- `prep/screens/ExtraScreens.js` : MockIntro et ses styles ; autres écrans conservés, imports et styles inutilisés nettoyés.
- `prep/screens/SessionScreen.js` : présentation de la navigation du concours blanc et de sa grille ; bilan du lot 2 conservé.
- `prep/ui/BottomSheet.js` : réduction du mouvement de la feuille partagée.

## Vérifications

- `node --test tests/*.cjs` dans `fatafalta/` : **26/26 réussis** sur l’état final.
- `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo export --platform android --output-dir /tmp/fatafalta-check` : **réussi sur l’état final**.
- Analyse JSX et références des huit fichiers d’écran/composant : aucune référence non définie.
- Comparaison AST avec les instantanés pris au début du lot : **32 traitements hors rendu identiques** (catalogue, sélection, confirmation, rythme, révisions, sessions, validation et navigation notamment). Ce contrôle ciblé complète la relecture des changements ; il ne constitue pas une preuve d’équivalence complète de l’application.
- Contrastes calculés : inkSoft/paper **6,34:1**, inkSoft/paperDim **5,81:1**, burgundy/burgundyWash **8,85:1**, goldInk/paper **6,07:1**, blanc/burgundy **10,51:1**.
- `git diff --check` : réussi.
- Aucun ajout de dépendance, commit, changement de logique métier, API, route, donnée ou état du store. Les modifications présentes avant ce lot sont conservées. Aucun fichier `.env`, `keys.text`, `backend/` ou `src/prep/shared/prepCore.js` consulté ou modifié ; dotenv désactivé pendant les exports.

## À vérifier sur appareil

Playwright ne trouve pas son navigateur empaqueté ; la tentative avec Chrome local s’arrête au lancement (`Target page, context or browser has been closed`). Aucune capture avant/après ou validation visuelle 390 × 844 n’a pu être obtenue ; les 60 fps natifs ne sont pas mesurés.

À contrôler sur Android/iOS : petit écran et 390 × 844, texte système à 200 %, clavier de recherche ouvert, TalkBack/VoiceOver, Réduire les animations (actif au démarrage et changé pendant l’utilisation). Vérifier la hauteur des pieds, les longs noms de cycle, les onglets et le défilement intégral. Parcourir préparation et archives, sélection/changement de concours, cycle indisponible, révisions à jour et dues, cahier vide/filtré/verrouillé, correction et réessai ; concours blanc, navigation libre, marquage à revoir, remise manuelle/automatique et bilan.
