# Lot 0 — Fondations : livraison du 8 novembre 2026

Implémentation terminée ; validation visuelle réelle restant à faire (environnement sandboxé).

## Décisions

- `ordinal(n, { feminine })` centralise tous les ordinaux affichés : `1ᵉʳ`, `2ᵉ`, `101ᵉ`, `1 001ᵉ`, et `1ʳᵉ` au féminin. Les commentaires et données pédagogiques restent inchangés. `AnimatedNumber` reçoit un formateur optionnel pour conserver son animation dans Mon bilan.
- `ScreenHeader` conserve son API : le contexte `eyebrow` apparaît désormais sous le titre, avec son icône éventuelle. Les labels décoratifs de sélection, Moi, connexion, inscription et choix du type de concours sont supprimés. Le programme de Mon bilan reste visible sous le titre.
- `Button` délègue à `PrepButton` : `primary → primary`, `secondary → secondary`, `ghost → link`, `accent → primary` (le bordeaux historique). Aucune variante historique ne devient or : `gold` reste réservé aux abonnements dans PrepButton. Les propriétés, styles, icônes composant/élément React et états de chargement sont transmis.
- Les deux boutons partagent désormais hauteurs, rayons, typographie, dégradés et animation à l'appui. Les propriétés natives/accessibilité passent par `PrepButton` et `PressScale`.
- Désactivé : fond `brand.paperDim`, texte `brand.inkSoft` à pleine opacité ; contraste calculé **5,81:1**. L'opacité de 60 % évoquée dans le document de direction n'est pas appliquée afin de respecter le seuil prioritaire de 4,5:1. `accessibilityState.disabled` et `busy` sont conservés.
- Les couleurs particulières gardent leurs valeurs exactes dans des groupes de jetons nommés : fichiers, retours d'entraînement, illustrations, organismes, matières, drapeau, surfaces et tendances du classement.

## Couleurs restantes

- **105 occurrences hexadécimales à six chiffres avant ; 0 après**, hors `src/theme/` et `src/prep/theme.js`.
- **0 hexadécimal à trois à huit chiffres hors thèmes**, après remplacement complémentaire des blancs/noirs courts.
- Les valeurs hexadécimales des thèmes restent naturellement dans les thèmes, sources de vérité.
- **104 occurrences `rgb/rgba` préexistantes subsistent** hors thèmes : transparences, filets et dégradés. Cette passe couvre les hexadécimaux demandés ; elle ne migre pas ces transparences.

## Vérifications

- `node --test tests/prepRanking.test.cjs tests/userMessages.test.cjs` : **23/23 réussis**.
- Avec `tests/ordinal.test.cjs` : **26/26 réussis** ; premier, 21, 101, milliers, million et féminin couverts.
- `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx --no-install expo export --platform android --output-dir /tmp/fatafalta-lot0` : **réussi sur l'état final**.
- Export web également compilé pour préparer la vérification visuelle.
- `git diff --check` : réussi.
- Aucun ajout de dépendance, commit, changement de route, de logique métier ou de données ; backend et prepCore inchangés. Les changements déjà présents dans le dépôt sont conservés. Aucun fichier `.env` ni `keys.text` lu ou modifié ; le chargement dotenv d'Expo est désactivé.

## Vérification à l'écran restante

La tentative d'aperçu 390 × 844 a été bloquée : création du serveur local interdite par le sandbox (`Operation not permitted`) et Chrome/Playwright arrêté au lancement. Aucune capture après modification n'a donc pu être validée, ni aucun rendu natif.

À vérifier sur Android et iOS : hauteur des boutons historiques dans les barres serrées et formulaires admin ; titres longs avec contexte sous le titre ; rangs longs avec espaces fines et exposants dans Playfair ; états désactivé/chargement et icônes ; petits écrans et grand texte. La hiérarchie générale et les dispositions restent celles des lots suivants.

## Fichiers de l'application et tests modifiés ou créés

35 fichiers, plus ce compte rendu. Les autres fichiers non suivis ou déjà modifiés avant ce lot ne font pas partie de cette liste.

- [fatafalta/src/components/catalog/OrganismeLogo.js](../../../fatafalta/src/components/catalog/OrganismeLogo.js)
- [fatafalta/src/components/documents/ImageEditorModal.js](../../../fatafalta/src/components/documents/ImageEditorModal.js)
- [fatafalta/src/components/filters/FilterBottomSheet.js](../../../fatafalta/src/components/filters/FilterBottomSheet.js)
- [fatafalta/src/components/illustrations/OrientationArt.js](../../../fatafalta/src/components/illustrations/OrientationArt.js)
- [fatafalta/src/components/ui/Button.js](../../../fatafalta/src/components/ui/Button.js)
- [fatafalta/src/components/ui/ScreenHeader.js](../../../fatafalta/src/components/ui/ScreenHeader.js)
- [fatafalta/src/prep/components/ContestAccordion.js](../../../fatafalta/src/prep/components/ContestAccordion.js)
- [fatafalta/src/prep/components/LessonBlocks.js](../../../fatafalta/src/prep/components/LessonBlocks.js)
- [fatafalta/src/prep/components/RankingScreens.js](../../../fatafalta/src/prep/components/RankingScreens.js)
- [fatafalta/src/prep/components/Sheets.js](../../../fatafalta/src/prep/components/Sheets.js)
- [fatafalta/src/prep/exercises/Choice.js](../../../fatafalta/src/prep/exercises/Choice.js)
- [fatafalta/src/prep/exercises/OrderMatch.js](../../../fatafalta/src/prep/exercises/OrderMatch.js)
- [fatafalta/src/prep/screens/ModuleLessonScreens.js](../../../fatafalta/src/prep/screens/ModuleLessonScreens.js)
- [fatafalta/src/prep/screens/OnboardingScreens.js](../../../fatafalta/src/prep/screens/OnboardingScreens.js)
- [fatafalta/src/prep/screens/PrepHomeScreen.js](../../../fatafalta/src/prep/screens/PrepHomeScreen.js)
- [fatafalta/src/prep/screens/ProgressScreens.js](../../../fatafalta/src/prep/screens/ProgressScreens.js)
- [fatafalta/src/prep/screens/ReviewsScreen.js](../../../fatafalta/src/prep/screens/ReviewsScreen.js)
- [fatafalta/src/prep/screens/SessionScreen.js](../../../fatafalta/src/prep/screens/SessionScreen.js)
- [fatafalta/src/prep/ui/Illustrations.js](../../../fatafalta/src/prep/ui/Illustrations.js)
- [fatafalta/src/prep/ui/primitives.js](../../../fatafalta/src/prep/ui/primitives.js)
- [fatafalta/src/screens/AdminDraftsScreen.js](../../../fatafalta/src/screens/AdminDraftsScreen.js)
- [fatafalta/src/screens/AdminTrashScreen.js](../../../fatafalta/src/screens/AdminTrashScreen.js)
- [fatafalta/src/screens/BulkDownloadScreen.js](../../../fatafalta/src/screens/BulkDownloadScreen.js)
- [fatafalta/src/screens/ContestTypeSelectionScreen.js](../../../fatafalta/src/screens/ContestTypeSelectionScreen.js)
- [fatafalta/src/screens/LoginScreen.js](../../../fatafalta/src/screens/LoginScreen.js)
- [fatafalta/src/screens/OrientationScreen.js](../../../fatafalta/src/screens/OrientationScreen.js)
- [fatafalta/src/screens/RegisterScreen.js](../../../fatafalta/src/screens/RegisterScreen.js)
- [fatafalta/src/screens/SelectionScreen.js](../../../fatafalta/src/screens/SelectionScreen.js)
- [fatafalta/src/screens/SettingsScreen.js](../../../fatafalta/src/screens/SettingsScreen.js)
- [fatafalta/src/screens/TrainingSessionScreen.js](../../../fatafalta/src/screens/TrainingSessionScreen.js)
- [fatafalta/src/screens/account/AccountScreen.js](../../../fatafalta/src/screens/account/AccountScreen.js)
- [fatafalta/src/theme/tokens.js](../../../fatafalta/src/theme/tokens.js)
- [fatafalta/src/utils/fileIcons.js](../../../fatafalta/src/utils/fileIcons.js)
- [fatafalta/src/utils/ordinal.js](../../../fatafalta/src/utils/ordinal.js)
- [fatafalta/tests/ordinal.test.cjs](../../../fatafalta/tests/ordinal.test.cjs)
