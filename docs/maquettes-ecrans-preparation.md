# Maquettes des écrans — Fatafalta mobile : section « Préparation »

> **Statut** : version 0.2 du 2026-11-05 (voir l'encadré « Évolutions v0.2 » ci-dessous, qui prime sur la v0.1).
> **Complète** : `docs/cahier-des-charges-mobile-preparation.md` (le « quoi » et le « pourquoi »).
> **Ce document** décrit le « à quoi ça ressemble » : disposition, contenus, couleurs, polices, logo,
> icônes, fonds, illustrations, animations et retours haptiques de **chaque écran**, puis le **prompt**
> de chaque écran, prêt à être donné à une IA de conception ou de développement.
>
> **Ambition** : un rendu simple, ergonomique, professionnel et premium, au niveau des meilleures
> réalisations publiées sur Dribbble (top 1 %), qui donne envie de découvrir l'application et de se former.

> **Évolutions v0.2 (validées par le propriétaire sur planche de références)** — elles priment sur la
> suite du document lorsqu'elles le contredisent ; règles opérationnelles : skill de projet
> `.claude/skills/fatafalta-premium-mobile`.
> 1. **Typographie** : Playfair Display (titres d'écran, titres de section, chiffres héros, en chiffres
>    « lining ») + Inter (tout le reste). Accent : un mot en Playfair italique + trait de pinceau or.
> 2. **Action principale bordeaux** (`#6C2838`, relief doux) au lieu de l'encre ; secondaire ivoire à
>    filet bordeaux ; sélection = fond `#F4E9EA` + bordure bordeaux.
> 3. **Pile de copies** : chaque écran est une feuille papier (rayon haut 28) posée sur le fond encre,
>    une seconde feuille dépasse derrière ; l'en-tête vit sur l'encre.
> 4. **Illustrations raster premium** (rendus 3D / éditoriaux détourés) pour les moments clés : copie
>    18/20, médaille et lauriers, emblème F 3D, carnet-parcours. Les SVG restent pour les petits pictos.
> 5. **Pas de sur-titre** au-dessus d'un titre (les `overline` deviennent de vrais titres) ; pas de filet
>    coloré épais à gauche des encarts.
> 6. Pastilles de matières (disque teinté + icône), tuiles de statistiques (icône, chiffre Playfair,
>    libellé), coin corné or en relief pour « validé / maîtrisé ».

---

## Sommaire

- **Partie A — Direction artistique** : concept, palette, typographie, grille, formes, ombres, icônes,
  illustrations, fonds, mouvement, haptique, rédaction.
- **Partie B — Composants de base** : leur apparence, une fois pour toutes.
- **Partie C — Écrans** (du premier lancement à la fin du parcours) : E00 à E40.
- **Partie D — Prompts** : préambule commun + un prompt par écran.
- **Partie E — Contrôle qualité** : liste de vérification avant de valider un écran.

---

# Partie A — Direction artistique

## A1. Concept : « La copie d'excellence »

Fatafalta est déjà construit autour d'une image forte : **la copie d'examen**. Le logo est un **F dessiné
comme une feuille dont le coin est corné**, le geste de l'élève qui marque la page à réviser ; le revers
du coin est **or**, la couleur de la réussite.

La section Préparation prolonge ce concept :

| Idée | Traduction visuelle |
|---|---|
| **L'encre** (bleu nuit) = le sérieux, la concentration | Fonds des « moments » (accueil, bilans, célébrations, abonnement) |
| **Le papier** (ivoire) = l'espace de travail | Fonds de tous les écrans d'étude (Prépa, Module, Leçon, Session) |
| **L'or** = ce qui a de la valeur | Progression, réussite, série, rang, éléments « premium ». **Rare** : jamais en aplat large |
| **Le bordeaux** = l'interaction | Liens, chevrons, focus, actions secondaires fortes |
| **Le coin corné** = « je maîtrise / à réviser » | Motif récurrent : coin or replié sur une carte de module validé, sur le badge de rang, sur la carte « À réviser » |
| **Le trait de stylo** = le geste de l'élève | Cercle « Entourer », surlignage, soulignement des titres de célébration |

**Les trois règles du premium Fatafalta**

1. **Retenue** : une couleur forte par écran au maximum (en plus de l'encre). Beaucoup d'air.
2. **Les chiffres sont des héros** : progression, rang, score, série s'affichent en grand, en chiffres
   tabulaires, et s'animent quand ils changent.
3. **Le mouvement explique** : chaque animation montre une conséquence (une réponse se met en place,
   un module se valide), jamais pour décorer.

## A2. Palette

### A2.1 Couleurs de marque (existantes — `theme/brand.js`)

| Jeton | Hex | Usage |
|---|---|---|
| `ink` | `#0D1B32` | Texte principal, fonds des moments, boutons principaux |
| `inkDeep` | `#081224` | Bas des dégradés encre, barre d'état sur fond encre |
| `inkGlow` | `#264069` | Halo lumineux des fonds encre |
| `inkSoft` | `#4F5E72` | Texte secondaire |
| `inkMuted` | `#7A8697` | Texte tertiaire, icônes inactives |
| `paper` | `#FCFAF5` | Fond des écrans d'étude |
| `paperDim` | `#F4F0E6` | Fond de zones secondaires, état pressé |
| `line` | `#E4DED2` | Filets, séparateurs, bordures de cartes |
| `lineStrong` | `#CFC7B8` | Bordures d'éléments interactifs au repos |
| `burgundy` | `#6C2838` | Interaction : liens, chevrons, focus |
| `burgundyWash` | `#F4E9EA` | Fond d'élément bordeaux sélectionné |
| `gold` | `#B48A48` | Réussite, progression, premium |
| `goldLight` | `#E4C997` | Or sur fond encre (texte, icônes) |
| `goldWash` | `#F6EEDF` | Fond des encarts or |
| `goldInk` | `#7A5A24` | Texte or lisible sur fond clair |
| `onInk` | `#FFFFFF` | Texte sur encre |
| `onInkSoft` | `rgba(255,255,255,0.66)` | Texte secondaire sur encre |
| `backdrop` | `rgba(13,27,50,0.56)` | Voile derrière les feuilles modales |

### A2.2 Couleurs sémantiques (existantes — `theme/tokens.js`)

| Jeton | Hex | Usage |
|---|---|---|
| `success` / `successWash` | `#1F7A55` / `#E8F3EC` | Bonne réponse, module validé |
| `error` / `errorWash` | `#B42318` / `#FBEDEB` | Mauvaise réponse |
| `warning` / `warningWash` | `#8F530F` / `#F6EEDF` | Essai bientôt épuisé, seconde chance |
| `surface` | `#FFFFFF` | Cartes posées sur le papier |

### A2.3 Nouvelles couleurs de la préparation (à ajouter dans `theme/tokens.js`)

**Teintes de matières** — servent uniquement à distinguer les matières (pastille, anneau de module,
puce active). Toujours accompagnées du nom de la matière.

| Matière (exemple) | Teinte | Fond léger |
|---|---|---|
| Culture générale | `#264069` (encre lumineuse) | `#E9EEF5` |
| Français | `#6C2838` (bordeaux) | `#F4E9EA` |
| Mathématiques / Logique | `#1F5F5B` (sarcelle profonde) | `#E5F0EE` |
| Anglais | `#7A5A24` (or profond) | `#F6EEDF` |
| Sciences / Spécialité | `#4B3A6B` (prune) | `#EEEAF4` |
| Autre | `#4F5E72` (ardoise) | `#EEF0F3` |

Attribution automatique dans cet ordre selon la position de la matière dans le programme.

**Couleurs des niveaux**

| Niveau | Couleur | Symbole |
|---|---|---|
| 1 · Application | `#4F5E72` (ardoise) | 1 point plein ● |
| 2 · Entraînement | `#264069` (encre lumineuse) | 2 points ●● |
| 3 · Approfondissement | `#B48A48` (or) | 3 points ●●● |

**Couleurs du classement** : 1er `#B48A48` (or) · 2e `#8C96A3` (argent) · 3e `#9A6A45` (bronze).

### A2.4 Dégradés autorisés (les seuls)

| Nom | Définition | Usage |
|---|---|---|
| **Nuit** | Linéaire vertical `#0D1B32` → `#081224` + halo radial `#264069` (opacité 1 → 0) centré à 78 % / 22 % | Fond des moments (comme l'accueil actuel) |
| **Aube or** | Linéaire 135° `#E4C997` → `#B48A48` | Uniquement : anneau de progression, médaille, badge premium, coin corné |
| **Voile papier** | Linéaire vertical `rgba(252,250,245,0)` → `#FCFAF5` | Bas des listes qui défilent sous un bouton fixe |

Aucun autre dégradé (pas de violet, pas d'arc-en-ciel, pas de néon).

### A2.5 Contrastes

Texte ≥ 4,5:1 ; grands chiffres et icônes ≥ 3:1. `gold` (#B48A48) n'est **jamais** utilisé pour du texte
de moins de 17 pt sur papier : utiliser `goldInk` (#7A5A24). Sur encre, l'or devient `goldLight`.

## A3. Typographie

Police unique : **Inter** (graisses 400, 500, 600, 700, 800 déjà embarquées).
Chiffres : toujours en **chiffres tabulaires** (`fontVariant: ['tabular-nums']`) pour que les compteurs
ne « dansent » pas.

| Style | Graisse | Taille / interligne | Approche | Usage |
|---|---|---|---|---|
| `display` *(nouveau)* | ExtraBold 800 | 40 / 44 | −1,2 | Chiffres héros : score, rang, pourcentage |
| `hero` *(nouveau)* | Bold 700 | 30 / 36 | −0,8 | Titres des moments (accueil, bilans) |
| `h1` | ExtraBold 800 | 28 / 34 | −0,5 | Titre d'écran |
| `h2` | Bold 700 | 22 / 28 | −0,3 | Titre de section, énoncé court |
| `h3` | SemiBold 600 | 17 / 22 | −0,2 | Titre de carte, consigne d'exercice |
| `body` | Regular 400 | 15 / 22 | −0,15 | Texte courant |
| `bodyMedium` | Medium 500 | 15 / 22 | −0,15 | Libellés de boutons, éléments de liste |
| `reading` *(nouveau)* | Regular 400 | 17 / 28 | −0,1 | Corps des leçons (réglable 15 → 21) |
| `caption` | Medium 500 | 13 / 18 | 0 | Métadonnées, légendes |
| `overline` | SemiBold 600 | 11 / 14 | +0,5, MAJUSCULES | Sur-titres de section |

## A4. Grille, espacement, formes

- **Marges latérales** : 20 pt (`layout.gutter`). **Espacement** : multiples de 4 (4, 8, 12, 16, 20, 24, 32, 40, 48).
- **Rythme vertical** : 24 pt entre sections, 12 pt entre cartes d'une même liste, 8 pt entre titre et sous-titre.
- **Zones tactiles** : 44 pt minimum ; lignes de liste 64 pt minimum ; boutons principaux 56 pt.
- **Rayons** : 8 (puces, petits badges) · 12 (champs, tuiles) · 16 (cartes, boutons) · 24 (feuilles
  modales, haut du panneau d'accueil) · 28 (panneau d'accueil existant) · plein (pastilles, avatars).
- **Zone du pouce** : toute action principale est dans le tiers inférieur de l'écran.

## A5. Profondeur et ombres

Le premium Fatafalta est **plat et lumineux** : on sépare par la couleur et les filets avant d'ajouter
une ombre.

| Niveau | Rendu | Usage |
|---|---|---|
| 0 | Aucun relief, filet `line` 1 px | Lignes de liste, sections |
| 1 | `shadows.card` (ombre encre, opacité 6 %, flou 12) | Cartes posées sur le papier |
| 2 | `shadows.cardHover` (opacité 12 %, flou 24) | Élément soulevé pendant un glisser |
| 3 | Feuille modale : ombre vers le haut 10 %, voile `backdrop` | Mini-cours, Raisonnement, sélecteurs |

## A6. Icônes

- Bibliothèque : **`lucide-react-native`** (déjà installée), trait **1,9**, extrémités arrondies.
- Tailles : 16 (dans un texte), 20 (listes, boutons), 24 (barre d'onglets, en-têtes), 28–32 (états vides).
- Couleur : `ink` (actif), `inkMuted` (inactif), `burgundy` (chevrons, liens), `goldLight` sur encre.

| Rôle | Icône Lucide |
|---|---|
| Onglet Prépa | `GraduationCap` |
| Onglet Sujets | `FileText` |
| Onglet Progrès | `ChartNoAxesColumnIncreasing` |
| Onglet Moi | `UserRound` |
| Continuer / lecture | `Play` |
| Leçon | `BookOpen` |
| Exercices | `PencilLine` |
| Révisions | `RotateCcw` |
| Cahier d'erreurs | `NotebookPen` |
| Concours blanc | `Timer` |
| Test de positionnement | `Target` |
| Série | `Flame` |
| Rang / classement | `Trophy` |
| Verrou | `Lock` |
| Validé | `Check` dans un disque |
| Indice | `Lightbulb` |
| Raisonnement IA | `Sparkles` |
| Hors ligne | `CloudDownload` / `CloudOff` |
| Changer de concours | `ChevronsUpDown` |
| Fermer / quitter | `X` |
| Retour | `ArrowLeft` |
| Signaler | `Flag` |

## A7. Logo

- **Symbole** : le F corné (`components/brand/BrandMark`, fichiers `assets/brand/*.svg`).
- **Sur fond encre** : variante `onDark` (F blanc, revers or).
- **Sur papier** : variante encre (F encre, revers or).
- **Où l'afficher** : intro animée (E00), en-tête de l'accueil (E01), écran Abonnement (E33), écran
  « Bon retour » (E35), filigrane très discret sur le bilan partageable (E25). **Pas** sur les écrans d'étude.
- Zone de protection : la moitié de la largeur du symbole autour du logo.

## A8. Illustrations

Style unique, dans la continuité de l'illustration d'accueil existante (`OrientationArt`) :
**vectorielle (SVG), géométrique, feuilles de papier légèrement inclinées, lignes de texte simulées,
pastilles or, tampon rond.** Pas de personnages, pas de photos, pas d'images bitmap (poids réduit,
netteté sur tous les écrans).

| Illustration | Écran | Description |
|---|---|---|
| **Pile de sujets + tampon or** | E01 (carte « Anciens sujets ») | Reprise de `OrientationArt` en vignette |
| **Carnet ouvert + chemin pointillé** | E01 (carte « Préparation »), E04 | Carnet ouvert sur un parcours de 4 jalons ronds reliés en pointillés, le dernier en or |
| **Boussole de papier** | E02 en-tête | Cercle de papier avec aiguille bordeaux / or |
| **Cible et feuille** | E28 Test de positionnement | Cible concentrique encre, feuille cornée plantée au centre |
| **Chronomètre de papier** | E29 Concours blanc | Cadran avec secteur or |
| **Podium de feuilles** | E31 Classement | Trois feuilles empilées en hauteurs différentes, coins cornés or |
| **Carnet d'erreurs** | E26 état vide | Carnet fermé avec marque-page bordeaux et coche or |
| **Nuage barré** | États hors ligne | Nuage au trait, barre bordeaux |
| **Coin corné** | Motif partout | Triangle or 14 × 14 pt en haut à droite d'une carte « maîtrisée » |

## A9. Fonds d'écran

| Type de fond | Composition | Écrans |
|---|---|---|
| **Nuit** | Dégradé Nuit (A2.4) + trame de points blancs (rayon 1, opacité 7 %, pas de 22 pt) + halo `inkGlow` | E01, E25 bilan, E27 célébrations, E33 Abonnement, E35 Bon retour, en-tête de E30 Progrès |
| **Papier** | Aplat `#FCFAF5` | Tous les écrans d'étude |
| **Papier ligné** *(nouveau)* | Aplat papier + lignes horizontales `line` à 4 % d'opacité tous les 28 pt (rappel de la copie) | Lecteur de leçon E10, zone d'exercice E13 |
| **Papier quadrillé** *(nouveau)* | Quadrillage 24 pt à 3 % | Réponse numérique E21, Relier E18 |

Aucune image photographique en fond.

## A10. Mouvement (Reanimated)

| Jeton | Valeur | Usage |
|---|---|---|
| `press` | 100 ms, échelle 0,97, `easeOut` | Appui sur toute carte / bouton |
| `enter` | 420 ms, fondu + translation 12 pt, `easeOut (0.16, 1, 0.3, 1)` | Entrée d'un écran / d'un bloc |
| `stagger` | 40 ms entre éléments, max 8 éléments | Listes à l'ouverture |
| `sheet` | ressort `damping 22, stiffness 220` (~300 ms) | Feuilles modales, accordéon |
| `snap` | ressort `damping 14, stiffness 260` (léger rebond) | Étiquette qui se pose, retour en réserve |
| `count` | 600 ms, `easeOut` | Compteurs qui défilent (score, rang, %) |
| `draw` | 350 ms | Tracé du cercle, du surligneur, des traits de liaison |
| `celebrate` | ≤ 1 200 ms | Célébrations |

Transitions de navigation : écrans poussés « glisser depuis la droite » (existant) ; lecteurs plein écran
(leçon, session) « montée depuis le bas » ; onglets : fondu croisé 150 ms.
**« Réduire les animations »** activé → fondus simples de 150 ms, aucun rebond, pas de confettis.

## A11. Haptique (`expo-haptics`)

| Événement | Retour |
|---|---|
| Sélection, dépliage, élément posé, changement de puce | `selectionAsync` |
| Bonne réponse | `notificationAsync(Success)` |
| Mauvaise réponse | `notificationAsync(Error)` |
| Élément soulevé (début de glisser) | `impactAsync(Light)` |
| Seuil franchi, fin de session, célébration | `notificationAsync(Success)` + `impactAsync(Medium)` 120 ms après |

## A12. Ton rédactionnel

- **Tutoiement**, phrases courtes, verbes d'action (« Continue », « Révise », « Vérifie »).
- Bienveillant, jamais infantilisant ; pas de points d'exclamation en série ; un seul émoji autorisé : 🔥
  pour la série (et seulement là).
- Erreur = « Pas tout à fait » / « Presque » ; jamais « Faux ! ».
- Chiffres toujours contextualisés : « 40ᵉ sur 50 », « 7 / 10 min », « 3 jours d'essai restants ».

---

# Partie B — Composants de base (apparence commune)

| Composant | Apparence |
|---|---|
| **Bouton principal** | Hauteur 56, rayon 16, fond `ink`, texte `bodyMedium` 16 blanc, icône 20 à droite. Pressé : échelle 0,98 + opacité 0,92. Désactivé : fond `lineStrong`, texte `inkMuted`. Chargement : indicateur blanc à la place de l'icône |
| **Bouton secondaire** | Hauteur 52, rayon 16, fond blanc, bordure `lineStrong` 1 px, texte `ink` |
| **Bouton tertiaire / lien** | Texte `bordeaux` `bodyMedium`, sans fond, zone tactile 44 |
| **Bouton or (premium)** | Hauteur 56, rayon 16, fond Aube or, texte `ink` SemiBold — réservé à « S'abonner » |
| **Carte** | Fond blanc, rayon 16, bordure `line` 1 px, ombre niveau 1, marge interne 16 |
| **Carte héros (Continuer)** | Fond `ink`, rayon 20, halo `inkGlow` en haut à droite, texte blanc, marge interne 20 |
| **Puce (chip)** | Hauteur 36, rayon plein, marge 14 ; repos : fond blanc, bordure `line`, texte `inkSoft` ; active : fond teinte de matière, texte blanc |
| **Ligne de liste** | Hauteur ≥ 64, icône ou pastille 40 à gauche, titre `bodyMedium`, sous-titre `caption inkSoft`, chevron bordeaux 16 à droite, filet `line` en bas |
| **Barre de progression** | Hauteur 6, rayon plein, rail `line`, remplissage `ink` (ou teinte de matière), animation `count` |
| **Anneau de progression** | Diamètre 44 (liste) / 120 (héros), trait 4 / 10, rail `line`, remplissage Aube or, pourcentage au centre |
| **Pastille de statut** | 24 pt : ○ rail `lineStrong` · ◐ demi-disque `ink` · ✓ disque `success` + coche blanche · 🔒 disque `paperDim` + cadenas `inkMuted` |
| **Badge** | Hauteur 22, rayon 8, `overline` ; variantes : or (`goldWash`/`goldInk`), bordeaux, succès, neutre |
| **Feuille modale** | Rayon haut 24, fond `paper`, poignée 36 × 4 `lineStrong` centrée, marge 20, voile `backdrop` |
| **Bandeau** | Hauteur 44, rayon 12, icône 18 + texte `caption` ; variantes info (encre), alerte (`warningWash`), hors ligne (`paperDim`) |
| **Squelette** | Blocs `skeleton` `#ECE7DC` avec reflet `paperDim` qui balaie en 1,2 s |
| **Barre d'onglets** | Hauteur 68, fond blanc, filet `line` en haut ; actif : icône + libellé `ink` + petite barre or 16 × 3 au-dessus de l'icône ; inactif : `inkMuted` ; pastille bordeaux 8 pt pour les révisions dues sur Prépa |

---

# Partie C — Écrans

Format de chaque fiche : **Rôle · Fond · Disposition (de haut en bas) · Contenus · Couleurs & polices ·
Icônes & illustrations · Animations · Haptique · États**.

Les écrans sont listés **dans l'ordre du parcours**, du premier lancement à la fin.

## Carte des écrans

| N° | Écran | Type |
|---|---|---|
| E00 | Intro animée (existante) | Moment |
| E01 | Que veux-tu faire ? | Moment |
| E02 | Quel concours ? (accordéon) | Étude |
| E03 | Ton rythme (objectif quotidien + test proposé) | Feuille |
| E04 | Prépa — premier jour | Onglet |
| E05 | Prépa — en cours | Onglet |
| E06 | Feuille « Changer de concours » | Feuille |
| E07 | Feuille « Essai » (détail des jours) | Feuille |
| E08 | Module | Écran poussé |
| E09 | Feuille « Pack hors ligne » | Feuille |
| E10 | Leçon (lecteur) | Plein écran |
| E11 | Mini-question dans la leçon | Bloc |
| E12 | Leçon terminée | Plein écran |
| E13 | Session — cadre commun | Plein écran |
| E14 | Exercice : Glisser pour compléter | Contenu de session |
| E15 | Exercice : Entourer | Contenu de session |
| E16 | Exercice : Remettre dans l'ordre | Contenu de session |
| E17 | Exercice : Classer | Contenu de session |
| E18 | Exercice : Relier | Contenu de session |
| E19 | Exercice : Vrai / Faux rapide | Contenu de session |
| E20 | Exercice : QCM | Contenu de session |
| E21 | Exercice : Réponse numérique | Contenu de session |
| E22 | Exercice : Surligner | Contenu de session |
| E23 | Bandeau de correction (juste / faux) | Bloc |
| E24 | Feuille « Mini-cours » | Feuille |
| E25 | Feuille « Raisonnement » + verdict IA | Feuille |
| E26 | Quitter la session (confirmation) | Dialogue |
| E27 | Bilan de session | Moment |
| E28 | Célébrations (module validé, niveau 3, objectif, série) | Superposition |
| E29 | Révisions du jour / Cahier d'erreurs | Écran poussé |
| E30 | Fiche d'erreur | Feuille |
| E31 | Test de positionnement (intro, session, bilan) | Plein écran |
| E32 | Concours blanc (intro, session, grille, bilan) | Plein écran |
| E33 | Progrès | Onglet |
| E34 | Candidats du cycle (classement) | Écran poussé |
| E35 | Profil d'un candidat | Écran poussé |
| E36 | Abonnement | Moment |
| E37 | Verrou « Abonnés » | Feuille |
| E38 | Bon retour (réinstallation) | Moment |
| E39 | Moi (partie préparation) | Onglet |
| E40 | États transverses (chargement, vide, erreur, hors ligne) | Gabarits |

---

## E00 — Intro animée (existante, conservée)

- **Rôle** : relais du splash natif, une fois par lancement à froid.
- **Fond** : `ink` uni.
- **Contenu** : symbole F (160 pt) centré ; le coin se plie (le revers or apparaît), puis « Fatafalta »
  apparaît sous le symbole ; fondu vers E01 ou vers l'onglet d'ouverture.
- **Animation** : ~1,3 s (pliure 520 ms, mot-symbole 380 ms, sortie 320 ms) ; un appui l'abrège ;
  « Réduire les animations » → simple fondu. **Ne pas modifier.**

---

## E01 — « Que veux-tu faire ? »

- **Rôle** : premier choix, une seule fois. Doit donner envie, en un coup d'œil.
- **Fond** : **Nuit** plein écran (dégradé + halo en haut à droite + trame de points), barre d'état claire.
- **Disposition** (sans défilement) :
  1. **Haut** (marge sûre + 16) : symbole F `onDark` 28 pt + « Fatafalta » Bold 17 blanc + filet tricolore
     🇨🇮 (3 bandes de 7 × 3 pt : `#F77F00`, `#FFFFFF`, `#009E60`) — repris de l'accueil existant.
  2. **Titre** (marge haute 40) : `hero` blanc sur deux lignes : « Réussis ton concours, **à ton rythme.** »
     (« à ton rythme. » en `goldLight`). Sous-titre `body` `onInkSoft` : « Cours, exercices et anciens sujets,
     réunis en une seule application. »
  3. **Deux cartes de choix** empilées (marge 12), occupant le reste de l'espace, alignées vers le bas :
     - **Carte « Me préparer à un concours »** (carte principale, hauteur ~200) : fond `paper`, rayon 24 ;
       à droite, illustration **Carnet ouvert + chemin pointillé** (140 × 140) débordant légèrement du
       bord haut ; à gauche : badge or « Nouveau », titre `h2` encre « Me préparer », texte `caption inkSoft`
       « Cours en modules, exercices du simple à l'avancé, suivi de ta progression » ; en bas : lien
       « Commencer » `bodyMedium` bordeaux + flèche. **Coin corné or** en haut à droite.
     - **Carte « Consulter les anciens sujets »** (hauteur ~120) : fond `rgba(255,255,255,0.06)`, bordure
       `rgba(255,255,255,0.14)`, rayon 20 ; vignette `OrientationArt` (72 pt) à gauche ; titre `h3` blanc
       « Anciens sujets » ; texte `caption onInkSoft` « Concours et examens, avec leurs corrigés » ; chevron `goldLight`.
  4. **Bas** : texte `caption onInkSoft` centré « Tu pourras passer de l'un à l'autre à tout moment. »
- **Animations** : halo qui « respire » très lentement (opacité 0,85 ↔ 1 sur 6 s) ; titre `enter` (délai 120) ;
  cartes `enter` échelonnées (200, 260 ms) ; le chemin pointillé de l'illustration **se dessine** (800 ms)
  puis le dernier jalon s'allume en or ; appui sur une carte : `press`.
- **Haptique** : `selectionAsync` au choix.
- **États** : aucun chargement (écran 100 % local).

---

## E02 — « Quel concours ? » (accordéon organismes → cycles)

- **Rôle** : choisir son organisme puis son sous-organisme (cycle).
- **Fond** : **Papier**.
- **Disposition** :
  1. **En-tête** (marge sûre + 8) : bouton retour `ArrowLeft` 24 (cercle 40, fond `paperDim`) ; à droite,
     indicateur d'étape « 1 / 2 » `caption inkMuted`.
  2. **Titre** : sur-titre `overline` bordeaux « PRÉPARATION » ; titre `h1` « Quel concours prépares-tu ? » ;
     sous-titre `body inkSoft` « Choisis l'organisme, puis ton cycle. ». Illustration **Boussole de papier**
     (56 pt) alignée à droite du titre.
  3. **Recherche** (si > 6 organismes) : champ hauteur 48, rayon 12, fond blanc, bordure `line`, icône `Search`
     `inkMuted`, texte d'aide « Rechercher un organisme ou un cycle ». Devient collante en haut au défilement.
  4. **Liste d'organismes** (cartes séparées de 10 pt) :
     - **Fermé** : carte blanche hauteur 72, rayon 16, bordure `line` ; logo de l'organisme (44 pt, rayon 12,
       composant `OrganismeLogo` existant) ; nom `bodyMedium` encre (1 ligne) ; sous-texte `caption inkSoft`
       « 3 cycles disponibles » ; chevron `ChevronRight` bordeaux 18 à droite.
     - **Ouvert** : la même carte s'agrandit ; bordure passe à `ink` 1,5 px ; ombre niveau 1 ; chevron pivoté
       à 90° ; sous l'en-tête, filet `line` puis la **liste des cycles** : lignes de 56 pt, retrait 72 pt
       (alignées sous le nom), pastille radio 22 pt à droite, nom du cycle `bodyMedium`, sous-texte `caption`
       « 12 modules · 4 matières ». Cycle non publié : opacité 0,45 + badge neutre « Bientôt » + lien
       « Me prévenir » bordeaux.
     - **Cycle choisi** : fond `goldWash` sur la ligne, radio remplie `ink` avec coche blanche dessinée.
  5. **Bas** (fixe, sur Voile papier) : bouton principal « Continuer » désactivé tant qu'aucun cycle n'est
     choisi ; une fois choisi, son libellé devient « Continuer avec Cycle B ».
- **Animations** :
  - ouverture : hauteur `sheet` (~280 ms), chevron 0 → 90°, cycles en `stagger` 35 ms (fondu + translation 8 pt) ;
  - un seul ouvert : la fermeture du précédent et l'ouverture du nouveau sont **simultanées** ;
  - défilement doux pour amener l'organisme ouvert à 96 pt du haut ;
  - choix d'un cycle : la radio se remplit (échelle 0 → 1, `snap`) puis la coche se dessine (`draw` 250 ms) ;
    le bouton du bas passe de désactivé à actif (fondu de couleur 200 ms) ;
  - recherche : les organismes non concernés se replient en fondu ; l'organisme trouvé s'ouvre, le cycle
    trouvé a son texte correspondant surligné en `goldWash`.
- **Haptique** : `selectionAsync` à l'ouverture et au choix ; `Success` à « Continuer ».
- **États** : chargement = 6 squelettes de cartes ; erreur = illustration nuage barré + « Connexion
  impossible » + bouton « Réessayer » (liste en cache affichée si elle existe, avec bandeau hors ligne) ;
  aucun résultat de recherche = « Aucun organisme ne correspond à “xyz” ».

---

## E03 — « Ton rythme » (feuille)

- **Rôle** : fixer l'objectif quotidien et proposer le test de positionnement, juste après E02.
- **Fond** : feuille modale `paper` (hauteur ~70 %) sur l'onglet Prépa assombri.
- **Disposition** :
  1. Poignée ; sur-titre `overline` bordeaux « ÉTAPE 2 / 2 » ; titre `h2` « Combien de temps par jour ? ».
  2. **Trois tuiles** côte à côte (rayon 16, hauteur 112) : « 5 min · Tranquille », « 10 min · Régulier »
     (présélectionnée, badge or « Conseillé »), « 20 min · Intensif ». Chiffre en `display` 32, libellé en
     `caption`. Sélection : bordure `ink` 2 px + fond blanc + ombre 1 ; non sélectionnées : fond `paperDim`.
  3. Encart `goldWash` rayon 16 : icône `Target` or, titre `h3` « Faire le test de positionnement ? »,
     texte `caption` « 5 minutes pour savoir par où commencer. » ; deux boutons en ligne :
     « Faire le test » (secondaire) · « Plus tard » (lien).
  4. Bouton principal « C'est parti ».
- **Animations** : montée `sheet` ; sélection de tuile : `snap` + chiffre qui grossit de 4 %.
- **Haptique** : `selectionAsync` par tuile ; `Success` sur « C'est parti ».

---

## E04 — Onglet Prépa : premier jour

- **Rôle** : accueil de la préparation quand rien n'a commencé. Donner une seule action évidente.
- **Fond** : **Papier** ; en-tête sur bande **Nuit** courte (hauteur ~210 avec la zone sûre) dont le bas
  est arrondi (rayon 28), qui se replie au défilement.
- **Disposition** :
  1. **En-tête Nuit** :
     - ligne 1 : sélecteur de programme : logo organisme 28 pt + « ENA · Cycle B » `bodyMedium` blanc +
       `ChevronsUpDown` 16 `onInkSoft` (zone tactile complète) ; à droite pastille série « 🔥 0 » (fond
       `rgba(255,255,255,0.08)`, rayon plein).
     - ligne 2 : titre `hero` blanc « Bienvenue, Baobab-4821 » (pseudonyme en `goldLight`).
     - ligne 3 : **bandeau d'essai** (visiteur) : pastille translucide « Essai gratuit · 7 jours d'étude
       offerts » + lien « Comment ça marche ? » → E07.
  2. **Carte héros « Commencer »** (chevauche le bas de l'en-tête de 32 pt) : carte blanche rayon 20,
     ombre 2 ; illustration **Carnet ouvert** 96 pt à droite ; sur-titre `overline` or « TON POINT DE DÉPART » ;
     titre `h2` « Culture générale · Module 1 » ; `caption` « 3 leçons · 25 min · Les institutions » ;
     bouton principal pleine largeur « Commencer la leçon 1 » (icône `Play`).
  3. **Puces de matières** (défilement horizontal, première puce « Toutes » active).
  4. **Section « Ton parcours »** : sur-titre `overline` + liste des modules (lignes de module, voir E05),
     tous au statut ○, le module 1 mis en avant par un filet or à gauche (3 pt).
  5. **Section « Pour aller plus loin »** : deux tuiles côte à côte (rayon 16, fond blanc) :
     « Test de positionnement » (`Target`) et « Concours blanc » (`Timer`), chacune avec `caption` d'une ligne.
- **Animations** : à la première arrivée : en-tête en fondu, carte héros `enter` avec léger dépassement
  (`snap`), liste en `stagger` ; au défilement : l'en-tête Nuit se réduit en barre compacte de 56 pt
  (sélecteur seul, titre en fondu), avec ombre d'apparition.
- **Haptique** : `selectionAsync` sur puces.
- **États** : programme sans module publié → illustration carnet + « Les cours de ce cycle arrivent bientôt »
  + bouton « Me prévenir » + lien « Voir les anciens sujets ».

---

## E05 — Onglet Prépa : en cours (écran principal)

- **Rôle** : tableau de bord quotidien, tout sur un écran.
- **Fond** : identique à E04 (en-tête Nuit repliable + papier).
- **Disposition** :
  1. **En-tête Nuit** :
     - ligne 1 : sélecteur de programme + pastille « 🔥 6 » (flamme or si l'objectif du jour est atteint,
       sinon `onInkSoft`).
     - ligne 2 : à gauche **anneau de progression héros** (88 pt, trait 8, Aube or, « 42 % » en `h2` blanc au
       centre, `caption` « du parcours » dessous) ; à droite deux statistiques empilées : « Objectif du jour »
       + jauge horizontale (7 / 10 min) ; « Rang » « **40ᵉ** sur 50 » + flèche verte « ▲ 3 ».
     - ligne 3 (visiteur) : bandeau d'essai « Essai : 4 jours restants · 2 vérifications IA » + chevron → E07 ;
       passe en `warningWash` / texte `warning` à 2 jours ou moins.
  2. **Carte héros « Continuer »** (chevauche l'en-tête) : carte **encre** rayon 20 (contraste avec le papier),
     halo `inkGlow` ; sur-titre `overline goldLight` « CONTINUER » ; titre `h3` blanc « Leçon 2 · Les
     collectivités territoriales » ; `caption onInkSoft` « Culture générale · Module 3 » ; barre de progression
     fine `goldLight` (60 %) ; bouton rond 48 pt fond `goldLight` avec `Play` encre à droite.
  3. **Carte « À réviser aujourd'hui »** : carte blanche, coin corné or ; icône `RotateCcw` dans un disque
     `burgundyWash` ; titre `bodyMedium` « 12 questions à réviser » ; `caption` « 4 erreurs · 8 révisions
     programmées » ; chevron. Si 0 : ligne compacte « Tout est à jour » avec coche `success`.
  4. **Puces de matières** (collantes sous l'en-tête replié au défilement).
  5. **Liste des modules** (une carte par module, 76 pt) :
     - gauche : **anneau de module** 44 pt (teinte de la matière) avec numéro du module au centre ;
     - centre : titre `bodyMedium` « Module 3 · Décentralisation » ; `caption inkSoft` « 3 leçons · Niveau 2 :
       64 % » ; pour un module en avance : badge neutre « Conseillé après M2 » ;
     - droite : pastille de statut ; module validé = coin corné or + anneau plein `success`.
  6. **Tuiles « Concours blanc » et « Test de positionnement »** (si non fait).
  7. Marge basse 24 au-dessus de la barre d'onglets.
- **Animations** : à l'arrivée, l'anneau héros se remplit de 0 au pourcentage (`count` 900 ms) et le chiffre
  défile ; le rang défile ; puces : la puce active glisse (pastille de fond animée entre puces, `sheet`) ;
  filtrage : les modules sortent / entrent en fondu + translation (`stagger` 30 ms) ; retour depuis une
  session : si le rang a changé, la flèche ▲ pulse une fois.
- **Haptique** : `selectionAsync` sur puces ; aucun sur le défilement.
- **États** : rafraîchissement par tirer-vers-le-bas (indicateur F corné qui se plie) ; hors ligne : bandeau
  « Hors ligne · tes réponses seront envoyées plus tard » ; **essai épuisé** : carte Continuer remplacée par
  une carte or « Ton essai est terminé — Continue avec l'abonnement » (bouton or), modules avec pastille 🔒,
  progression et rang toujours visibles.

---

## E06 — Feuille « Changer de concours »

- **Fond** : feuille modale `paper` (hauteur 85 %).
- **Disposition** : poignée ; titre `h2` « Changer de concours » ; section « Tes programmes » (programmes
  déjà commencés, chaque ligne avec mini-anneau de progression et coche sur l'actif) ; section « Tous les
  concours » = **accordéon identique à E02** ; bouton principal « Passer à ce programme ».
- **Animations** : `sheet` ; à la validation, la feuille se ferme et l'en-tête de Prépa fait un fondu
  croisé vers le nouveau programme (300 ms).

---

## E07 — Feuille « Essai »

- **Rôle** : expliquer clairement l'essai et ce qu'il reste.
- **Fond** : feuille `paper`.
- **Disposition** :
  1. Titre `h2` « Ton essai gratuit » ; `body inkSoft` « Un jour n'est compté que lorsque tu étudies. »
  2. **Frise de 7 jours** : 7 cercles de 36 pt reliés par un filet ; jours utilisés = disque `ink` avec date
     courte dessous (`caption`, ex. « 3 nov. ») ; aujourd'hui (si utilisé) = disque or avec halo ; jours
     restants = cercle vide `lineStrong`.
  3. Ligne `Sparkles` « Vérifications IA offertes : 2 / 3 » avec 3 petits points (pleins / vides).
  4. Encart `goldWash` « Avec l'abonnement » : 4 lignes avec coche or (préparation illimitée, vérification IA,
     concours blancs, tous les anciens sujets).
  5. Bouton or « Voir l'abonnement » ; lien « Plus tard ».
- **Animations** : les cercles se remplissent un par un (`stagger` 60 ms) à l'ouverture.

---

## E08 — Module

- **Rôle** : contenu d'un module, leçons et niveaux d'exercices.
- **Fond** : **Papier** ; en-tête coloré **léger** dans le fond de la teinte de matière (ex. `#E9EEF5`),
  bas arrondi 24.
- **Disposition** :
  1. **En-tête** : retour (cercle 40 blanc) ; à droite bouton `CloudDownload` (pack hors ligne → E09) ;
     pastille matière (point de teinte + « Culture générale » `caption`) ; titre `h1` « Décentralisation » ;
     sur-titre `overline` « MODULE 3 » au-dessus du titre ; à droite, anneau 64 pt (teinte matière) « 40 % ».
     Ligne de méta `caption` : « 3 leçons · 21 min · 36 exercices ».
  2. **Section « Leçons »** : lignes 64 pt : numéro dans un carré arrondi 32 (fond blanc, bordure `line`) →
     devient disque `success` + coche quand terminée ; titre `bodyMedium` ; `caption` « 8 min » ; leçon en cours :
     mini-barre de progression sous le titre ; icône `BookOpen` bordeaux à droite.
  3. **Section « Exercices de fixation »** : trois **cartes de niveau** (hauteur 84, rayon 16) :
     - symbole de niveau (●, ●●, ●●●) dans la couleur du niveau ;
     - titre `h3` « Niveau 1 · Application » ; `caption` « Questions directes sur chaque leçon · 12 questions » ;
     - à droite : meilleur score `h3` chiffres tabulaires « 8/10 » ou « — » ;
     - **verrouillé** (niveau 3) : fond `paperDim`, cadenas, `caption` « Atteins 70 % au niveau 2 » + mini-barre
       de progression vers 70 % ;
     - niveau 3 débloqué : bordure Aube or 1,5 px + badge or « Avancé ».
  4. **Section « Pour aller plus loin »** : ligne `FileText` « 3 anciens sujets liés » → onglet Sujets filtré.
  5. **Bouton fixe bas** : principal, contextuel : « Continuer la leçon 2 » / « Commencer le niveau 2 » /
     « Réviser ce module ».
- **Animations** : entrée : en-tête en fondu, anneau qui se remplit, sections en `stagger` ; niveau 3 qui vient
  de se débloquer : le cadenas s'ouvre (rotation de l'anse, 400 ms), la carte passe de `paperDim` à blanc avec
  un reflet or qui la traverse (600 ms).
- **États** : module sans exercices publiés pour un niveau : carte grisée « Bientôt » ; essai épuisé : boutons
  remplacés par « Débloquer avec l'abonnement » (or).

---

## E09 — Feuille « Pack hors ligne »

- **Disposition** : titre `h2` « Réviser sans connexion » ; illustration nuage + flèche ; contenu du pack
  (3 leçons, 36 exercices, 12 images) ; taille « 4,2 Mo » en `h3` ; bouton principal « Télécharger » ;
  pendant le téléchargement : anneau de progression 56 pt avec pourcentage ; terminé : coche `success` +
  « Disponible hors ligne ».
- **Animations** : anneau `count` ; coche dessinée `draw`.

---

## E10 — Leçon (lecteur)

- **Rôle** : lecture confortable et interactive.
- **Fond** : **Papier ligné** (lignes à 4 % alignées sur l'interligne 28 du texte).
- **Disposition** :
  1. **Barre supérieure** (56 pt, fond `paper` à 92 % + flou) : `X` (quitter) ; au centre `caption inkSoft`
     « Leçon 2 / 3 » ; à droite bouton « Aa » (taille du texte) ; sous la barre, **barre de lecture** 3 pt
     pleine largeur, remplissage `ink`.
  2. **Corps** (marges 24) :
     - sur-titre `overline` dans la teinte de matière « CULTURE GÉNÉRALE · MODULE 3 » ;
     - titre `h1` « Les collectivités territoriales » ;
     - méta `caption inkMuted` « 8 min de lecture » ;
     - blocs (style `reading` 17/28) :
       - **Texte** : paragraphes séparés de 16 ; gras en SemiBold ; termes clés soulignés d'un trait or 2 pt ;
       - **À retenir** : fond `goldWash`, filet gauche or 3 pt, rayon 12, icône `Bookmark` or, titre `overline goldInk` ;
       - **Piège fréquent** : fond `burgundyWash`, filet bordeaux, icône `TriangleAlert` ;
       - **Exemple** : fond blanc, bordure `line`, repliable (chevron) ;
       - **Image / schéma** : rayon 12, légende `caption` centrée, appui → plein écran zoomable ;
       - **Tableau** : en-têtes `overline` sur fond `paperDim`, lignes alternées ;
       - **Mini-question** : voir E11 ;
       - **Récapitulatif** : liste numérotée dans une carte encre (texte blanc, numéros `goldLight`).
  3. **Pied** (fixe, apparaît après 90 % de lecture) : bouton principal « Terminer la leçon ».
- **Animations** : barre de lecture liée au défilement ; blocs qui entrent en fondu léger (une seule fois) ;
  « Aa » ouvre un petit sélecteur flottant (A− · curseur · A+) ; changement de taille animé (200 ms).
- **Haptique** : aucun pendant la lecture (calme) ; `selectionAsync` sur « Aa ».
- **États** : reprise : à l'ouverture, défilement doux jusqu'à la dernière position + bulle « Reprise où tu
  t'étais arrêté » (2 s).

---

## E11 — Mini-question intégrée (bloc de leçon)

- **Disposition** : carte blanche rayon 16, bordure `ink` 1,5 px ; badge `overline` « TESTE-TOI » (encre) ;
  énoncé `h3` ; interaction compacte (QCM 2–4 choix, vrai/faux, ou glisser 1–2 étiquettes) ; bouton
  secondaire « Vérifier » ; correction en ligne (fond `successWash` / `errorWash` + phrase d'explication).
- **Animations** : comme les exercices (E14–E22) mais compactes ; pas de seconde chance.

---

## E12 — Leçon terminée

- **Fond** : **Papier** avec cercle de halo or très léger (radial `goldWash` → transparent) derrière l'icône.
- **Disposition** : icône disque `success` 72 pt avec coche ; titre `h1` « Leçon terminée » ; `body` « Les
  collectivités territoriales » ; carte « Ce qu'il faut retenir » (3–5 puces) ; statistiques en ligne :
  « 8 min » · « +1 leçon » · objectif du jour (jauge) ; boutons : principal « Passer aux exercices »,
  secondaire « Leçon suivante », lien « Retour au module ».
- **Animations** : la coche se dessine (`draw` 400 ms) ; la jauge d'objectif avance (`count`) ; si l'objectif
  du jour est atteint → E28 (variante objectif).
- **Haptique** : `Success`.

---

## E13 — Session d'exercices : cadre commun

- **Rôle** : enveloppe identique pour tous les types d'exercices.
- **Fond** : **Papier** (zone d'exercice en Papier ligné pour les types textuels).
- **Disposition** :
  1. **Barre supérieure** (56 pt) : `X` (→ E26) ; **barre de progression segmentée** au centre (un segment par
     question, 4 pt, espacés de 3 ; segment juste `success`, faux `error`, seconde chance réussie `warning`,
     à venir `line`, en cours `ink`) ; à droite bouton `Lightbulb` (indice ; badge « −20 % » au premier appui).
  2. **Zone consigne** : badge de niveau (●● « Niveau 2 ») + type (`caption inkMuted` « Glisser pour compléter ») ;
     consigne `h3` encre (max 3 lignes).
  3. **Zone d'interaction** : spécifique au type (E14–E22), occupe l'espace central, défilable si nécessaire.
  4. **Zone d'action** (fixe en bas, fond `paper`, filet `line`) : bouton principal **« Vérifier »**
     (désactivé tant que la réponse est incomplète) → après correction : **« Continuer »** ; au-dessus,
     bandeau de correction E23.
  5. Menu `⋯` (dans la barre supérieure, à côté de l'indice) : « Signaler un problème ».
- **Animations** : changement de question = la question sortante glisse vers la gauche (‑24 pt + fondu,
  220 ms), l'entrante arrive de la droite ; segment de progression qui se colore (`snap`) ;
  indice : bulle `goldWash` qui se déploie sous la consigne.
- **Haptique** : voir A11.
- **États** : chargement = squelette de consigne + 4 blocs ; erreur réseau à la vérification = bandeau
  « Réponse enregistrée, correction dès le retour du réseau » (hors ligne : correction locale via pack).

---

## E14 — Exercice : Glisser pour compléter

- **Disposition** :
  - **Texte à trous** en `reading` 17/28 sur papier ligné ; chaque trou = **emplacement** pointillé
    `lineStrong` 1,5 px, rayon 8, largeur ajustée à l'étiquette la plus longue, hauteur 36.
  - **Réserve** (bas de la zone, fond `paperDim`, rayon 16, marge 12) : **étiquettes** = pastilles blanches
    hauteur 40, rayon 10, bordure `lineStrong`, ombre 1, texte `bodyMedium`, disposées en flux sur plusieurs lignes.
- **Interactions** :
  - glisser : l'étiquette se soulève (échelle 1,06, ombre 2, rotation 2° selon la direction) ;
  - au survol d'un emplacement : il passe en bordure pleine `ink` + fond `paperDim` et « aimante »
    l'étiquette quand elle est à < 24 pt ;
  - relâcher : `snap` dans l'emplacement (l'emplacement épouse sa taille) ; relâcher ailleurs : retour en
    réserve avec rebond ; l'emplacement vide laissé dans la réserve garde un fantôme pointillé ;
  - alternative : toucher une étiquette (elle se soulève, bordure `ink`), puis toucher l'emplacement.
- **Correction** : étiquettes justes → fond `successWash`, bordure `success`, petite coche ; fausses → fond
  `errorWash`, secousse horizontale (3 oscillations, 300 ms), puis retour en réserve pendant que la bonne
  étiquette vole jusqu'à l'emplacement (bordure pointillée `success`).

## E15 — Exercice : Entourer

- **Disposition** : propositions en **nuage** (pastilles de texte sans bordure, `h3` encre, espacées de 16)
  ou **dans un texte** (mots cliquables légèrement soulignés en pointillés `lineStrong`).
- **Interactions** : toucher → un **cercle de stylo** bordeaux (trait 2,5, légèrement irrégulier, ouverture
  de 10° en fin de tracé pour l'effet « fait main ») se dessine autour (`draw` 350 ms) ; toucher à nouveau →
  le cercle s'efface en sens inverse. Compteur optionnel « 2 / 3 sélectionnées » `caption`.
- **Correction** : cercle juste → devient `success` ; sélection fausse → cercle `error` + texte barré ;
  bonne réponse oubliée → cercle pointillé `success` dessiné ensuite.

## E16 — Exercice : Remettre dans l'ordre

- **Disposition** : liste verticale de cartes blanches (hauteur 56, rayon 12) avec poignée `GripVertical`
  `inkMuted` à droite et numéro de position `caption` à gauche (cercle 24).
- **Interactions** : appui long (250 ms) → carte soulevée (échelle 1,04, ombre 2, `impactAsync Light`) ; glisser ;
  les autres cartes s'écartent (`sheet`) ; relâcher → `snap`. Alternative : boutons ↑ ↓ apparaissent quand
  une carte est touchée.
- **Correction** : cartes bien placées `success` ; mal placées : glissent jusqu'à leur bonne position
  (300 ms, échelonné), puis numéro `error` barré + bon numéro `success`.

## E17 — Exercice : Classer dans des catégories

- **Disposition** : 2 à 4 **bacs** en haut (grille 2 colonnes, hauteur 120, rayon 16, fond blanc, bordure
  pointillée, titre `overline` + compteur) ; **pile de cartes** en bas (cartes 64 pt empilées avec décalage
  de 4 pt, seule celle du dessus est manipulable).
- **Interactions** : glisser la carte du dessus vers un bac ; le bac survolé s'agrandit de 3 % et sa bordure
  devient pleine `ink` ; déposée, la carte se réduit en pastille dans le bac ; la carte suivante monte.
- **Correction** : pastilles justes `success`, fausses `error` qui volent vers le bon bac.

## E18 — Exercice : Relier

- **Fond de zone** : Papier quadrillé.
- **Disposition** : deux colonnes de cartes (largeur 44 % chacune, hauteur 52, rayon 12) ; un **point d'ancrage**
  (disque 12 pt `lineStrong`) au bord intérieur de chaque carte.
- **Interactions** : glisser depuis un ancrage → **trait courbe** (Bézier) bordeaux 2,5 pt qui suit le doigt ;
  relâcher sur l'ancrage d'en face → le trait s'accroche, les deux ancrages deviennent pleins `ink` ;
  toucher un trait → il s'efface. Alternative : toucher gauche puis droite.
- **Correction** : traits justes `success`, faux `error` en pointillés qui s'effacent, bons traits dessinés
  en `success` (`draw`).

## E19 — Exercice : Vrai / Faux rapide

- **Disposition** : **carte centrale** (largeur 88 %, hauteur ~300, rayon 24, fond blanc, ombre 2) avec
  l'affirmation en `h2` ; derrière, les deux cartes suivantes en pile (échelle 0,95 / 0,90) ; sous la carte,
  deux boutons ronds 64 pt : « Faux » (`X`, bordure `error`) et « Vrai » (`Check`, bordure `success`) ;
  minuterie optionnelle : fine barre en haut de la carte qui se vide.
- **Interactions** : balayer → la carte s'incline (jusqu'à 12°) et se teinte progressivement (`errorWash` à
  gauche, `successWash` à droite) avec le mot « FAUX » / « VRAI » en tampon (`overline` 20, rotation −12°,
  bordure 2 pt) ; au-delà de 30 % de largeur → la carte s'envole hors écran.
- **Correction** : immédiate (tampon vert / rouge + phrase d'explication en bas de carte) ou en fin de série.

## E20 — Exercice : QCM

- **Disposition** : énoncé `h2` ; propositions = **cartes larges** (hauteur ≥ 60, rayon 14, fond blanc,
  bordure `line`) avec lettre dans un carré 32 (A, B, C, D ; fond `paperDim`) et texte `bodyMedium` ;
  QCM multiple : la lettre devient une case à cocher, mention `caption` « Plusieurs réponses possibles ».
- **Interactions** : appui → bordure `ink` 2 pt, lettre fond `ink` texte blanc, `press` ;
- **Correction** : bonne → fond `successWash`, lettre `success`, icône coche ; choix faux → `errorWash` +
  secousse ; bonne réponse non choisie → bordure pointillée `success`.

## E21 — Exercice : Réponse numérique

- **Fond de zone** : Papier quadrillé.
- **Disposition** : énoncé ; **afficheur** centré : nombre en `display` 40 encre, curseur clignotant
  bordeaux, unité `h3 inkSoft` à droite ; **pavé numérique intégré** (grille 3 × 4, touches 64 pt, rayon 14,
  fond blanc, chiffres `h2`) avec touches « , », « ± », « ⌫ ».
- **Interactions** : touche → `press` + `selectionAsync` ; le chiffre tapé entre par le bas (120 ms).
- **Correction** : afficheur `success` / `error` ; si faux, bonne valeur affichée dessous + bouton « Voir le
  calcul » qui déplie les étapes.

## E22 — Exercice : Surligner

- **Fond de zone** : Papier ligné ; texte en `reading`.
- **Interactions** : glisser le doigt sur les mots → **surligneur** `goldLight` à 55 % d'opacité, extrémités
  légèrement biseautées, qui se dessine sous les mots (`draw` suivi du doigt) ; toucher un passage surligné
  → il s'efface. Loupe au-dessus du doigt pendant le glisser (zoom 1,4).
- **Correction** : segments justes → surlignage `successWash` + soulignement `success` ; faux → `errorWash` barré ;
  oubliés → contour pointillé `success`.

---

## E23 — Bandeau de correction

- **Disposition** : bandeau qui monte au-dessus du bouton (rayon haut 20, marge 20) :
  - **Juste** : fond `successWash`, icône disque `success` + coche ; titre `h3` `success` « Bien joué » ;
    explication `body` (2–3 lignes, « Lire plus » si plus long) ; si question « raisonnement » : deux boutons
    en ligne : secondaire « Expliquer mon raisonnement » (`Sparkles`, + compteur visiteur « 2 offertes »)
    et principal « Question suivante ».
  - **Faux (1re fois)** : fond `errorWash`, titre `error` « Pas tout à fait » ; texte « Petit rappel avant de
    réessayer » ; bouton principal « Voir le rappel » → E24.
  - **Faux (seconde chance ratée)** : fond `errorWash`, titre « La bonne réponse » + explication détaillée ;
    mention `caption` avec `NotebookPen` « Ajoutée à ton cahier d'erreurs » ; bouton « Continuer ».
  - **Juste en seconde chance** : fond `warningWash`, titre `warning` « Bien rattrapé » + « 50 % des points ».
- **Animations** : montée `sheet` ; icône qui « pop » (échelle 0 → 1,1 → 1) ; mention cahier d'erreurs :
  l'icône carnet fait une petite rotation (−8° → 0).
- **Haptique** : `Success` / `Error`.

---

## E24 — Feuille « Mini-cours »

- **Fond** : feuille `paper` (hauteur max 80 %), voile `backdrop` ; question en arrière-plan floutée (flou 12).
- **Disposition** :
  1. Poignée ; pastille `overline` bordeaux « RAPPEL » + nom de la notion `caption inkSoft`.
  2. Titre `h2` (ex. « Région ou district ? »).
  3. Corps `reading` (≤ 150 mots) ; un encart « À retenir » (`goldWash`) ; schéma optionnel.
  4. Lien bordeaux « Voir la leçon complète ».
  5. Bouton principal « Réessayer » (icône `RotateCcw`).
- **Animations** : `sheet` ; contenu en `stagger` ; « Réessayer » → la feuille descend, la question se
  « réinitialise » (les éléments reviennent en place et se re-mélangent : chaque élément glisse vers sa
  nouvelle position, 350 ms), le segment de progression passe en hachures `warning` (seconde chance).
- **Geste** : glisser vers le bas → dialogue « Passer la seconde chance ? » (E26 variante).

---

## E25 — Feuille « Raisonnement » et verdict IA

- **Fond** : feuille `paper` (hauteur 90 %, s'adapte au clavier).
- **Disposition — saisie** :
  1. Pastille `Sparkles` or + `overline goldInk` « EXPLIQUE TON RAISONNEMENT » ; `caption inkSoft`
     « Facultatif · vérifié par l'IA ».
  2. Rappel de la question en une ligne (`caption`, tronqué) et de ta réponse (badge `success`).
  3. Champ multiligne (hauteur min 160, rayon 14, fond blanc, bordure `line`, focus bordure `ink`) ; aide
     « J'ai d'abord… puis… donc… » ; compteur « 0 / 1000 ».
  4. Boutons : principal « Vérifier mon raisonnement » ; lien « Passer ».
  5. Visiteur : `caption` « 2 vérifications offertes restantes » avec 3 points.
- **Disposition — analyse** : le champ se réduit en citation (fond `paperDim`, italique) ; animation d'attente :
  trois points or qui pulsent + phrase qui alterne (« Lecture de ta démarche… », « Comparaison avec les
  étapes clés… »).
- **Disposition — verdict** :
  - en-tête : **Exact** (disque `success`, « Bien raisonné ») / **Partiel** (disque `warning`, « Tu y es
    presque ») / **Faux** (disque `error`, « Reprenons la logique ») ;
  - **étapes clés** : liste avec pastilles ✓ (`success`) / ○ (`inkMuted`, étape manquante, texte en `inkSoft`) ;
  - explication `body` (≤ 120 mots) dans une carte blanche ;
  - lien `Flag` « Je conteste ce verdict » ;
  - bouton principal « Question suivante ».
- **Variante « plus de vérifications »** (visiteur à 0) : illustration Sparkles dans un disque `goldWash`,
  titre « Vérification réservée aux abonnés », bouton or « S'abonner », lien « Question suivante ».
- **Animations** : transitions saisie → analyse → verdict en fondu croisé dans la même feuille (pas de
  nouvelle fenêtre) ; étapes clés qui se cochent l'une après l'autre (`stagger` 120 ms).

---

## E26 — Quitter la session (dialogue)

- **Disposition** : dialogue centré (rayon 20, largeur 88 %) : titre `h3` « Quitter la session ? » ; `body`
  « Ta progression est enregistrée. Tu reprendras à la question 7. » ; boutons : principal « Continuer la
  session », lien `error` « Quitter ».
- Variante seconde chance : « Passer la seconde chance ? — La question sera ajoutée à ton cahier d'erreurs. »

---

## E27 — Bilan de session

- **Rôle** : moment de fierté, motiver à continuer.
- **Fond** : **Nuit** plein écran.
- **Disposition** :
  1. `X` en haut à gauche (`onInkSoft`).
  2. **Score héros** : anneau 160 pt (trait 12, Aube or) ; au centre « 8/10 » en `display` blanc ; dessous
     `overline goldLight` « NIVEAU 2 · DÉCENTRALISATION ».
  3. Titre `hero` blanc selon le score : ≥ 80 % « Excellente session » · 50–79 % « Bonne progression » ·
     < 50 % « Chaque erreur te fait avancer ».
  4. **Trois statistiques** en ligne (cartes translucides `rgba(255,255,255,0.06)`, rayon 16) : « 6 du premier
     coup » · « 2 rattrapées » · « 2 au cahier d'erreurs ».
  5. **Rang** : ligne « Classement · **38ᵉ** sur 50 · ▲ 2 » avec `Trophy` `goldLight`.
  6. Seuil franchi (si applicable) : encart or « Niveau 3 débloqué » / « Module validé ».
  7. Boutons (sur panneau `paper` arrondi 28 en bas, comme l'accueil existant) : principal « Continuer »
     (vers l'étape suivante logique), secondaire « Revoir mes erreurs », lien « Recommencer ».
- **Animations** : anneau qui se remplit (900 ms) + chiffre qui défile ; statistiques en `stagger` ; rang qui
  défile de l'ancien au nouveau ; si ≥ 80 % : pluie fine de 24 confettis **rectangulaires** encre, or et
  papier (pas de couleurs vives), 1 200 ms.
- **Haptique** : `Success` + `Medium` à la fin du remplissage.

---

## E28 — Célébrations (superposition)

Variantes, toutes sur voile `backdrop` + carte centrale `ink` (rayon 28) :

| Variante | Visuel | Texte |
|---|---|---|
| **Module validé** | Grande feuille avec coin or qui se **corne** (animation de pliure du logo réutilisée) | « Module 3 validé » + « 3 / 12 modules » |
| **Niveau 3 débloqué** | Cadenas or qui s'ouvre + 3 points de niveau qui s'allument | « Niveau avancé débloqué » |
| **Objectif du jour atteint** | Jauge circulaire or qui se ferme + 🔥 | « Objectif atteint · série de 6 jours » |
| **Record de série** | Flamme dessinée au trait or qui grandit | « Nouveau record : 14 jours » |
| **Entrée dans le top 10** | Médaille or avec chiffre du rang | « Tu es dans le top 10 » |

Bouton unique « Continuer » ; fermeture automatique possible après 4 s pour l'objectif du jour.
Pas plus d'une célébration à la fois (file d'attente).

---

## E29 — Révisions du jour / Cahier d'erreurs

- **Fond** : **Papier**.
- **Disposition** :
  1. En-tête : retour ; titre `h1` « À réviser » ; segment de contrôle (rayon plein, fond `paperDim`, pastille
     blanche glissante) : « Aujourd'hui (12) » · « Cahier d'erreurs (34) ».
  2. **Onglet Aujourd'hui** : carte héros encre « 12 questions · ~8 min » + bouton or-clair rond `Play` ;
     répartition par matière (barres horizontales fines avec teintes de matière) ; explication `caption`
     « Les questions reviennent après 1, 3, 7 et 14 jours. »
  3. **Onglet Cahier d'erreurs** : puces de matières ; liste groupée par module (en-têtes `overline`) ; chaque
     erreur = ligne 72 pt : icône du type d'exercice dans un carré 36 `errorWash`, énoncé tronqué 2 lignes,
     `caption` « Ratée 2 fois · il y a 3 j », indicateur « 1 / 2 réussites » (deux petits points) ; bouton fixe
     « Réviser mes erreurs ».
- **Animations** : segment de contrôle `sheet` ; erreur qui sort du cahier (après 2 réussites) : la ligne
  se replie avec une coche `success` (400 ms).
- **États vides** : illustration Carnet d'erreurs + « Aucune erreur pour l'instant. Continue comme ça. »

## E30 — Fiche d'erreur (feuille)

- **Disposition** : énoncé complet ; deux blocs côte à côte (ou empilés) : « Ta réponse » (`errorWash`) et
  « Bonne réponse » (`successWash`) ; explication ; mini-cours repliable ; raisonnement de référence
  (si question « raisonnement ») ; pied : « Ratée 2 fois · dernière tentative le 3 nov. » ; bouton principal
  « Réessayer maintenant ».

---

## E31 — Test de positionnement

- **Intro** (fond **Nuit**) : illustration **Cible et feuille** (160 pt) ; `overline goldLight` « 5 MINUTES » ;
  titre `hero` « Trouvons ton point de départ » ; trois puces avec icônes (« 18 questions », « Toutes les
  matières », « Aucune note, aucun classement ») ; bouton or-clair « Commencer » ; lien « Plus tard ».
- **Session** : cadre E13 sans indice, sans seconde chance ; barre de progression continue (pas segmentée)
  avec la matière en cours en `caption`.
- **Bilan** (fond **Papier**) : titre `h1` « Ton profil » ; **radar** (ou barres horizontales si moins de 3
  matières) par matière, tracé en `ink` avec remplissage `goldWash` ; pour chaque matière : niveau estimé
  (badge Débutant / Intermédiaire / Avancé) + « Commence par : Module 2 » ; bouton principal « Voir mon parcours ».
- **Animations** : le radar se déploie depuis le centre (700 ms) ; badges en `stagger`.

---

## E32 — Concours blanc

- **Intro** (fond **Nuit**) : illustration **Chronomètre de papier** ; titre `hero` « Concours blanc · ENA
  Cycle B » ; carte translucide des conditions : durée « 2 h », « 60 questions », « 4 matières », barème ;
  avertissement `caption` « Aucune correction avant la fin » ; bouton or-clair « Commencer » ; lien
  « Télécharger pour le faire hors ligne ».
- **Session** (fond **Papier**) :
  - barre supérieure : `X` ; **minuterie** au centre `h3` chiffres tabulaires dans une pastille (encre ; passe
    `warning` à 10 min, `error` à 2 min avec pulsation lente) ; bouton `LayoutGrid` (grille des questions) ;
  - question au format habituel (sans bandeau de correction) ; bouton « Marquer à revoir » (`Flag`) ;
    navigation « ‹ Précédente · Suivante › » en bas.
  - **Grille des questions** (feuille) : grille de pastilles 40 pt numérotées : répondue (`ink`), à revoir
    (bordure `warning`), vide (`line`) ; bouton « Remettre ma copie ».
- **Bilan** (fond **Nuit** en haut, **Papier** en bas) : note héros « 13,5 / 20 » `display` ; rang parmi les
  participants « 12ᵉ sur 87 » ; barres par matière ; temps moyen par question ; liste « Correction question
  par question » (lignes avec pastille juste / faux, appui → fiche) ; mention « 9 erreurs ajoutées au cahier ».
- **Animations** : la note défile ; les barres de matières poussent (`stagger`).

---

## E33 — Onglet Progrès

- **Fond** : en-tête **Nuit** (hauteur ~260), puis **Papier**.
- **Disposition** :
  1. **En-tête Nuit** : `overline goldLight` « ENA · CYCLE B » ; **rang héros** : « 40ᵉ » en `display` blanc
     + « sur 50 candidats » `body onInkSoft` ; variation « ▲ 3 cette semaine » (`success` éclairci) ; à droite,
     badge de rang (médaille de papier avec coin corné or) ; bouton secondaire translucide « Voir le classement »
     → E34.
  2. **Grille de 4 statistiques** (2 × 2, cartes blanches rayon 16, chevauchant l'en-tête) : « 212 questions »,
     « 3 modules validés », « 78 % de réussite », « 🔥 6 jours ». Chiffre `h1` tabulaire, libellé `caption`.
  3. **Progression par matière** : une ligne par matière : point de teinte, nom, barre de progression dans
     la teinte, « 3 / 8 modules ».
  4. **Activité** : histogramme 28 jours (barres arrondies 6 pt, `ink` ; jours objectif atteint coiffés d'un
     point or) ; total `caption` « 4 h 20 ce mois-ci ».
  5. **Concours blancs** : courbe des notes (ligne `ink` 2 pt, points or) ou état vide « Fais ton premier
     concours blanc ».
  6. **Raccourcis** : lignes « Cahier d'erreurs (34) », « Test de positionnement », « Notions maîtrisées (41) ».
- **Animations** : rang qui défile ; cartes statistiques en `stagger` ; barres et histogramme qui poussent
  (`count`, 600 ms) ; courbe qui se dessine (`draw` 700 ms).

---

## E34 — Candidats du cycle (classement)

- **Fond** : **Papier**.
- **Disposition** :
  1. En-tête : retour ; titre `h1` « Classement » ; `caption` « ENA · Cycle B · 50 candidats » ; segment de
     contrôle « Semaine · Mois · Depuis le début ».
  2. **Podium** (hauteur 180) : trois colonnes de feuilles (illustration Podium de feuilles) de hauteurs
     différentes (2e à gauche, 1er au centre plus haut, 3e à droite) ; sur chaque feuille : avatar 48 pt
     (anneau or / argent / bronze 2,5 pt), pseudonyme `caption` SemiBold, score `h3`.
  3. **Liste** (à partir du 4e) : lignes 76 pt : rang `h3` tabulaire (largeur fixe 36) ; avatar 40 ; pseudonyme
     `bodyMedium` + ligne de statistiques `caption inkSoft` « 1 240 questions · 14 modules · 86 erreurs · 94 % » ;
     score `h3` à droite + mini-flèche de variation.
  4. **Ma ligne** : fond `goldWash`, bordure gauche or 3 pt, libellé « Toi » ; **épinglée en bas** (au-dessus de
     la barre d'onglets, ombre vers le haut) tant qu'elle n'est pas visible dans la liste ; un appui la fait défiler
     jusqu'à sa position.
  5. Visiteur masqué / option privée : mention `caption` « Tu n'apparais pas dans le classement des autres. »
- **Animations** : podium : les feuilles montent du bas (`snap`, échelonné 2e → 1er → 3e) ; liste `stagger` ;
  changement de période : fondu croisé + les rangs qui changent glissent vers leur nouvelle place.
- **États** : moins de 3 candidats : pas de podium, message « Sois parmi les premiers de ton cycle ».

## E35 — Profil d'un candidat

- **Fond** : en-tête **Nuit** court, puis **Papier**.
- **Disposition** : retour ; avatar 72 pt avec anneau de couleur de rang ; pseudonyme `h2` blanc ;
  « 1er · ENA Cycle B » `goldLight` ; grille de statistiques (questions répondues, modules validés, erreurs
  effectuées, taux de réussite, raisonnements validés, série actuelle / record, meilleure note au concours
  blanc) ; **matières fortes** (puces teintées) ; **comparaison « Toi / Aminata K. »** : pour chaque indicateur,
  deux barres horizontales superposées (toi `ink`, lui / elle `gold`) avec valeurs ; encart conseil
  `goldWash` « Ce qui fait la différence : la régularité (41 jours de série). »
- **Animations** : barres de comparaison qui poussent ensemble.

---

## E36 — Abonnement

- **Rôle** : convertir avec élégance, sans pression agressive.
- **Fond** : **Nuit** plein écran.
- **Disposition** :
  1. `X` ; symbole F `onDark` 32 pt centré.
  2. Titre `hero` blanc « Continue ta préparation » ; `body onInkSoft` « Un seul abonnement pour la préparation
     **et** tous les anciens sujets. »
  3. **Carte « Ton parcours jusqu'ici »** (translucide) : 3 chiffres « 3 modules validés · 38ᵉ sur 50 ·
     212 questions ».
  4. **Avantages** (4 lignes, icône `goldLight` 20 + texte blanc) : Préparation illimitée (`GraduationCap`) ·
     Vérification du raisonnement par IA (`Sparkles`) · Concours blancs (`Timer`) · Tous les anciens sujets
     et corrigés (`FileText`).
  5. **Panneau `paper`** (bas arrondi 28) : formule existante (carte sélectionnée, bordure Aube or, prix `h1`
     tabulaire, période `caption`) ; moyens de paiement (logos existants, ex. Wave) ; bouton **or**
     « S'abonner » ; `caption inkSoft` « Paiement sécurisé · Ton compte sera créé à l'étape suivante ».
- **Animations** : chiffres du parcours qui défilent ; avantages en `stagger` ; reflet or lent qui traverse
  le bouton toutes les 4 s (désactivé si « Réduire les animations »).
- **États** : paiement en cours (bouton en chargement) ; succès → célébration sobre « Bienvenue parmi les
  abonnés » (coin corné or qui se plie) puis création du compte.

## E37 — Verrou « Abonnés » (feuille)

- **Disposition** : feuille courte : icône `Lock` dans un disque `goldWash` ; titre `h3` « Réservé aux abonnés » ;
  `body` contextuel (« Ton essai gratuit est terminé. Ta progression est conservée. ») ; bouton or « Voir
  l'abonnement » ; lien « Plus tard ».

## E38 — Bon retour (réinstallation)

- **Fond** : **Nuit**.
- **Disposition** : symbole F animé (pliure) ; titre `hero` « Bon retour, Baobab-4821 » ; carte translucide
  « Ta progression a été retrouvée » (3 chiffres) ; ligne d'essai « Il te reste 3 jours d'essai et
  1 vérification IA » ou « Ton essai gratuit est terminé » ; bouton or-clair « Reprendre ».
- **Animations** : pliure du logo, puis chiffres qui défilent.

---

## E39 — Onglet Moi (partie préparation)

- **Fond** : **Papier**.
- **Disposition** :
  1. **Carte identité** : avatar 64 (initiales sur teinte de marque) ; pseudonyme `h2` ; `caption` « Visiteur ·
     identité automatique » ou e-mail masqué ; bouton « Créer mon compte » (visiteur) / « Modifier mon profil »
     (inscrit ; crayon).
  2. **Carte essai / abonnement** : visiteur → mini-frise des 7 jours (E07) + « 2 vérifications IA » + bouton or ;
     abonné → « Abonné jusqu'au 12 mars 2027 » + badge or « Premium ».
  3. **Liste** (lignes standard) : Téléchargements (PDF + packs) · Objectif quotidien (« 10 min ») ·
     Notifications · Taille du texte · Visibilité dans le classement (interrupteur) · Réglages PDF ·
     Revoir l'accueil · Administration (admins) · Se déconnecter (`error`).
- **Animations** : standard (`stagger` à la première ouverture).

---

## E40 — États transverses (gabarits)

| État | Rendu |
|---|---|
| **Chargement** | Squelettes reprenant exactement la forme des éléments attendus (jamais d'indicateur seul au centre, sauf action ponctuelle) |
| **Vide** | Illustration de la famille (A8) 120 pt, titre `h3`, texte `body inkSoft` (1–2 lignes), une action |
| **Erreur** | Illustration nuage barré, « Quelque chose n'a pas fonctionné », bouton « Réessayer » |
| **Hors ligne** | Bandeau `paperDim` en haut : `CloudOff` + « Hors ligne · tes réponses seront envoyées plus tard » ; contenu en cache affiché |
| **Verrouillé** | Élément visible à 60 % d'opacité + `Lock` ; appui → E37 |
| **Bientôt disponible** | Badge neutre « Bientôt » + lien « Me prévenir » |

---

# Partie D — Prompts des écrans

## D0. Mode d'emploi

Chaque prompt = **préambule commun (D1)** + **prompt de l'écran**. Coller les deux ensemble dans l'outil de
conception (ou dans la demande de développement). Les prompts sont autonomes : ils reprennent les valeurs
exactes de la Partie A.

## D1. Préambule commun (à placer avant chaque prompt d'écran)

```
Tu conçois un écran de l'application mobile Fatafalta (iOS et Android, 390 × 844 pt), plateforme
ivoirienne de préparation aux concours. Niveau visé : rendu professionnel premium, au niveau du top 1 %
de Dribbble — simple, ergonomique, épuré, généreux en espace, typographie forte, chiffres mis en héros,
micro-interactions qui expliquent. Aucune image photographique, aucun personnage, aucun dégradé criard.

Identité « La copie d'excellence » : logo = la lettre F dessinée comme une feuille au coin corné, revers or.
Palette : encre #0D1B32 (texte, fonds « moments »), encre profonde #081224, halo #264069, texte secondaire
#4F5E72, texte tertiaire #7A8697, papier #FCFAF5 (fond des écrans d'étude), papier foncé #F4F0E6, filets
#E4DED2 / #CFC7B8, bordeaux #6C2838 (interactions, liens, chevrons) et son fond #F4E9EA, or #B48A48
(réussite, progression, premium — rare), or clair #E4C997 (or sur fond encre), fond or #F6EEDF, texte or
#7A5A24, succès #1F7A55 / #E8F3EC, erreur #B42318 / #FBEDEB, alerte #8F530F. Cartes blanches #FFFFFF.
Fond « Nuit » = dégradé #0D1B32 → #081224 + halo radial #264069 en haut à droite + trame de points blancs
à 7 % tous les 22 pt. Fond « Papier ligné » = papier + lignes horizontales #E4DED2 à 4 % tous les 28 pt.

Police unique Inter. Display 40/44 ExtraBold (chiffres héros, chiffres tabulaires), Hero 30/36 Bold,
H1 28/34 ExtraBold, H2 22/28 Bold, H3 17/22 SemiBold, Body 15/22 Regular, Caption 13/18 Medium,
Overline 11/14 SemiBold majuscules +0,5. Marges latérales 20, espacements multiples de 4, rayons 8/12/16/24,
boutons principaux 56 de haut rayon 16 fond encre texte blanc, cibles tactiles ≥ 44.
Icônes Lucide trait 1,9. Ombres très douces (encre 6 %, flou 12). Motif récurrent : petit coin corné or en
haut à droite des cartes « maîtrisées ». Ton : tutoiement, phrases courtes, bienveillant.
Barre d'onglets (si visible) : 4 onglets Prépa (GraduationCap), Sujets (FileText), Progrès (graphique),
Moi (UserRound) ; hauteur 68, fond blanc ; onglet actif en encre avec petite barre or 16 × 3 au-dessus.
Livrer : la maquette de l'écran, ses états, et la description des animations (durées, courbes).
```

## D2. Prompts par écran

### Prompt E01 — « Que veux-tu faire ? »
```
Écran de premier lancement « Que veux-tu faire ? », fond Nuit plein écran, sans défilement.
En haut : symbole F blanc à revers or 28 pt + « Fatafalta » Bold 17 blanc + petit filet tricolore
orange #F77F00 / blanc / vert #009E60 (3 bandes de 7 × 3 pt).
Titre Hero blanc sur deux lignes : « Réussis ton concours, » / « à ton rythme. » (deuxième ligne en or clair
#E4C997). Sous-titre blanc 66 % : « Cours, exercices et anciens sujets, réunis en une seule application. »
En bas, deux cartes empilées :
1) Grande carte papier #FCFAF5 rayon 24 (~200 pt) : badge or « Nouveau », titre H2 encre « Me préparer »,
texte caption « Cours en modules, exercices du simple à l'avancé, suivi de ta progression », lien bordeaux
« Commencer → » ; à droite une illustration vectorielle d'un carnet ouvert portant un chemin pointillé de
4 jalons ronds, le dernier en or, qui déborde légèrement en haut de la carte ; coin corné or en haut à droite.
2) Carte translucide (blanc 6 %, bordure blanc 14 %, rayon 20, ~120 pt) : vignette d'une pile de copies
d'examen inclinées avec un tampon rond or, titre H3 blanc « Anciens sujets », caption « Concours et examens,
avec leurs corrigés », chevron or clair.
Sous les cartes : caption centrée blanc 66 % « Tu pourras passer de l'un à l'autre à tout moment. »
Animations : halo qui respire (6 s), titre puis cartes en entrée échelonnée (fondu + 12 pt, 420 ms, délais
120/200/260 ms), chemin pointillé qui se dessine en 800 ms puis dernier jalon qui s'allume en or ;
appui = échelle 0,97.
```

### Prompt E02 — « Quel concours ? »
```
Écran « Quel concours prépares-tu ? », fond papier. En-tête : bouton retour (cercle 40 papier foncé,
flèche encre) et « 1 / 2 » à droite. Sur-titre overline bordeaux « PRÉPARATION », titre H1 « Quel concours
prépares-tu ? », sous-titre « Choisis l'organisme, puis ton cycle. », petite illustration boussole de papier
(aiguille bordeaux et or) à droite du titre. Champ de recherche (48 pt, rayon 12, blanc, icône loupe)
« Rechercher un organisme ou un cycle », collant au défilement.
Liste d'organismes en accordéon : cartes blanches 72 pt rayon 16 bordure #E4DED2, logo carré arrondi 44,
nom en Body Medium encre, caption « 3 cycles disponibles », chevron bordeaux. Montrer un organisme OUVERT
(« ENA ») : bordure encre 1,5 pt, ombre douce, chevron tourné vers le bas, filet, puis 3 lignes de cycles
de 56 pt alignées sous le nom : « Cycle A — 10 modules · 4 matières », « Cycle B » SÉLECTIONNÉ (fond
#F6EEDF, radio encre avec coche blanche), « Cycle C » non publié (opacité 45 %, badge « Bientôt », lien
« Me prévenir »). Les autres organismes restent fermés (seul un ouvert à la fois).
Bouton principal fixe en bas sur voile papier : « Continuer avec Cycle B ».
États à livrer : liste fermée, organisme ouvert, recherche « cycle b » (organisme ouvert automatiquement,
correspondance surlignée), chargement (squelettes), erreur hors ligne.
Animations : dépliage ressort ~280 ms, chevron 0 → 90°, cycles échelonnés 35 ms (fondu + 8 pt), fermeture
du précédent simultanée, défilement doux, radio qui se remplit avec léger rebond puis coche dessinée 250 ms.
```

### Prompt E03 — « Ton rythme »
```
Feuille modale papier (70 % de hauteur, rayon haut 24, poignée) sur l'écran Prépa assombri.
Overline bordeaux « ÉTAPE 2 / 2 », titre H2 « Combien de temps par jour ? ». Trois tuiles côte à côte
(112 pt, rayon 16) : « 5 min · Tranquille », « 10 min · Régulier » (sélectionnée : fond blanc, bordure
encre 2 pt, badge or « Conseillé »), « 20 min · Intensif » (fond #F4F0E6). Chiffres en Display 32 tabulaire.
Encart #F6EEDF rayon 16 : icône cible or, titre H3 « Faire le test de positionnement ? », caption
« 5 minutes pour savoir par où commencer. », bouton secondaire « Faire le test » et lien « Plus tard ».
Bouton principal « C'est parti ». Animations : montée ressort, tuile sélectionnée avec léger rebond.
```

### Prompt E04 — Prépa, premier jour
```
Onglet Prépa au premier jour. En-tête court fond Nuit (≈210 pt, bas arrondi 28) : sélecteur « ENA · Cycle B »
(logo 28 + texte blanc + icône haut/bas), pastille « 🔥 0 » translucide à droite ; titre Hero blanc
« Bienvenue, Baobab-4821 » (pseudonyme en or clair) ; pastille translucide « Essai gratuit · 7 jours d'étude
offerts » + lien « Comment ça marche ? ».
Carte héros blanche rayon 20 qui chevauche l'en-tête de 32 pt : overline or « TON POINT DE DÉPART »,
H2 « Culture générale · Module 1 », caption « 3 leçons · 25 min · Les institutions », illustration carnet
ouvert 96 pt à droite, bouton principal pleine largeur « ▶ Commencer la leçon 1 ».
Puces de matières défilantes (« Toutes » active en encre). Section overline « TON PARCOURS » : cartes de
modules (anneau 44 numéroté dans la teinte de la matière, titre, caption, pastille ○), module 1 souligné
d'un filet or à gauche. Deux tuiles « Test de positionnement » (icône cible) et « Concours blanc » (chrono).
Barre d'onglets Prépa active. Animations : en-tête en fondu, carte héros avec léger rebond, liste échelonnée,
en-tête qui se réduit en barre de 56 pt au défilement.
```

### Prompt E05 — Prépa, en cours
```
Onglet Prépa, utilisateur actif. En-tête Nuit repliable : sélecteur « ENA · Cycle B », pastille « 🔥 6 » or.
À gauche anneau de progression 88 pt dégradé or (#E4C997 → #B48A48) avec « 42 % » blanc et « du parcours » ;
à droite « Objectif du jour » + jauge 7 / 10 min, et « Rang 40ᵉ sur 50 ▲ 3 ». Bandeau translucide
« Essai : 4 jours restants · 2 vérifications IA › ».
Carte « Continuer » en encre (rayon 20, halo bleu en haut à droite) qui chevauche l'en-tête : overline or
clair « CONTINUER », H3 blanc « Leçon 2 · Les collectivités territoriales », caption « Culture générale ·
Module 3 », fine barre or clair à 60 %, bouton rond or clair 48 avec ▶ encre.
Carte blanche « 12 questions à réviser » avec coin corné or, icône rotation dans disque bordeaux clair,
caption « 4 erreurs · 8 révisions programmées », chevron.
Puces de matières (Culture G. active en #264069). Liste de modules (76 pt) : anneau de matière numéroté,
« Module 3 · Décentralisation », « 3 leçons · Niveau 2 : 64 % », pastille ◐ ; un module validé avec anneau
plein vert et coin corné or ; un module « Conseillé après M2 » (badge neutre).
Tuile « Concours blanc ». Barre d'onglets avec pastille bordeaux sur Prépa.
Livrer aussi la variante « essai épuisé » : carte or « Ton essai est terminé — Continue avec l'abonnement »
(bouton or), modules avec cadenas, progression et rang toujours visibles.
Animations : anneau qui se remplit en 900 ms avec chiffre qui défile, rang qui défile, pastille de puce
qui glisse, filtrage en fondu échelonné, tirer-pour-rafraîchir avec le F dont le coin se plie.
```

### Prompt E06 — Changer de concours
```
Feuille modale papier 85 % : poignée, titre H2 « Changer de concours », section « Tes programmes »
(lignes avec mini-anneau de progression or, programme actif coché), section « Tous les concours » avec
l'accordéon organismes → cycles de l'écran de sélection (un seul organisme ouvert), bouton principal
« Passer à ce programme ». Animation : montée ressort, fondu croisé de l'en-tête de Prépa après validation.
```

### Prompt E07 — Essai
```
Feuille modale papier : titre H2 « Ton essai gratuit », texte « Un jour n'est compté que lorsque tu
étudies. ». Frise horizontale de 7 cercles de 36 pt reliés par un filet : 3 jours utilisés (disques encre,
dates « 1 nov. », « 3 nov. », « 4 nov. » dessous), aujourd'hui (disque or avec halo), 3 restants (cercles
vides #CFC7B8). Ligne « Vérifications IA offertes : 2 / 3 » avec icône étincelles et 3 points.
Encart #F6EEDF « Avec l'abonnement » : 4 lignes à coche or (préparation illimitée, vérification du
raisonnement par IA, concours blancs, tous les anciens sujets). Bouton or « Voir l'abonnement », lien
« Plus tard ». Animation : cercles qui se remplissent un à un (60 ms).
```

### Prompt E08 — Module
```
Écran Module, fond papier, en-tête dans le fond léger de la matière (#E9EEF5) arrondi en bas 24 : retour
(cercle blanc), bouton téléchargement hors ligne, pastille « ● Culture générale », overline « MODULE 3 »,
H1 « Décentralisation », anneau 64 « 40 % » (#264069), caption « 3 leçons · 21 min · 36 exercices ».
Section « LEÇONS » : 3 lignes 64 pt — leçon 1 terminée (disque vert + coche), leçon 2 en cours (numéro en
carré blanc, mini-barre de progression), leçon 3 à venir ; durée en caption ; icône livre bordeaux.
Section « EXERCICES DE FIXATION » : 3 cartes 84 pt rayon 16 : « ● Niveau 1 · Application — 8/10 »,
« ●● Niveau 2 · Entraînement — 64 % », « ●●● Niveau 3 · Approfondissement » VERROUILLÉ (fond #F4F0E6,
cadenas, « Atteins 70 % au niveau 2 », mini-barre vers 70 %). Ligne « 3 anciens sujets liés ».
Bouton fixe « Continuer la leçon 2 ». Variante : niveau 3 débloqué (bordure dégradé or, badge « Avancé »).
Animations : anneau qui se remplit, sections échelonnées ; déblocage : anse du cadenas qui pivote 400 ms
puis reflet or qui traverse la carte en 600 ms.
```

### Prompt E09 — Pack hors ligne
```
Feuille modale papier : H2 « Réviser sans connexion », illustration nuage + flèche au trait encre,
contenu « 3 leçons · 36 exercices · 12 images », taille « 4,2 Mo » en H3, bouton « Télécharger ».
États : téléchargement (anneau 56 pt or avec pourcentage), terminé (coche verte dessinée, « Disponible
hors ligne »).
```

### Prompt E10 — Leçon
```
Lecteur de leçon plein écran, fond papier ligné (lignes à 4 % alignées sur un interligne de 28).
Barre supérieure 56 pt translucide floutée : X, « Leçon 2 / 3 » centré, bouton « Aa » ; barre de lecture
3 pt encre sous la barre (35 %). Corps marges 24 : overline teinte matière « CULTURE GÉNÉRALE · MODULE 3 »,
H1 « Les collectivités territoriales », caption « 8 min de lecture ». Texte de lecture Inter 17/28 avec un
terme clé souligné d'un trait or 2 pt. Montrer les blocs : « À retenir » (fond #F6EEDF, filet or à gauche,
icône marque-page), « Piège fréquent » (fond #F4E9EA, filet bordeaux, icône alerte), schéma avec légende,
tableau simple, mini-question « TESTE-TOI » (carte blanche bordure encre), récapitulatif en carte encre
(numéros or clair). Bouton fixe « Terminer la leçon » visible en fin de lecture.
Animations : barre de lecture liée au défilement, blocs en fondu à l'apparition, sélecteur de taille flottant.
```

### Prompt E11 — Mini-question
```
Bloc « TESTE-TOI » intégré à une leçon : carte blanche rayon 16 bordure encre 1,5 pt, badge encre
« TESTE-TOI », énoncé H3, 3 propositions en cartes compactes, bouton secondaire « Vérifier ».
États : non répondu, juste (fond vert clair + phrase d'explication), faux (fond rouge clair + explication).
```

### Prompt E12 — Leçon terminée
```
Écran « Leçon terminée », fond papier avec halo radial or très léger derrière une icône disque vert 72 pt
à coche blanche. H1 « Leçon terminée », body « Les collectivités territoriales ». Carte « Ce qu'il faut
retenir » (4 puces). Trois statistiques en ligne : « 8 min », « +1 leçon », jauge objectif 9 / 10 min.
Boutons : principal « Passer aux exercices », secondaire « Leçon suivante », lien « Retour au module ».
Animations : coche dessinée 400 ms, jauge qui avance, haptique succès.
```

### Prompt E13 — Cadre de session
```
Cadre commun d'une session d'exercices plein écran, fond papier. Barre supérieure 56 : X, barre de
progression segmentée (12 segments de 4 pt espacés de 3 : 4 verts, 1 rouge, 1 ocre #8F530F pour une
seconde chance réussie, 1 encre en cours, 5 gris #E4DED2), boutons ampoule (indice) et « ⋯ ».
Zone consigne : badge « ●● Niveau 2 », caption « Glisser pour compléter », consigne H3 encre.
Zone d'interaction centrale (placeholder). Zone d'action fixe en bas avec filet : bouton principal
« Vérifier » désactivé (fond #CFC7B8). Variante : indice ouvert (bulle #F6EEDF sous la consigne, badge
« −20 % »). Animations : question sortante vers la gauche (−24 pt + fondu 220 ms), entrante depuis la droite,
segment qui se colore avec léger rebond.
```

### Prompt E14 — Glisser pour compléter
```
Exercice « Complète la phrase » dans le cadre de session. Texte Inter 17/28 sur papier ligné avec 3 trous :
emplacements pointillés #CFC7B8 1,5 pt, rayon 8, hauteur 36. Réserve en bas (fond #F4F0E6, rayon 16) avec
6 étiquettes blanches (40 pt, rayon 10, bordure #CFC7B8, ombre douce) dont 3 distracteurs.
Livrer 4 états : (1) vierge ; (2) en cours — une étiquette soulevée sous le doigt (échelle 1,06, rotation 2°,
ombre forte) au-dessus d'un emplacement surligné (bordure encre, fond #F4F0E6), une étiquette déjà posée ;
(3) complet — bouton « Vérifier » actif ; (4) corrigé — 2 étiquettes vertes avec coche, 1 rouge qui tremble
puis revient dans la réserve tandis que la bonne vole vers l'emplacement (bordure pointillée verte).
Animations : aimantation < 24 pt, pose avec rebond (ressort damping 14), retour en réserve avec rebond.
```

### Prompt E15 — Entourer
```
Exercice « Entoure les institutions créées par la Constitution de 2016 » : nuage de 8 propositions en H3
encre, sans bordure, bien espacées. Trois propositions entourées d'un cercle de stylo bordeaux (trait 2,5,
légèrement irrégulier, ouverture de 10° en fin de tracé, effet fait main). Compteur « 3 sélectionnées ».
État corrigé : 2 cercles devenus verts, 1 rouge avec texte barré, 1 bonne réponse oubliée entourée en
pointillés verts. Animation : tracé du cercle en 350 ms, effacement en sens inverse.
```

### Prompt E16 — Remettre dans l'ordre
```
Exercice « Classe ces événements du plus ancien au plus récent » : 5 cartes blanches 56 pt rayon 12, numéro
de position dans un cercle 24 à gauche, texte Body Medium, poignée à 6 points à droite. Une carte soulevée
(échelle 1,04, ombre forte) en cours de déplacement, les autres écartées. État corrigé : cartes bien placées
en vert, mal placées qui glissent vers leur position avec ancien numéro rouge barré et bon numéro vert.
Alternative accessible : flèches ↑ ↓ sur la carte touchée.
```

### Prompt E17 — Classer
```
Exercice « Range chaque compétence dans la bonne collectivité » : 2 bacs en haut (120 pt, rayon 16, blanc,
bordure pointillée, titres overline « RÉGION » et « COMMUNE », compteurs), pile de cartes 64 pt en bas
(décalage 4 pt). Carte du dessus en cours de glisser vers le bac « COMMUNE » agrandi de 3 % avec bordure
encre pleine. Bacs contenant des pastilles déjà classées. État corrigé : pastilles vertes, une rouge qui
vole vers l'autre bac.
```

### Prompt E18 — Relier
```
Exercice « Relie chaque auteur à son œuvre » sur fond papier quadrillé (24 pt, 3 %) : deux colonnes de
4 cartes (52 pt, rayon 12), point d'ancrage 12 pt au bord intérieur de chaque carte. Deux traits courbes
bordeaux 2,5 pt déjà tracés (ancrages remplis en encre), un trait en cours qui suit le doigt.
État corrigé : traits verts, un trait rouge pointillé qui s'efface, bon trait vert qui se dessine.
```

### Prompt E19 — Vrai / Faux
```
Exercice Vrai / Faux rapide : carte centrale blanche 88 % × 300 pt rayon 24 avec affirmation en H2, deux
cartes empilées derrière (échelles 0,95 et 0,90), fine barre de temps en haut de la carte. Boutons ronds
64 pt « Faux » (X, bordure rouge) et « Vrai » (coche, bordure verte). État de balayage : carte inclinée de
10° vers la droite, teintée vert clair, tampon « VRAI » incliné (−12°, bordure 2 pt verte).
État corrigé : tampon + phrase d'explication en bas de carte.
```

### Prompt E20 — QCM
```
Exercice QCM : énoncé H2 encre, 4 cartes de réponse (≥ 60 pt, rayon 14, blanc, bordure #E4DED2) avec lettre
dans un carré 32 (#F4F0E6) et texte Body Medium. État sélectionné : bordure encre 2 pt, lettre sur fond
encre texte blanc. État corrigé : bonne réponse fond vert clair + coche, choix faux fond rouge clair (après
une secousse), bonne réponse non choisie en bordure pointillée verte. Variante choix multiple : cases à
cocher + caption « Plusieurs réponses possibles ».
```

### Prompt E21 — Réponse numérique
```
Exercice numérique sur papier quadrillé : énoncé, afficheur centré « 12,5 » en Display 40 encre avec curseur
bordeaux clignotant et unité « km² » en H3 gris ; pavé numérique intégré 3 × 4 (touches 64 pt, rayon 14,
blanches, chiffres H2) avec « , », « ± », « ⌫ ». État corrigé faux : afficheur rouge, bonne valeur dessous,
bouton « Voir le calcul » qui déplie 3 étapes.
```

### Prompt E22 — Surligner
```
Exercice « Surligne la phrase qui contient l'idée principale » : paragraphe Inter 17/28 sur papier ligné ;
un passage surligné au feutre or clair #E4C997 à 55 % (extrémités biseautées) ; loupe ronde (zoom 1,4)
au-dessus du doigt pendant le glisser. État corrigé : passage juste en vert clair souligné vert, passage
faux rouge clair barré, passage oublié encadré en pointillés verts.
```

### Prompt E23 — Bandeau de correction
```
Bandeau de correction qui monte au-dessus du bouton du bas (rayon haut 20). Livrer 4 variantes :
(1) Juste : fond #E8F3EC, icône disque vert à coche, H3 vert « Bien joué », explication 2 lignes, boutons
« ✦ Expliquer mon raisonnement » (secondaire, mention « 2 offertes ») et « Question suivante » (principal).
(2) Faux 1re fois : fond #FBEDEB, H3 rouge « Pas tout à fait », « Petit rappel avant de réessayer »,
bouton « Voir le rappel ». (3) Seconde chance ratée : « La bonne réponse » + explication + caption avec icône
carnet « Ajoutée à ton cahier d'erreurs », bouton « Continuer ». (4) Rattrapé : fond #F6EEDF, H3 #8F530F
« Bien rattrapé · 50 % des points ». Animations : montée ressort, icône qui « pop », carnet qui pivote.
```

### Prompt E24 — Mini-cours
```
Feuille modale « Mini-cours » (papier, rayon haut 24, max 80 %) au-dessus de la question floutée.
Pastille overline bordeaux « RAPPEL » + « Notion : collectivités territoriales ». Titre H2 « Région ou
district ? ». Texte de lecture ≤ 150 mots, encart « À retenir » #F6EEDF, petit schéma au trait encre.
Lien bordeaux « Voir la leçon complète ». Bouton principal « ↻ Réessayer ». Ne montre jamais la réponse.
Animation : montée ressort, contenu échelonné ; « Réessayer » → les éléments de la question se re-mélangent
en glissant vers leurs nouvelles positions (350 ms).
```

### Prompt E25 — Raisonnement et verdict IA
```
Feuille modale « Explique ton raisonnement » (papier, 90 %), en 3 états dans la même feuille :
(1) Saisie : pastille étincelles or + overline « EXPLIQUE TON RAISONNEMENT », caption « Facultatif · vérifié
par l'IA », rappel de la question et badge vert de la réponse, grand champ multiligne (160 pt, rayon 14,
aide « J'ai d'abord… puis… donc… », compteur 0 / 1000), bouton « Vérifier mon raisonnement », lien
« Passer », caption « 2 vérifications offertes restantes » avec 3 points.
(2) Analyse : texte en citation sur fond #F4F0E6, trois points or qui pulsent, phrase « Comparaison avec
les étapes clés… ».
(3) Verdict « Partiel » : disque ocre + H3 « Tu y es presque », liste des étapes clés (2 cochées vertes,
1 manquante grise), carte d'explication ≤ 120 mots, lien drapeau « Je conteste ce verdict », bouton
« Question suivante ». Livrer aussi les verdicts « Exact » (vert, « Bien raisonné ») et « Faux » (rouge,
« Reprenons la logique ») et la variante abonnés (disque or étincelles, « Vérification réservée aux
abonnés », bouton or « S'abonner »). Transitions en fondu croisé, étapes cochées une à une (120 ms).
```

### Prompt E26 — Quitter la session
```
Dialogue centré rayon 20 sur voile encre 56 % : H3 « Quitter la session ? », texte « Ta progression est
enregistrée. Tu reprendras à la question 7. », bouton principal « Continuer la session », lien rouge
« Quitter ». Variante : « Passer la seconde chance ? — La question sera ajoutée à ton cahier d'erreurs. »
```

### Prompt E27 — Bilan de session
```
Bilan de session plein écran fond Nuit. X en haut à gauche. Anneau 160 pt dégradé or (trait 12) avec
« 8/10 » en Display blanc, overline or clair « NIVEAU 2 · DÉCENTRALISATION ». Titre Hero blanc « Excellente
session ». Trois cartes translucides : « 6 du premier coup », « 2 rattrapées », « 2 au cahier d'erreurs ».
Ligne trophée or clair « Classement · 38ᵉ sur 50 · ▲ 2 ». Encart or « Niveau 3 débloqué ».
Panneau papier arrondi 28 en bas : bouton principal « Continuer », secondaire « Revoir mes erreurs », lien
« Recommencer ». Animations : anneau qui se remplit en 900 ms, chiffres qui défilent, rang qui passe de 40 à
38, fine pluie de 24 confettis rectangulaires encre / or / papier (1,2 s).
Variantes de titre : « Bonne progression » (50–79 %), « Chaque erreur te fait avancer » (< 50 %).
```

### Prompt E28 — Célébrations
```
Superpositions de célébration sur voile encre, carte centrale encre rayon 28, un bouton « Continuer ».
Livrer 5 variantes : Module validé (grande feuille dont le coin se corne en or, « Module 3 validé · 3 / 12
modules »), Niveau avancé débloqué (cadenas or qui s'ouvre, 3 points de niveau qui s'allument), Objectif
atteint (jauge circulaire or qui se ferme + 🔥 « série de 6 jours »), Record de série (flamme au trait or
qui grandit), Top 10 (médaille or avec le rang). Durées ≤ 1,2 s, sobres, élégantes.
```

### Prompt E29 — À réviser / Cahier d'erreurs
```
Écran « À réviser », fond papier : retour, H1 « À réviser », contrôle segmenté rayon plein (fond #F4F0E6,
pastille blanche) « Aujourd'hui (12) » / « Cahier d'erreurs (34) ».
Onglet Aujourd'hui : carte héros encre « 12 questions · ~8 min » avec bouton rond or clair ▶, barres fines
par matière (teintes de matière), caption « Les questions reviennent après 1, 3, 7 et 14 jours. ».
Onglet Cahier : puces de matières, liste groupée par module (en-têtes overline), lignes 72 pt avec icône du
type d'exercice dans un carré #FBEDEB, énoncé sur 2 lignes, caption « Ratée 2 fois · il y a 3 j », indicateur
« 1 / 2 réussites » ; bouton fixe « Réviser mes erreurs ». État vide : illustration carnet fermé à marque-page
bordeaux et coche or, « Aucune erreur pour l'instant. Continue comme ça. ».
```

### Prompt E30 — Fiche d'erreur
```
Feuille modale papier : énoncé complet, blocs « Ta réponse » (fond rouge clair) et « Bonne réponse » (fond
vert clair), explication, mini-cours repliable, raisonnement de référence, pied « Ratée 2 fois · dernière
tentative le 3 nov. », bouton principal « Réessayer maintenant ».
```

### Prompt E31 — Test de positionnement
```
Trois écrans. (1) Intro fond Nuit : illustration vectorielle cible concentrique encre avec une feuille
cornée plantée au centre (160 pt), overline or clair « 5 MINUTES », Hero blanc « Trouvons ton point de
départ », 3 puces à icônes (« 18 questions », « Toutes les matières », « Aucune note, aucun classement »),
bouton or clair « Commencer », lien « Plus tard ». (2) Session : cadre de session sans indice, barre de
progression continue, matière courante en caption. (3) Bilan fond papier : H1 « Ton profil », radar des
matières (tracé encre, remplissage #F6EEDF), pour chaque matière badge Débutant / Intermédiaire / Avancé et
« Commence par : Module 2 », bouton « Voir mon parcours ». Radar qui se déploie depuis le centre (700 ms).
```

### Prompt E32 — Concours blanc
```
Quatre écrans. (1) Intro fond Nuit : chronomètre de papier avec secteur or, Hero « Concours blanc · ENA
Cycle B », carte translucide des conditions (« 2 h · 60 questions · 4 matières »), caption « Aucune
correction avant la fin », bouton or clair « Commencer ». (2) Session fond papier : X, minuterie centrale
en pastille encre « 1:42:10 » chiffres tabulaires (variante ocre à 10 min, rouge pulsant à 2 min), bouton
grille ; question QCM sans correction ; bouton « Marquer à revoir » ; navigation « ‹ Précédente · Suivante › ».
(3) Grille des questions en feuille : pastilles 40 pt numérotées (répondue encre, à revoir bordure ocre,
vide grise), bouton « Remettre ma copie ». (4) Bilan : haut Nuit avec « 13,5 / 20 » en Display et « 12ᵉ sur 87 »,
bas papier avec barres par matière, temps moyen, liste de correction question par question, mention
« 9 erreurs ajoutées au cahier ».
```

### Prompt E33 — Progrès
```
Onglet Progrès. En-tête Nuit ≈260 pt : overline or clair « ENA · CYCLE B », « 40ᵉ » en Display blanc +
« sur 50 candidats », « ▲ 3 cette semaine » en vert clair, médaille de papier à coin corné or à droite,
bouton translucide « Voir le classement ». Grille 2 × 2 de cartes blanches qui chevauchent l'en-tête :
« 212 questions », « 3 modules validés », « 78 % de réussite », « 🔥 6 jours » (chiffres H1 tabulaires).
Section progression par matière (point de teinte, nom, barre dans la teinte, « 3 / 8 modules »). Histogramme
28 jours (barres arrondies encre, point or sur les jours où l'objectif est atteint, « 4 h 20 ce mois-ci »).
Courbe des concours blancs (ligne encre 2 pt, points or). Raccourcis : Cahier d'erreurs (34), Test de
positionnement, Notions maîtrisées (41). Barre d'onglets Progrès active.
Animations : rang qui défile, cartes échelonnées, barres qui poussent, courbe qui se dessine.
```

### Prompt E34 — Classement
```
Écran « Classement », fond papier : retour, H1 « Classement », caption « ENA · Cycle B · 50 candidats »,
contrôle segmenté « Semaine · Mois · Depuis le début ». Podium de 3 feuilles de papier de hauteurs
différentes aux coins cornés (2e à gauche, 1er au centre plus haut, 3e à droite) avec avatars 48 pt cerclés
or / argent #8C96A3 / bronze #9A6A45, pseudonymes et scores. Liste à partir du 4e : rang tabulaire, avatar 40,
pseudonyme, ligne de stats « 1 240 questions · 14 modules · 86 erreurs · 94 % », score et flèche de variation.
Ligne « Toi » (fond #F6EEDF, filet or à gauche) épinglée en bas au-dessus de la barre d'onglets avec ombre
vers le haut. Animations : feuilles du podium qui montent (2e, 1er, 3e), liste échelonnée, rangs qui
glissent au changement de période.
```

### Prompt E35 — Profil d'un candidat
```
Profil d'un candidat : en-tête Nuit court avec avatar 72 cerclé or, pseudonyme H2 blanc « Aminata K. »,
« 1er · ENA Cycle B » en or clair. Grille de statistiques (questions répondues, modules validés, erreurs
effectuées, taux de réussite, raisonnements validés, série actuelle / record, meilleure note au concours
blanc). Puces des matières fortes. Section « Toi / Aminata K. » : pour chaque indicateur deux barres
superposées (toi en encre, elle en or) avec valeurs. Encart #F6EEDF « Ce qui fait la différence : la
régularité (41 jours de série). ».
```

### Prompt E36 — Abonnement
```
Écran Abonnement fond Nuit : X, symbole F blanc à revers or 32 pt centré, Hero « Continue ta préparation »,
texte « Un seul abonnement pour la préparation et tous les anciens sujets. ». Carte translucide « Ton
parcours jusqu'ici » : « 3 modules validés · 38ᵉ sur 50 · 212 questions ». 4 avantages avec icônes or clair
(diplôme, étincelles, chronomètre, document). Panneau papier arrondi 28 en bas : carte de formule
sélectionnée (bordure dégradé or, prix H1 tabulaire, période caption), logos de moyens de paiement, bouton
or dégradé (#E4C997 → #B48A48) texte encre « S'abonner », caption « Paiement sécurisé · Ton compte sera créé
à l'étape suivante ». Animations : chiffres qui défilent, avantages échelonnés, reflet lent sur le bouton.
```

### Prompt E37 — Verrou Abonnés
```
Feuille courte papier : icône cadenas dans un disque #F6EEDF, H3 « Réservé aux abonnés », texte « Ton essai
gratuit est terminé. Ta progression est conservée. », bouton or « Voir l'abonnement », lien « Plus tard ».
```

### Prompt E38 — Bon retour
```
Écran « Bon retour » fond Nuit : symbole F dont le coin se plie (animation du logo), Hero blanc « Bon retour,
Baobab-4821 », carte translucide « Ta progression a été retrouvée » avec 3 chiffres, ligne « Il te reste
3 jours d'essai et 1 vérification IA » (variante : « Ton essai gratuit est terminé »), bouton or clair
« Reprendre ».
```

### Prompt E39 — Moi
```
Onglet Moi, fond papier. Carte identité : avatar 64 à initiales sur fond encre, pseudonyme H2 « Baobab-4821 »,
caption « Visiteur · identité automatique », bouton « Créer mon compte ». Carte essai : mini-frise de 7 jours
(3 utilisés), « 2 vérifications IA offertes », bouton or « Voir l'abonnement » (variante abonné : « Abonné
jusqu'au 12 mars 2027 » + badge or « Premium »). Liste : Téléchargements, Objectif quotidien « 10 min »,
Notifications, Taille du texte, Visibilité dans le classement (interrupteur), Réglages PDF, Revoir l'accueil,
Se déconnecter (rouge). Barre d'onglets Moi active.
```

### Prompt E40 — États transverses
```
Planche de gabarits d'états pour Fatafalta : chargement (squelettes #ECE7DC avec reflet qui balaie), vide
(illustration vectorielle au trait 120 pt + titre + texte + une action), erreur (nuage barré bordeaux,
« Quelque chose n'a pas fonctionné », « Réessayer »), bandeau hors ligne (#F4F0E6, icône nuage barré,
« Hors ligne · tes réponses seront envoyées plus tard »), élément verrouillé (60 % + cadenas), badge
« Bientôt » + lien « Me prévenir ».
```

---

# Partie E — Contrôle qualité d'un écran

Avant de valider un écran, vérifier :

1. **Une seule action principale**, dans le tiers inférieur.
2. **Couleurs** : uniquement la palette A2 ; or rare ; une couleur forte max en plus de l'encre.
3. **Typographie** : styles A3 uniquement ; chiffres tabulaires ; aucun texte < 11 pt.
4. **Contrastes** ≥ 4,5:1 pour le texte (vérifier l'or : `goldInk` sur papier).
5. **Cibles tactiles** ≥ 44 pt ; espacement ≥ 8 pt entre cibles.
6. **États** : chargement, vide, erreur, hors ligne, verrouillé prévus.
7. **Animations** : jetons A10 ; chacune explique quelque chose ; variante « Réduire les animations ».
8. **Haptique** : conforme à A11, jamais pendant la lecture.
9. **Petits écrans** (360 × 640) et **grands textes** (police système 130 %) : rien ne se chevauche ni ne se coupe.
10. **Alternative au geste** présente pour chaque interaction de glisser.
11. **Textes** : tutoiement, bienveillance, chiffres contextualisés (A12).
12. **Performance** : animations à 60 i/s sur un Android d'entrée de gamme.

---

## Journal des versions

| Version | Date | Évolution |
|---|---|---|
| 0.1 | 2026-11-05 | Création : direction artistique, composants de base, fiches des écrans E00 à E40, préambule et prompts de tous les écrans de la préparation, contrôle qualité |
| 0.2 | 2026-11-05 | Refonte premium d'après les références validées : Playfair Display + Inter, action bordeaux, cadre « pile de copies », illustrations raster détourées, suppression des sur-titres ; skill `fatafalta-premium-mobile` |
