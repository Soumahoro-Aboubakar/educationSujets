# Lot 8 — Adaptativité et finition

9 novembre 2026. Reprise des ajustements déjà présents, priorité donnée au choix explicite du thème.
Implémentation et vérifications automatisées terminées. **Validation visuelle native encore nécessaire** :
les tests de composants avec frontières natives simulées ne mesurent ni les pixels ni la fluidité.

## Priorité — Apparence choisie par l’utilisateur

- **Clair par défaut**, même lorsque le système est sombre. Une préférence absente ou inconnue revient au clair.
- Paramètres → **Apparence**, avant Préparation : contrôle segmenté « Clair / Sombre », deux aperçus
  de copie avec double filet bordeaux, icônes Soleil/Lune et coche de sélection. Les segments passent
  en colonne lorsque la largeur disponible et le facteur de texte le nécessitent ; leurs libellés
  grandissent et reviennent à la ligne sans hauteur imposée.
- Radios nommées, état sélectionné annoncé, aperçus décoratifs exclus de la lecture. Les libellés et
  les zones tactiles ont au moins 44 pt de hauteur, en plus de la surface de chaque aperçu.
- La nouvelle préférence de présentation `appearance: 'light' | 'dark'` emprunte le **contexte et le
  service de préférences existants**, SecureStore sur appareil, localStorage sur le web. Aucune
  dépendance, nouvelle API ou modification du service de stockage.
- `PreferencesProvider` enveloppe désormais `ThemeProvider`. Le navigateur attend la lecture des
  préférences avec les autres ressources de démarrage : la palette sauvegardée est connue avant
  son premier affichage. Le splash et l’introduction conservent leur traitement de marque.
- Le rendu prend immédiatement le dernier choix. Les écritures sont séquencées pour conserver le
  dernier appui même avec un stockage lent. Un échec laisse le thème actif et propose de réessayer
  son enregistrement, sans alerte bloquante.
- Deux palettes stables et styles mis en cache par palette, sans clé de remontage du navigateur.
  Onglets, StatusBar, transitions de navigation, feuilles et modales héritent du même contexte.
  `Appearance.setColorScheme()` applique aussi le choix aux surfaces natives. Aucun abonnement
  au thème système ne pilote plus l’apparence de l’app.

Cette décision remplace la bascule système décrite dans `07-mode-sombre.md`. Les couleurs de ce lot
et leurs contrastes restent conservés ; `app.json` garde la capacité native `automatic` permettant
les deux apparences, mais le choix d’exécution est explicite.

## Adaptativité — reprise et compléments

| Avant | Après | Pourquoi |
| --- | --- | --- |
| Troncature et réduction automatique sur des libellés et montants | Le composant Text partagé conserve le texte entier dès fontScale 1,3 et désactive la réduction automatique | Respecter le choix de taille système |
| Écrans de lecture aussi larges que la tablette | Cadre commun de 720 pt, soit environ 680 pt de lecture entre les marges | Conserver une mesure confortable |
| Catalogue à nombre de colonnes fixe | Une à trois colonnes selon largeur et fontScale, cadre catalogue de 1 040 pt | Garder les noms lisibles et utiliser la tablette |
| Stats serrées sur une ligne | Tableaux d’affichage repliables ; onglets et lignes peuvent grandir | Préserver les quatre valeurs sans multiplier les cartes |
| Tableau de leçon trop étroit pour le texte agrandi | Cellules dimensionnées selon la taille du texte, défilement horizontal et indication visible | Lire les colonnes et en-têtes entiers |
| Tri d’exercice à hauteur présumée | Mesure des lignes complètes, y compris les flèches, et hauteur commune recalculée | Adapter le rendu sans modifier la réponse |
| En-tête pouvant prendre tout l’écran en grand texte | Zone de titre défilable bornée dans ScreenHeader et PaperStack | Laisser de la place au contenu tout en donnant accès au titre complet |
| Pied de session pouvant envahir l’exercice | Zone d’action défilable et bornée ; actions du concours blanc empilées en grand texte | Garder l’exercice et la validation accessibles |
| Feuilles avec pied trop grand ou contenu hors écran | Corps défilant, hauteur limitée à la fenêtre et pied dans le flux en grand texte | Atteindre les actions et les textes longs |
| Badge de mini-exercice et vignette de fichier à hauteur fixe | Hauteur minimale et marges internes | Laisser grandir les libellés |
| Pourcentage agrandi dans un anneau fixe | Anneau contenant du texte dimensionné selon fontScale | Éviter que le texte rencontre le tracé |

Les ajustements repris concernent notamment Text, les cadres de lecture, les formulaires, les
grilles Sujets, les stats Prépa/Progrès, le classement, les exercices et les feuilles partagées.
Les compléments de cette reprise sont listés ci-dessous. Les dimensions fixes qui subsistent pour
des pictogrammes, illustrations, aperçus sans texte et filets restent intentionnelles.

**Paysage :** la configuration existante verrouille l’app en portrait. Elle reste inchangée ; aucun
support paysage natif n’est annoncé. Les composants adaptatifs utilisent les dimensions courantes
de la fenêtre, sans nouvelle orientation ni route.

## Passe de finition

- Identité conservée : double filet de marge bordeaux, papier à filets, un héros, une action principale,
  ligne de stats en tableau d’affichage, coin corné réservé au maîtrisé, `ordinal()` et `PrepButton`.
- Filtres : une seule validation, via l’alias partagé de PrepButton, avec le nombre de changements
  conservé dans le libellé. En grand texte, le bouton rejoint le contenu défilant. Sélections radio
  et bouton de fermeture explicitement nommés ; les noms longs peuvent se répartir sur plusieurs lignes.
- FormInput utilise le nom Inter réellement chargé. Le bouton de réessai de StateView est nommé et
  son libellé peut grandir. Cibles de l’effacement de métadonnée, du switch de corrigé inclus et de
  l’en-tête de l’éditeur d’image portées à au moins 44 pt.
- États existants chargement/vide/erreur/hors ligne/verrouillé relus dans les sources des parcours
  Sujets, Prépa, Compte et administration. Leurs conditions, données et actions restent conservées.
  L’erreur de sauvegarde du thème ajoute une récupération locale explicite.
- Réduire les animations : suppression des déplacements d’entrée des réponses Vrai/Faux et chiffres
  numériques ; fondus courts dans les mini-cours et verdicts ; arrêt des points animés de raisonnement
  lorsque le réglage change ; fondu des sélecteurs et de l’éditeur d’image. Le pop partagé commence à
  0,95 et reste à échelle 1 en réduction. Aucun mouvement ajouté à la bascule de thème.
- Audit syntaxique des **221 usages JSX nommés de Lucide** : aucun trait explicite hors 1,9–2,2.
  Les icônes sans surcharge utilisent le trait standard de 2. Les tracés SVG illustratifs et graphiques
  ne sont pas des icônes Lucide et gardent leurs épaisseurs propres.
- Les nouveaux ajustements de mise en page sont statiques. Les animations ajoutées ou corrigées
  utilisent transform/opacity ; aucun calcul de mise en page à chaque frame n’a été ajouté.

## Vérifications

- `node --test tests/*.cjs` dans `fatafalta/` : **35/35 réussis** sur l’état final.
- `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx --no-install expo export --platform android --output-dir /tmp/fatafalta-check` : **réussi sur l’état final**.
  Les variables empêchent le chargement dotenv ; `--no-install` évite toute installation implicite.
- Tests du thème : défaut clair sur système sombre, choix explicite, entrée inconnue, cache des styles,
  ordre des écritures après erreur, relecture locale avec conservation des autres préférences, StatusBar
  et contrastes de palette sombres ≥ 4,5:1. Les frontières SecureStore/native sont simulées.
- Tests d’adaptativité repris : texte à 1,3 / 1,5 / 2 sans réduction ni troncature imposée ; mesures et
  redimensionnement du tri sans changement de réponse, maintien des actions fléchées et du dépôt.
- Comparaison AST ciblée avec l’instantané pris à la reprise : **23 traitements nommés hors JSX
  identiques** dans les fichiers concernés. Ce contrôle ciblé ne prouve pas l’équivalence de toute l’app.
- Contexte/service de préférences, store Prépa, RootNavigator et app.json identiques à l’état de reprise.
  Fichiers de dépendances inchangés ; aucun commit. Aucun changement de logique métier, API, route,
  données pédagogiques ou progression. Seule la nouvelle préférence d’apparence, explicitement demandée,
  est enregistrée par cette fonctionnalité.
- `git diff --check` : réussi. Aucun fichier sensible, backend ou prepCore modifié.
- Pas de critique Impeccable courante pour la cible : `critique-storage latest` retourne le code 2.
  La passe est indépendante et suit les références craft-floor, polish, Emil et le skill Fatafalta prioritaire.

## Vérification sur appareil restante

Chrome local headless s’arrête au lancement avec le code 134, y compris sur `about:blank`.
CoreSimulator refuse la connexion à son service. **Aucune capture avant/après, vérification réelle
du zéro-troncature ou mesure des 60 fps n’est déclarée acquise.**

| Format / réglage | Parcours et contrôles à regarder |
| --- | --- |
| 375 × 667, texte 1 / 1,3 / 1,5 / 2 | Paramètres, accueil, module/leçon, session et correction, concours blanc ; titres et pieds entièrement accessibles |
| 390 × 844, clair et sombre | Rythme des marges, feuille haute, alignement des filets, tableau d’affichage et action principale |
| Tablette 768 × 1 024 et 1 024 × 1 366 | Cadres centrés, lecture ~680 pt, catalogue 1–3 colonnes selon texte, grands noms, absence de débordement horizontal hors tableaux |
| Choix du thème | Installation sans préférence sur système sombre, bascules rapides, fermeture/réouverture, retour au premier plan, saisie et progression conservées |
| Modales, onglets, barres système | Palette cohérente après bascule ; absence de flash lors de la navigation, fond natif et texte de StatusBar lisibles |
| Accessibilité | TalkBack/VoiceOver, radios, focus clavier web, cibles effectives ≥44 pt, contraste des contenus réels, clavier ouvert |
| Réduire les animations | Actif au démarrage puis changé pendant un mini-cours, une correction ou une analyse de raisonnement |
| États réels | Chargement lent, hors ligne, vide, erreur/réessai, essai terminé, non-abonné, stockage indisponible ; défilement jusqu’à la dernière action |

## Fichiers de cette reprise

19 fichiers d’application/tests complétés ou modifiés, plus ce rapport ; les autres modifications
du dépôt étaient déjà présentes et ont été conservées.

- Thème : `fatafalta/App.js`, `src/theme/ThemeProvider.js`, `src/screens/SettingsScreen.js`.
- Partagés : `src/components/ui/ScreenHeader.js`, `FormInput.js`, `StateView.js`, `MetadataSelect.js` ;
  `src/components/filters/FilterBottomSheet.js` ; `src/components/documents/DocumentCard.js`,
  `CorrectionIncludedSwitch.js`, `ImageEditorModal.js`.
- Prépa : `src/prep/ui/primitives.js`, `src/prep/screens/SessionScreen.js`,
  `src/prep/components/LessonBlocks.js`, `Sheets.js`, `src/prep/exercises/SwipeNumeric.js`.
- Détail de document : `src/screens/DocumentDetailScreen.js`.
- Tests : `tests/themeNight.test.cjs`, `tests/helpers/themeHarness.cjs` ;
  `tests/adaptivity.test.cjs` déjà présent, conservé et exécuté.

Les chemins `src/` et `tests/` de cette liste sont relatifs à `fatafalta/`.
