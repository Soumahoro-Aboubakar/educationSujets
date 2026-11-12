# Lot 7 — Nuit d’étude

9 novembre 2026. Thème système appliqué au rendu Prépa, Sujets, Compte, administration, navigation et feuilles modales. **Contrastes calculés et compilation vérifiés ; rendu réel et performances natives non validés dans cet environnement.**

## Décisions

| Avant | Après | Pourquoi |
| --- | --- | --- |
| Palette claire importée et styles figés au chargement | `ThemeProvider`, `useTheme()` et fabriques `createThemedStyles()` | Bascule système dans les composants déjà montés, y compris les composants mémorisés et les modales |
| `brand.ink` utilisé comme texte et comme fond | Texte réactif ; `brand.night` pour les fonds et ombres | Conserver l’encre des moments et éviter les fonds ou ombres devenus ivoire |
| Bordeaux unique pour texte et aplat | `burgundy` pour les annotations/liens, `action` pour le CTA, `burgundySolid` pour les petites sélections à texte blanc | Chaque association garde son contraste |
| Papier ivoire | Papier `#0F1A2C`, cartes `#16233A`, texte `#F3EEE4`, filets `rgba(255,255,255,0.10)` | La même copie sous une lampe de bureau |
| Pas de lumière d’étude | `StudyLamp`, halo radial or clair à 13 %, derrière le bord de la feuille active | Accent statique discret, sans image ajoutée, flou, minuterie ni animation |

La composition reste celle des lots précédents : double filet de marge bordeaux, lignes sur papier avec filets, un seul héros, une action principale, stats en tableau d’affichage, coin corné réservé au maîtrisé, `ordinal()` et `PrepButton` conservés. L’or de marque (`gold`, `goldLight`) ne change pas. Son rôle de texte `goldInk` utilise l’or clair en mode sombre ; son lavis devient brun encre.

**Bordeaux du bouton :** `#C0566C` donne seulement 3,79:1 avec `#F3EEE4` et 4,27:1 avec `#081224`. Le CTA prend donc `#C45F75`, texte `#081224` : **4,67:1**. Le haut du dégradé `#D4778B` monte à **6,07:1**. Le minimum est respecté sur tout le dégradé. Les liens utilisent `#E08B9E` ; les sélections compactes restent profondes (`#8B344B`) pour recevoir du blanc.

Les images de cours, logos, vidéos, documents PDF, drapeau et illustrations raster conservent leurs couleurs. L’éditeur d’image garde son fond noir. Le document lui-même et les lecteurs tiers ne sont pas recolorés ; l’interface qui les entoure reçoit le thème.

## Mécanisme et couverture

- `App.js` place le fournisseur au-dessus de l’application ; aucune clé liée au thème, aucun remplacement du navigateur, aucune écriture dans les stores. Les routes et leurs paramètres restent identiques.
- `useColorScheme()` suit le système ; une valeur indéterminée utilise le clair. Deux palettes stables ; les styles sont calculés au plus une fois par palette et module. Les dépendances du titre de liste mémorisé du classement incluent désormais ses styles.
- `app.json` passe à `userInterfaceStyle: automatic`. Sur le natif, `Appearance.setColorScheme('unspecified')` libère le verrou avant le premier rendu. Dans RN **0.85.3 installé**, `AppearanceModule.kt` appelle ainsi `MODE_NIGHT_FOLLOW_SYSTEM`. Aucun ajout d’`expo-system-ui` ni changement de dépendance. Sur le web, le hook suit `prefers-color-scheme`.
- React Navigation reçoit ses couleurs sombres ; la capsule d’onglets, sa pastille, les fonds pendant les transitions, les champs, les séparateurs et les voiles papier utilisent les mêmes rôles. `ThemeStatusBar` conserve les choix historiques en clair et impose du texte système clair la nuit. La barre Android immersive suit également le thème.
- Feuilles : Prépa `BottomSheet`, `Sheet`, filtres Gorhom, sélecteurs, confirmation de corrigé, accès, formulaires présentés en modal et éditeur d’image. Les palettes de succès/erreur distinguent le texte clair, le lavis sombre et la pastille pleine.
- Aucun mouvement ajouté lors d’une bascule. Le halo est décoratif, hors lecture d’accessibilité et sans interception tactile. Les animations existantes et leurs branches de réduction sont conservées.

Références : [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/), [apparence Expo](https://docs.expo.dev/develop/user-interface/color-themes/), [SystemUI SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/system-ui/). Expo recommande `expo-system-ui` pour configurer l’apparence Android par le build ; ce lot utilise l’API native déjà embarquée de RN, conformément à l’interdiction d’ajouter une dépendance. Une reconstruction native prend aussi en compte la nouvelle configuration iOS.

## Contrastes : méthode et couples vérifiés

Calcul WCAG sRGB, `(Lclair + 0,05) / (Lsombre + 0,05)`, sans arrondir avant comparaison. Les tests vérifient **≥ 4,5:1 même pour le grand texte** sur les couples de palette ci-dessous, les six matières, les avatars et tous les stops des boutons. Les filets et le halo sont décoratifs : le seuil textuel ne leur est pas appliqué.

| Code | Texte / fond sombre | Ratio |
| --- | --- | ---: |
| T | Principal / papier | 15,08:1 |
| C | Principal / carte | 13,60:1 |
| S | Secondaire / carte | 8,83:1 |
| M | Atténué ou placeholder / carte | 7,57:1 |
| D | Désactivé / papier atténué | 7,90:1 |
| B | Bordeaux / lavis bordeaux | 5,90:1 |
| A | CTA, encre profonde / bordeaux éclairci | 4,67:1 minimum |
| P | Blanc / sélection bordeaux profonde | 7,80:1 |
| O | Texte or clair / lavis or | 8,86:1 |
| G | Bouton or, encre profonde / or | 5,94:1 minimum |
| V | Succès / lavis succès | 7,03:1 |
| E | Erreur / lavis erreur | 7,44:1 |
| W | Avertissement / lavis avertissement | 8,59:1 |
| N | Secondaire blanc à 66 % / encre lumineuse, cas conservateur du fond Nuit | 5,55:1 |

Les textes atténués d’en-tête sont composités avant calcul. Le dénominateur du score de session passe de 55 % à 66 % **uniquement en sombre**. Les boutons désactivés à opacité réduite conservent leur opacité claire historique et deviennent pleinement lisibles en sombre.

### Vérification écran par écran

Chaque ligne indique les associations de rendu relues dans les sources et vérifiées par calcul, **pas une capture ni une validation exhaustive de tous les états à l’écran**. Les composants partagés ajoutent leurs couples à chaque écran consommateur.

| Écran / fichier | Couples et cas contrôlés |
| --- | --- |
| Bienvenue — `OnboardingScreens / WelcomeScreen` | N, T, S, A ; moment encre conservé, panneau papier sombre |
| Choix du concours — `ContestPickerScreen` | T, C, S, B, P, A ; accordéons, recherche, sélection et choix du rythme |
| Prépa — `PrepHomeScreen` | N, T, C, S, A, V ; copie du jour, modules maîtrisés, à venir et essai |
| Module — `ModuleLessonScreens / ModuleScreen` | N, T, C, S, P, V, A ; niveaux, verrouillage et progression |
| Leçon — `LessonScreen` | T, C, S, B, O, D, A ; filets du tableau, annotations, taille de texte, mini-exercice |
| Session — `SessionScreen` | N, T, C, M, P, V, E, W, D, A ; QCM, entourer, surligner, ordre, association, glisser, numérique |
| Bilan de session / placement / module terminé — mêmes fichiers | N, T, S, O, A ; tampon maîtrisé, score, feuille d’actions |
| Révisions — `ReviewsScreen` | T, C, S, B, P, A ; onglets de matière, sélection et état vide |
| Mon bilan — `ProgressScreens / ProgressScreen` | N, T, C, S, B, O ; tableau d’affichage, tendances, liens |
| Classement — `components/RankingScreens / RankingScreen` | T, C, S, M, P, O ; recherche, podium, ligne Toi et pagination |
| Candidat — `CandidateScreen` | T, C, S, B ; avatar, matières et comparaison |
| Concours blanc — `ExtraScreens / MockIntroScreen` | N, T, S, D, A ; moment, consignes et accès |
| Programme — `ProgramInfoScreen` | T, C, S, B, A ; liste des matières et détails |
| Abonnement Prépa — `PrepSubscriptionScreen` | N, T, S, O, G ; bénéfices et bouton or |
| Orientation historique — `OrientationScreen` | N, T, C, S, A ; fond d’illustration restant encre |
| Type de concours — `ContestTypeSelectionScreen` | N, T, C, S, B ; lignes et états |
| Établissement / concours — `SelectionScreen` | N, T, C, S, B ; monogrammes profonds, logos conservés |
| Type de parcours — `ParcoursTypeSelectionScreen` | N, T, C, S, B ; choix et retours |
| Catalogue dynamique — `DynamicCatalogScreen` | N, T, C, S, B ; fil d’Ariane et liste |
| Documents du concours — `ContestDocumentsScreen` | N, T, C, S, M, B ; recherche, documents et chargement |
| Recherche — `SearchScreen` | N, T, C, S, M, B ; filtres et résultats |
| Document — `DocumentDetailScreen` | N, T, C, S, B, O, D ; corrigé sur badge or avec encre profonde, téléchargement, confirmation |
| Téléchargements — `DownloadsScreen` | N, T, C, S, B ; états local/en cours/erreur et filtres |
| Téléchargement groupé — `BulkDownloadScreen` | N, T, C, S, D, A ; sélection, quotas et progression |
| Entraînement historique — `TrainingSessionScreen` | T, C, S, V, E, W ; réponse, aide, score, StatusBar réactive |
| Fonction verrouillée — `LockedFeatureScreen` | T, C, S, A ; accès et explications |
| Moi — `account/AccountScreen` | N, T, C, S, O, A ; essai, compte et lignes de réglages |
| Connexion — `LoginScreen` | N, T, C, M, E, D, A ; champs, mot de passe et erreur |
| Inscription — `RegisterScreen` | N, T, C, M, V, E, D, A ; exigences du mot de passe et cases |
| Abonnement compte — `account/SubscriptionScreen` | N, T, C, S, O, G, V, W, E ; statuts et paiements |
| Portefeuille — `account/WalletScreen` | N, T, C, S, V, W, E, A ; solde et historique |
| Retrait — `account/WithdrawScreen` | N, T, C, M, P, V, W, E, D, A ; montant, opérateur et formulaire |
| Codes promo — `account/PromoCodeScreen` | N, T, C, S, B ; action de copie en encre profonde sur or |
| Réglages — `SettingsScreen` | N, T, C, S, P ; choix et informations |
| Brouillons — `AdminDraftsScreen` | T, C, S, V, E, D, A ; lignes, statuts et actions |
| Corbeille — `AdminTrashScreen` | T, C, S, V, E, A ; restaurer et supprimer |
| Gestion catalogue — `CatalogManagementScreen` | T, C, M, E, D, A ; champs et sélecteurs |
| Paiements admin — `admin/PaymentMethodsAdminScreen` | T, C, S, O, E, A ; moyens, statuts et avertissement |
| Publier — `UploadScreen` | T, C, M, V, E, D, A ; médias, métadonnées et progression |
| Modifier un brouillon — `EditDraftScreen` | T, C, M, E, D, A ; champs et validation |
| Ajouter un corrigé — `CorrectionUploadScreen` | T, C, M, V, E, D, A ; sélection, photos et formulaire |
| Feuilles Prépa : raisonnement, mini-cours, accès et rythme | T, C, M, V, E, W, D, A ; pastilles sémantiques distinctes des textes |
| Feuilles Sujets/Compte : filtres, métadonnées, accès et corrigé | T, C, M, B, D, A ; fond sombre, saisie et backdrop |
| Éditeur d’image — `ImageEditorModal` | Blanc sur noir pour les outils ; C pour valider ; photo inchangée |
| Vidéo — `VideoPanel`, `VideoDock` | N, C, S, B ; fond média encre, contrôles et état indisponible |
| Barre d’onglets — `PremiumTabBar` | B sur papier sombre actif ; blanc 62 % sur encre pour les icônes inactives |

## Vérifications et limites

- `node --test tests/*.cjs` : **31/31 réussis** ; tests métier existants et nouveaux tests du thème, des contrastes, du cache par palette, de la StatusBar et de la portée des références.
- `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx --no-install expo export --platform android --output-dir /tmp/fatafalta-check` : **réussi sur l’état final**. Les variables évitent la lecture des fichiers `.env` ; `--no-install` interdit une installation implicite.
- Comparaison temporaire des styles évalués avant/après : **80 modules de styles**, dont les styles partagés de connexion/inscription, identiques en clair. Les couleurs des propriétés inline ont été relues ; tous les nouveaux alias clairs reprennent les valeurs antérieures. Ce contrôle ne remplace pas une comparaison de pixels.
- `git diff --check` : réussi.
- Services, stores, hooks métier et contextes de compte comparés à l’état de départ : identiques. Aucune modification de backend, `prepCore.js`, routes, données, dépendances ou fichiers sensibles ; aucun commit.
- Chrome headless s’arrête avec le code 134 au lancement, même sur une page vide. Pas de capture 390 × 844 validée. Les 60 fps ne sont pas mesurés ; le nouveau halo n’anime rien et aucun recalcul de thème n’est exécuté par frame.

À vérifier sur appareil : démarrage sombre puis bascule système dans une leçon, une session en cours, une saisie et une modale ouverte ; retour au premier plan ; navigation sans flash clair ; petit écran et texte à 200 % ; cibles tactiles effectives ≥ 44 pt, lecteurs d’écran et option Réduire les animations. Les dimensions et comportements des contrôles historiques restent conservés : leurs vérifications tactiles et grand texte ne sont pas déclarées acquises par cet audit de couleurs.

## Fichiers

Fondations : `fatafalta/App.js`, `app.json`, `src/theme/tokens.js`, `ThemeProvider.js`, `ThemeStatusBar.js`, `StudyLamp.js`, `src/prep/theme.js`.

Migration de rendu : écrans et composants de `src/screens/`, `src/components/`, `src/navigation/`, `src/prep/screens/`, `src/prep/components/`, `src/prep/exercises/`, `src/prep/ui/`, `src/prep/video/`. Les fonctions d’événements métier restent inchangées ; les imports de palette et les fabriques de styles deviennent réactifs. Les symboles et l’introduction de marque gardent leur palette fixe.

Tests : `tests/themeNight.test.cjs`, `tests/helpers/themeHarness.cjs`. Compte rendu : le présent fichier.
