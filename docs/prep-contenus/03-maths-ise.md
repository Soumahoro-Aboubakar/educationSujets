# Lot 3 — Mathématiques ISE option économie

Rédaction et vérifications : 12 novembre 2026. Programme concerné : `ENSEA-ISE-ECO`.

## Livraison

- Nouveau fichier : `backend/data/prep/bibliotheque/mathematiques-superieures.js`.
- Trois modules auparavant `aVenir` deviennent des références publiées dans la matière Mathématiques existante ; leurs codes et titres sont conservés.
- **41 leçons courtes, 48 exercices et 41 mini-questions non notées**. Chaque module comporte 16 exercices, avec progression des niveaux 1 à 3.
- Aucune création de niveau, matière, programme ou hiérarchie. Les modifications préexistantes dans le dépôt ont été conservées.
- Le fichier de bibliothèque exporte un tableau de trois objets ayant la structure habituelle. Les petits auxiliaires internes mutualisent uniquement les métadonnées, sources et rappels du DSL.

## Informations officielles confirmées

Sources ouvertes sur le Web le 12 novembre 2026 :

1. [Brochure CAPESA ISE économie, concours 2026, version octobre 2025](https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISEeco.pdf), URL déjà présente dans `programmes.js`. Pages 4 et 6–8 : deux compositions de mathématiques, 4 h/coefficient 30 et 3 h/coefficient 20 ; première composition filtrante à 5/20. Les rubriques pertinentes incluent suites/séries positives, comparaisons, intégration impropre, fonctions de deux variables, matrices et espaces vectoriels. Les dérivées partielles y sont demandées sans notion de différentielle.
2. [Page officielle des programmes CAPESA](https://capesa.ensai.fr/informations/) : elle présente désormais le concours d’avril 2027 et pointe vers une nouvelle brochure.
3. [Brochure CAPESA ISE économie, concours 2027](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-ECO.pdf), pages 4 et 6–8 : mêmes durées et coefficients pour les deux compositions, même seuil filtrant, rubriques utiles au présent lot toujours présentes. Les métadonnées de session et les sources existantes du programme n’ont pas été réécrites : le périmètre autorise seulement les références de modules.

Les contenus sont une rédaction pédagogique propre, sans reproduction du texte de la brochure. Les conditions des théorèmes utilisés sont explicitées dans les leçons.

## Sources secondaires

Aucune source secondaire retenue pour justifier le programme, les formats ou les énoncés. La recherche Web a aussi renvoyé des pages d’autres établissements ; elles ne servent pas de preuve dans ce lot.

L’attribution des annales ci-dessous repose sur l’index et les documents du corpus local demandé, et non sur une authentification indépendante de chaque fichier sur un site officiel.

## Annales effectivement analysées

Corpus : `/private/tmp/claude-501/-Users-macbookair-Documents-projets-educationSujets/267ba4d0-68fa-4847-8c15-9efba55cda49/scratchpad/annales` ; métadonnées lues dans `index.json`, énoncés et passages utiles des corrigés lus dans les `.txt` correspondants. Les textes retenus étaient substantiels : aucun de ces documents ne nécessitait le traitement réservé aux scans vides ou presque vides.

| Document local | Épreuve | Notions et formes observées |
| --- | --- | --- |
| `6ac272e4316193dda86e4416` | ISE économie 2026, 2e composition, 3 h | Ex. 1 : polynôme de deux variables, dérivées premières, système critique, Schwarz, Monge, somme de carrés et minimum global. Ex. 2 : produits de matrices 3 × 3, vecteurs propres, base propre, diagonalisation et polynôme de matrice. Ex. 4 : série alternée en 1/√n, regroupement des sommes et développement contrôlé d’un quotient. |
| `6ac272e1316193dda86e440f` | ISE économie 2026, 1re composition, 4 h | Ex. 1 : suites géométriques issues de combinaisons de suites. Problème : intégrales de xᵃ(ln x)ᵇ près de zéro, IPP, limites de bord, récurrence et équivalents de suites. |
| `6ac272d9316193dda86e43f3` | ISE économie 2025, 2e composition, 3 h | Ex. 1 : intégrale impropre de sin(t)/t, prolongement en zéro, IPP, distinction convergence/convergence absolue. Ex. 2 : suite récurrente, encadrements et convergence de sommes par majoration géométrique. Ex. 5 : matrice symétrique à paramètre, diagonalisation et espace propre. |
| `6ac272d6316193dda86e43ec` | ISE économie 2025, 1re composition, 4 h | Somme des nombres impairs et récurrence ; problème avec exp[−(ln x)ᵇ]/xᵃ, dérivées, primitives, intégrales sur ]0,+∞[ et changements de variable. |
| `6ac272cd316193dda86e43d7` | ISE économie 2024, 2e composition, 3 h | Ex. 1 : déterminant nul, matrice nilpotente, obstruction à la diagonalisation et puissances de I+A. Ex. 4 : application linéaire sur un espace de fonctions. Ex. 5 : intégrale impropre oscillante dominée par une exponentielle. |

Récurrences observées sur ce petit corpus : justifier avant de calculer, distinguer la convergence de sa valeur, résoudre des systèmes pour trouver les objets recherchés, compter les directions indépendantes, et compléter un test local par une preuve globale quand demandé. Il ne s’agit pas d’une estimation statistique de fréquence sur toutes les sessions.

### Exercices adaptés et traçabilité

Chaque entrée ci-dessous possède `source.type = 'annale'`, l’organisme, l’année, l’épreuve et le `documentId`. La correction commence par l’attribution. Les consignes ont été adaptées aux interactions mobiles ; elles ne sont pas présentées comme une reproduction intégrale du sujet.

| Exercice livré | Passage local réellement lu | Adaptation |
| --- | --- | --- |
| `ISE-ECO-ALGLIN-E15` | 2026, 2e composition, ex. 2, q. 2 ; `6ac272e4316193dda86e4416` | Vérifier trois vecteurs propres de la matrice B et conclure à une base, en QCM. |
| `ISE-ECO-ALGLIN-E16` | 2024, 2e composition, ex. 1, q. 2–3 ; `6ac272cd316193dda86e43d7` | A³=0 admis pour concentrer l’exercice sur la preuve de non-diagonalisabilité. |
| `ISE-ECO-SERIES-E07` | 2026, 2e composition, ex. 4, q. 3 ; `6ac272e4316193dda86e4416` | Convergence et absence de convergence absolue de Σ(−1)ⁿ/√n, au format vrai/faux. |
| `ISE-ECO-SERIES-E16` | 2026, 1re composition, problème, partie II, q. 3 ; `6ac272e1316193dda86e440f` | Calcul numérique de l’intégrale de x² ln x sur ]0,1], avec justification de la borne impropre. |
| `ISE-ECO-2VAR-E14` | 2026, 2e composition, ex. 1, q. 1–4 ; `6ac272e4316193dda86e4416` | Classification locale ; point critique fourni, dérivées et vérification détaillées dans la correction. |
| `ISE-ECO-2VAR-E15` | 2026, 2e composition, ex. 1, q. 5 ; `6ac272e4316193dda86e4416` | Somme de carrés fournie, preuve du minimum global et de son unicité. |

Tous les autres exercices et toutes les mini-questions sont des créations originales, marquées `source: { type: 'original', inspireDe: 'ENSEA ISE option économie 2024–2026' }`. Cela décrit leur inspiration, sans leur attribuer un statut officiel.

### Vigilance scientifique issue des lectures

- Le passage sur les matrices qui commutent, dans le document local 2026, omet la condition `Nu ≠ 0` avant de qualifier Nu de vecteur propre. La leçon d’algèbre L13 la rétablit : l’égalité M(Nu)=λNu reste vraie, mais zéro n’est jamais un vecteur propre.
- La leçon de séries L8 et l’exercice E08 sont **originaux**. Ils utilisent un quotient signé défini pour n≥2 ; ce départ évite un dénominateur nul au premier rang du modèle. Leur preuve utilise une identité exacte et une série de reste absolument convergente. Ils ne sont pas étiquetés comme un énoncé officiel.
- La convergence de la série harmonique alternée ne se transfère pas par une simple équivalence à toute série signée : cette restriction est montrée explicitement.

## Choix pédagogiques

Les volumes de 15, 15 et 11 leçons dépassent le format typique de 5–10. Ce choix conserve une seule idée principale par leçon au lieu de réunir matrices, Gauss et espaces vectoriels, ou primitives et intégration impropre, dans de longues introductions. Les leçons ont 8–10 blocs et une durée déclarée de 3–5 minutes ; chaque idée vise une explication orale de 1–4 minutes. Chaque leçon annonce son objectif, définit les termes utiles, propose des exemples, un piège, une mini-question et un récapitulatif.

- Algèbre : lecture d’un tableau avant opérations ; systèmes puis Gauss avant rang et inverse ; coordonnées avant espace vectoriel, base et applications ; directions propres avant diagonalisation et changement de base.
- Séries : rappel court des suites en renvoyant à `MATH-SUITES`, sommes finies avant séries ; comparaison positive avant équivalents et signes ; rappel des primitives avant intégrales sur segment, bornes impropres, IPP et substitution.
- Deux variables : rappel bref d’une fonction et de sa dérivée ; surface et domaine avant dérivées partielles ; Schwarz avant Monge ; points critiques avant classification ; test dégénéré et contrôle global ensuite.
- Les rappels des notions déjà enseignées sont limités aux besoins immédiats ; `MATH-LNEXP`, `MATH-SUITES` et `ISE-ECO-ALGLIN` sont référencés dans les leçons concernées.
- Aucun calcul différentiel total, aucune méthode de multiplicateurs de Lagrange. Le traitement d’un rectangle se réduit à quatre études d’une variable.
- Tableaux limités à deux ou trois colonnes. Les écritures matricielles utilisent `[ligne 1 ; ligne 2]`, convention expliquée dès L1 ; les grandes matrices restent dans les exercices d’approfondissement.
- Les théorèmes structurels sont annoncés comme admis quand leur démonstration dépasserait une courte leçon ; les exemples et leurs applications sont calculés et justifiés.

## Modules et listes des leçons

### ISE-ECO-ALGLIN — Calcul matriciel et algèbre linéaire

15 leçons, 16 exercices. Durée déclarée totale : 68 minutes.

- `ISE-ECO-ALGLIN-L1` — Lire un tableau de nombres : la matrice (3 min).
- `ISE-ECO-ALGLIN-L2` — Calculer coefficient par coefficient (4 min).
- `ISE-ECO-ALGLIN-L3` — Multiplier une ligne par une colonne (4 min).
- `ISE-ECO-ALGLIN-L4` — Traduire plusieurs équations en AX = B (3 min).
- `ISE-ECO-ALGLIN-L5` — Éliminer avec le pivot de Gauss (5 min).
- `ISE-ECO-ALGLIN-L6` — Lire le rang et les solutions après Gauss (4 min).
- `ISE-ECO-ALGLIN-L7` — Construire l’inverse par Gauss (5 min).
- `ISE-ECO-ALGLIN-L8` — Tester l’inversibilité par un déterminant (5 min).
- `ISE-ECO-ALGLIN-L9` — Reconnaître un espace vectoriel et un sous-espace (5 min).
- `ISE-ECO-ALGLIN-L10` — Choisir une base pour donner des coordonnées (5 min).
- `ISE-ECO-ALGLIN-L11` — Relier noyau, image et rang (5 min).
- `ISE-ECO-ALGLIN-L12` — Décomposer un vecteur et le projeter (5 min).
- `ISE-ECO-ALGLIN-L13` — Chercher les directions propres (5 min).
- `ISE-ECO-ALGLIN-L14` — Construire une base de vecteurs propres (5 min).
- `ISE-ECO-ALGLIN-L15` — Changer de coordonnées pour calculer Aⁿ (5 min).

Couverture des exercices :
- Matrices et dimensions (`IEL-MAT`) : `ISE-ECO-ALGLIN-E01`.
- Somme, scalaire, transposée et trace (`IEL-OP`) : `ISE-ECO-ALGLIN-E02`.
- Produit matriciel (`IEL-PROD`) : `ISE-ECO-ALGLIN-E03`.
- Systèmes linéaires (`IEL-SYS`) : `ISE-ECO-ALGLIN-E04`.
- Pivot de Gauss (`IEL-GAUSS`) : `ISE-ECO-ALGLIN-E05`.
- Rang et nombre de solutions (`IEL-RANG`) : `ISE-ECO-ALGLIN-E06`.
- Inverse par Gauss (`IEL-INV`) : `ISE-ECO-ALGLIN-E07`.
- Déterminants d’ordre 2 et 3 (`IEL-DET`) : `ISE-ECO-ALGLIN-E08`.
- Espaces et sous-espaces vectoriels (`IEL-ESP`) : `ISE-ECO-ALGLIN-E09`.
- Familles, bases et dimension (`IEL-BASE`) : `ISE-ECO-ALGLIN-E10`.
- Applications linéaires et théorème du rang (`IEL-APP`) : `ISE-ECO-ALGLIN-E11`.
- Sommes directes, projections et symétries (`IEL-SOMME`) : `ISE-ECO-ALGLIN-E12`.
- Valeurs et vecteurs propres (`IEL-VP`) : `ISE-ECO-ALGLIN-E13`, `ISE-ECO-ALGLIN-E15`.
- Diagonalisation (`IEL-DIAG`) : `ISE-ECO-ALGLIN-E14`, `ISE-ECO-ALGLIN-E15`, `ISE-ECO-ALGLIN-E16`.
- Changement de base et puissances (`IEL-PASS`) : `ISE-ECO-ALGLIN-E14`.

### ISE-ECO-SERIES — Suites, séries et intégrales généralisées

15 leçons, 16 exercices. Durée déclarée totale : 68 minutes.

- `ISE-ECO-SERIES-L1` — Rappeler ce qu’est une suite et sa limite (4 min).
- `ISE-ECO-SERIES-L2` — Prouver la convergence d’une suite récurrente (5 min).
- `ISE-ECO-SERIES-L3` — Passer des termes aux sommes partielles (4 min).
- `ISE-ECO-SERIES-L4` — Additionner une série géométrique (4 min).
- `ISE-ECO-SERIES-L5` — Comparer des séries à termes positifs (5 min).
- `ISE-ECO-SERIES-L6` — Trouver un équivalent positif (4 min).
- `ISE-ECO-SERIES-L7` — Contrôler les signes : absolue ou alternée (5 min).
- `ISE-ECO-SERIES-L8` — Décomposer un terme signé sans perdre le reste (5 min).
- `ISE-ECO-SERIES-L9` — Rappeler dérivées et primitives (5 min).
- `ISE-ECO-SERIES-L10` — Calculer une intégrale sur un segment (4 min).
- `ISE-ECO-SERIES-L11` — Remplacer une borne infinie par une limite (4 min).
- `ISE-ECO-SERIES-L12` — Approcher une borne où la fonction n’existe pas (4 min).
- `ISE-ECO-SERIES-L13` — Comparer des intégrales impropres (5 min).
- `ISE-ECO-SERIES-L14` — Intégrer par parties avant de passer à la limite (5 min).
- `ISE-ECO-SERIES-L15` — Transformer l’intégrale avec sa variable et ses bornes (5 min).

Couverture des exercices :
- Rappels sur les suites et limites (`IES-SUITE`) : `ISE-ECO-SERIES-E01`.
- Suites récurrentes et convergence monotone (`IES-MONO`) : `ISE-ECO-SERIES-E02`.
- Sommes partielles et télescopage (`IES-SOMMES`) : `ISE-ECO-SERIES-E03`.
- Séries géométriques (`IES-GEO`) : `ISE-ECO-SERIES-E04`.
- Séries positives, comparaison et Riemann (`IES-COMP`) : `ISE-ECO-SERIES-E05`.
- Équivalents de termes positifs (`IES-EQUIV`) : `ISE-ECO-SERIES-E06`.
- Convergence absolue et séries alternées (`IES-ALT`) : `ISE-ECO-SERIES-E07`.
- Décomposition exacte des termes signés (`IES-DECOMP`) : `ISE-ECO-SERIES-E08`.
- Dérivées et primitives : rappel (`IES-PRIM`) : `ISE-ECO-SERIES-E09`.
- Intégrale sur un segment (`IES-INT`) : `ISE-ECO-SERIES-E10`.
- Intégrales à l’infini (`IES-INFINI`) : `ISE-ECO-SERIES-E11`.
- Intégrales près d’une singularité (`IES-ZERO`) : `ISE-ECO-SERIES-E12`, `ISE-ECO-SERIES-E16`.
- Comparaison et convergence absolue des intégrales (`IES-ICOMP`) : `ISE-ECO-SERIES-E13`.
- Intégration par parties et limites (`IES-IPP`) : `ISE-ECO-SERIES-E14`, `ISE-ECO-SERIES-E16`.
- Changement de variable et bornes (`IES-CV`) : `ISE-ECO-SERIES-E15`.

### ISE-ECO-2VAR — Fonctions de deux variables

11 leçons, 16 exercices. Durée déclarée totale : 46 minutes.

- `ISE-ECO-2VAR-L1` — Rappeler le trajet d’une entrée vers une sortie (3 min).
- `ISE-ECO-2VAR-L2` — Rappeler la pente et les extremums en une variable (5 min).
- `ISE-ECO-2VAR-L3` — Lire une surface et ses lignes de niveau (4 min).
- `ISE-ECO-2VAR-L4` — Approcher un point par tous les chemins (4 min).
- `ISE-ECO-2VAR-L5` — Dériver en gardant l’autre variable fixe (4 min).
- `ISE-ECO-2VAR-L6` — Dériver deux fois et appliquer Schwarz (4 min).
- `ISE-ECO-2VAR-L7` — Trouver les points critiques par un système (4 min).
- `ISE-ECO-2VAR-L8` — Classer un point critique avec le critère de Monge (5 min).
- `ISE-ECO-2VAR-L9` — Décider directement quand le test est muet (4 min).
- `ISE-ECO-2VAR-L10` — Prouver qu’un minimum est global (4 min).
- `ISE-ECO-2VAR-L11` — Chercher aussi les extremums sur le bord (5 min).

Couverture des exercices :
- Rappel : fonction, domaine et continuité (`IEV-UNE`) : `ISE-ECO-2VAR-E01`.
- Rappel : dérivées et extremums en une variable (`IEV-DERIV`) : `ISE-ECO-2VAR-E02`.
- Domaine, graphe et lignes de niveau (`IEV-DOM`) : `ISE-ECO-2VAR-E03`, `ISE-ECO-2VAR-E04`.
- Limites et continuité dans le plan (`IEV-CONT`) : `ISE-ECO-2VAR-E05`.
- Dérivées partielles premières (`IEV-PART`) : `ISE-ECO-2VAR-E06`, `ISE-ECO-2VAR-E07`, `ISE-ECO-2VAR-E14`.
- Dérivées secondes et théorème de Schwarz (`IEV-SCHWARZ`) : `ISE-ECO-2VAR-E08`, `ISE-ECO-2VAR-E14`.
- Points critiques (`IEV-CRIT`) : `ISE-ECO-2VAR-E09`, `ISE-ECO-2VAR-E14`.
- Extremums locaux et critère de Monge (`IEV-MONGE`) : `ISE-ECO-2VAR-E10`, `ISE-ECO-2VAR-E14`, `ISE-ECO-2VAR-E16`.
- Cas dégénérés et étude directe (`IEV-DEGEN`) : `ISE-ECO-2VAR-E11`, `ISE-ECO-2VAR-E16`.
- Extremums globaux par inégalités (`IEV-GLOBAL`) : `ISE-ECO-2VAR-E12`, `ISE-ECO-2VAR-E15`, `ISE-ECO-2VAR-E16`.
- Comparaison des candidats intérieurs et du bord (`IEV-BORD`) : `ISE-ECO-2VAR-E13`.

## Correspondance des codes anciens → nouveaux

Aucun des trois modules `aVenir` ne possédait de leçon publiée. Il n’existe donc aucun ancien code de leçon à migrer ni de progression par leçon à réaffecter pour ce lot.

| Référence antérieure | Référence après livraison | Codes de leçons créés |
| --- | --- | --- |
| `aVenir('ISE-ECO-ALGLIN', …)` | `'ISE-ECO-ALGLIN'` | `ISE-ECO-ALGLIN-L1` à `ISE-ECO-ALGLIN-L15` |
| `aVenir('ISE-ECO-SERIES', …)` | `'ISE-ECO-SERIES'` | `ISE-ECO-SERIES-L1` à `ISE-ECO-SERIES-L15` |
| `aVenir('ISE-ECO-2VAR', …)` | `'ISE-ECO-2VAR'` | `ISE-ECO-2VAR-L1` à `ISE-ECO-2VAR-L11` |

Les exercices vont de E01 à E16 dans chaque module. Chaque leçon porte exactement une mini-question de suffixe `-Q1`.

## Vérifications effectuées

- `npm run prep:check` exécuté après chaque module : succès, sans avertissement. La dernière exécution à la livraison est consignée ci-dessous.
- Contrôle supplémentaire en mémoire sur toute la bibliothèque : unicité des codes de modules, leçons, exercices et mini-questions ; suites de codes consécutives ; une mini-question et un récapitulatif par leçon ; durées et nombre de blocs ; maximum trois colonnes par tableau ; notions reconnues et toutes couvertes par au moins un exercice ; champs source et rappel présents ; une seule clé pour les QCM simples ; attributions initiales des adaptations.
- Relecture des clés et des corrections des 48 exercices, y compris distracteurs, vraie/fausse valeur de chaque affirmation et sens des comparaisons.
- Recalculs indépendants en Python, avec fractions exactes lorsque pertinent : vecteurs propres 3 × 3 de l’annale 2026, indépendance de leur famille, matrice nilpotente 2024 et A³=0, déterminants, inverse par produit, coefficient de A⁴, coordonnées et valeur du minimum 2026, identité en carrés. L’exercice d’approfondissement sur le rectangle a également été relu côté par côté et contrôlé numériquement sur une grille rationnelle ; sa preuve repose sur l’étude des côtés, pas sur la grille.
- Contrôle des deux arrondis numériques non exacts : 14/3 accepté à 0,001 près ; −1/9 accepté à 0,0001 près. Les autres réponses numériques attendues sont exactes, avec tolérance absolue nulle.
- Aucune exécution du serveur ou de `prep:pack`. Aucun accès à la base ni aux fichiers de secrets.

Résultat final de `npm run prep:check`, sans avertissement :

```text
✅ Contenu valide : 23 modules, 163 leçons, 285 exercices, 8 programmes.
```

Ces totaux incluent toute la bibliothèque présente dans le workspace ; la contribution de ce lot est de 3 modules, 41 leçons et 48 exercices.

## Limites et incertitudes

- Ce lot couvre les trois modules demandés, sans prétendre couvrir à lui seul tout le programme mathématique CAPESA. Produit scalaire, orthogonalité, projections orthogonales, nombres complexes, équations différentielles et développement systématique de Taylor restent hors de son périmètre. Les projections de l’algèbre sont des projections selon une décomposition directe, sans hypothèse d’orthogonalité.
- Les séries alternées, la convergence absolue et la décomposition contrôlée sont incluses en réponse aux annales lues ; l’énumération de la brochure met surtout en avant les séries positives et les comparaisons.
- Les notions d’intégration sont construites pour les fonctions continues sur les segments de troncature ; une théorie générale de l’intégrabilité de Riemann des fonctions discontinues n’est pas développée.
- L’algèbre traite principalement ℝ² et ℝ³. Les définitions des espaces de matrices et de fonctions sont introduites, mais les problèmes abstraits longs sur les espaces de fonctions ne sont pas reproduits intégralement.
- Les exercices mobiles ciblent des étapes ou des raisonnements clés. Ils ne remplacent pas la rédaction d’un problème de plusieurs heures. Les parties avancées de certaines annales (Stirling, interpolations matricielles complètes, intégrales oscillantes conditionnellement convergentes) ne sont pas toutes transformées en exercices.
- La brochure 2027 a été consultée pour contrôler l’actualité du cadre ; la source 2026 déjà enregistrée dans `programmes.js` est conservée conformément au périmètre d’édition.
- Les contrôles structurels ne prouvent pas la justesse mathématique à eux seuls : ils ont été complétés par la relecture et les recalculs cités. Aucun rendu sur téléphone ni vidéo n’a été exécuté dans ce lot.
