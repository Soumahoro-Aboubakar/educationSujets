# Lot 2 — Mathématiques de terminale

Rédaction et vérification : 12 novembre 2026. Fichier ajouté : `backend/data/prep/bibliotheque/mathematiques-terminale.js`. Seul autre fichier de code modifié : les références de modules dans `backend/data/prep/programmes.js`. Aucun contenu antérieur de la bibliothèque n’a été réécrit.

Six modules remplacent les sept entrées prévues : le module de complexes est partagé. Total ajouté : **60 leçons, 60 mini-questions non notées et 90 exercices**, dont **20 exercices repris ou adaptés des annales locales**, avec attribution et documentId. Les 70 autres exercices sont originaux ; leurs métadonnées indiquent leur inspiration et ne les présentent pas comme officiels. Les mini-questions sont originales.

## 1. Informations officielles confirmées

Les liens ci-dessous ont été consultés en ligne. Ils ne constituent pas une nouvelle déclaration de programme officiel pour l’INP-HB ou l’ESATIC.

- [CAPESA, brochure ISE cycle long / AS 2026](https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISE-cycle-long-AS.pdf), version octobre 2025, pages 4 et 6–8 : deux compositions de mathématiques, de 4 h et 3 h, coefficient 30 chacune ; exercice obligatoire éliminatoire de dix questions dans la première. Les rubriques comprennent complexes, analyse, intégration, équations différentielles, géométrie et statistique descriptive. Cette dernière inclut les séries doubles et les moindres carrés.
- [CAPESA, brochure ISE cycle long / AS 2027](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-CLAS.pdf), version octobre 2026, et [page officielle des programmes](https://capesa.ensai.fr/informations/) : version récente consultée, avec les mêmes grands thèmes utiles à ce lot et les mêmes durées et coefficients de mathématiques. La [page des inscriptions](https://capesa.ensai.fr/inscriptions/) confirme l’existence de la session 2027. Les informations calendaires du dépôt n’ont pas été modifiées, car le périmètre autorise ici seulement les références aux modules.
- [CAPESA, annales et remarques du jury](https://capesa.ensai.fr/annales/) : présence des sujets et corrigés des sessions 2024 à 2026. Les exercices attribués dans le code viennent des **fichiers locaux effectivement lus**, pas d’une reconstitution depuis cette page.
- [INP-HB, Admission BAC / BT, session 2026](https://inphb.edu.ci/admission-bac/) : l’établissement décrit un test global de 3 h 30 associant culture générale, anglais et culture scientifique, cette dernière incluant les mathématiques. Cette page ne fournit pas une liste détaillée de chapitres permettant de garantir la présence des complexes. Le [communiqué lié à la plateforme d’admission](https://admission-bac.concours.inphb.app/docs/com.pdf) a renvoyé une protection de vérification ; il n’a pas été exploité comme texte lu.
- [ESATIC, arrêté d’ouverture Licence 2024](https://concours.esatic.ci/docsconcours/comopenlicence.pdf), article 8 : le texte indexé du document officiel donne, pour la Licence 1, mathématiques 1 h 30 coefficient 4, sciences physiques 1 h 30 coefficient 3 et langues 1 h 30 coefficient 2. Le lecteur web ne fournit pas de texte continu de ce PDF. Les durées de mathématiques sont aussi visibles directement sur les scans locaux 2017 et 2024. Le [portail officiel du concours](https://concours.esatic.ci/) a été consulté ; aucune liste officielle récente de chapitres de Licence 1 n’y a été vérifiée.

## 2. Sources secondaires et limites de leur emploi

Les résultats de recherche ont fait apparaître notamment [MAXA sur CAPESA 2027](https://www.maxaapp.com/actualites/capesa-le-concours-qui-paie-tes-etudes), [ScholarX sur ISE cycle long / AS](https://xn--stratosphre-69a.com/concours/ise-cycle-long-as) et [ExamensCI sur l’ESATIC](https://examensci.com/concours/esatic.html). Ces notices ont seulement servi au repérage : aucune formule, question, date d’annale ou prescription de programme du lot n’est fondée sur elles. Les sources officielles et les fichiers locaux priment.

Les scans locaux ESATIC portent aussi le marquage d’une compilation « E-Books ». Le classement dans l’index local et les en-têtes visibles sont utilisés pour leur attribution ; cela ne constitue pas une authentification indépendante de chaque scan auprès de l’école.

## 3. Annales locales effectivement analysées

Racine du corpus : `/private/tmp/claude-501/-Users-macbookair-Documents-projets-educationSujets/267ba4d0-68fa-4847-8c15-9efba55cda49/scratchpad/annales`. Métadonnées contrôlées dans `index.json`. Les lectures sont ciblées sur les parties pertinentes, sans prétendre à une analyse exhaustive de toutes les pages ni de toutes les années.

| DocumentId | Épreuve / lecture | Notions et formes de questions observées |
|---|---|---|
| `6ac272bd316193dda86e43b4` | ENSEA ISE cycle long / AS 2026, 1re composition, texte extrait, début et exercices 1, 3, 4 | Ex. 1 : intégrale u′/u, asymptote oblique rationnelle, limite logarithmique, dérivée de ln(x + √(1 + x²)), formes exponentielles d’un quotient, équation différentielle avec condition en 1, z⁵ − z² = 0. Ex. 3 : droites, coplanarité et projections orthogonales dans l’espace. Ex. 4 : second degré à coefficients complexes et géométrie des affixes. |
| `6ac272b2316193dda86e4398` | ENSEA ISE cycle long / AS 2025, 1re composition, texte extrait, exercices 1 à 3 principalement | Intégrale xe^(−x²), domaine avec racine et logarithme, asymptote, dérivée de ln(cos(3x)), forme trigonométrique, équation bicarrée dans ℝ puis ℂ. Ex. 3 : racine unique de x³ + 3x − 1, application itérative 1/(x² + 3), borne de dérivée et contrôle d’erreur par accroissements finis. |
| `6ac272a7316193dda86e437c` | ENSEA ISE cycle long / AS 2024, 1re composition, texte extrait, exercice 1 et début de l’exercice 2 ; repérage de l’intégration par parties plus loin | Intégrale avec sin(x²), domaine de racine rationnelle, asymptote de (x² − 5x + 7)/(x − 2), limites latérales, dérivée trigonométrique et logarithmique, forme trigonométrique et équation bicarrée. Bijection et réciproque dans l’exercice 2. Présence d’une intégration par parties dans le problème. |
| `6ac01eb336d8963a0a88c45e` | ESATIC 2017, mathématiques, PDF pages 1 à 4 rendues à 80 dpi ; pages 2–3 portant les questions | Q5 primitive de ln ; Q6 dérivée de ln x/x ; Q8 produit x ln x ; Q10–11 intégrales ; Q12 vérification d’une équation du second ordre ; Q14–15 limite et asymptote exponentielles ; Q16 argument d’un quotient complexe ; Q17 second degré complexe ; Q20 changement de variable. Q6 est déjà utilisée dans MATH-LNEXP : elle n’a pas été dupliquée dans le nouveau module. |
| `6ac01ecf36d8963a0a88c481` | ESATIC 2024, mathématiques, PDF pages 1 à 6 rendues à 80 dpi ; questions de mathématiques lues pages 2–5, page 6 début de physique | Domaine logarithmique, primitives, limite exponentielle, Q8 équation f′ + √3 f = 0, Q9 similitude complexe, Q10 intégration par parties, Q13 forme trigonométrique de √3 − i, Q15 affixes, Q18 puissance (1 + i)¹². Plus loin : lieu défini par égalité de modules, tangente, autre équation différentielle. Aucun PGCD ou calcul de congruence repéré dans ces questions. |
| `6ac01eb036d8963a0a88c457` | ESATIC 2016, PDF pages 2–3 rendues à 80 dpi et lues | Suites, Q5 puissance complexe à partir du module et de l’argument, Q9 dérivée trigonométrique rationnelle, Q10 moyenne intégrale et intégration par parties. Cet échantillon supplémentaire confirme l’intérêt de complexes et analyse, sans apporter de preuve d’un thème PGCD/congruences. Aucune question de ce document n’a été reproduite. |
| `6ac01f4b36d8963a0a88c4c3` | INP-HB Bacheliers, indexé 2017 ; texte extrait, partie mathématiques Q1–23 | Calcul scientifique, équations, pourcentages, volumes, probabilités, Q19 continuité et non-dérivabilité, Q21 cosinus, Q22 quotient et reste avec somme de deux entiers. **Date ambiguë** : le début mentionne une épreuve d’anglais 2017, mais les en-têtes portent « Bacheliers 2021 », y compris dans la partie mathématique. Ce document justifie qualitativement l’analyse et inspire la progression sur les restes ; aucune de ses questions n’est attribuée à une année officielle dans le code. |
| `6ad9c9c036b1c50cc9403b37` | INP-HB Bacheliers 2024, extraits de culture scientifique, notamment Q47–56 | Proportions, chronologie, durée/vitesse, divisibilité et logique. Le texte contient une date interne du 11 août 2024. Ce passage ne justifie pas, à lui seul, un programme de complexes. |
| `6ad95a7336b1c50cc9403833` | INP-HB, indexé 2026, extraits Q46–56 | Proportions, ordre logique, vitesse moyenne, assertions de divisibilité et partage en entiers. Les pages lues portent « Test de niveau BAC & BT — Sujet 2 » : son statut d’épreuve officielle datée n’a pas été authentifié. Aucun exercice reproduit. |

Constats de récurrence limités au corpus lu : en AS 2024–2026, questions courtes mêlant limites, dérivées, intégrales et complexes, puis problèmes structurés ; en ESATIC 2016, 2017 et 2024, formats de choix de réponses et présence de l’analyse et des complexes. Une suite **arithmétique** ne prouve pas la présence d’un chapitre d’**arithmétique des entiers** : les deux n’ont pas été confondus.

## 4. Références dans les programmes et ordre pédagogique

- **ENSEA-AS** : remplacement des cinq entrées `aVenir` par les codes rédigés. Ordre conservé : fondations ln/exp, suites, probabilités, complexes, analyse, intégration, géométrie, statistique. Les angles sont construits dans les complexes avant leur utilisation en dérivation trigonométrique ; l’analyse précède l’intégration ; la statistique descriptive renvoie à la dispersion probabiliste déjà vue.
- **INPHB-BAC** : `INPHB-BAC-COMPLEXES` devient la référence **`ENSEA-AS-COMPLEXES`**, conformément à la mutualisation explicitement demandée. Aucun deuxième module de complexes n’est créé. Ce remplacement conserve un thème déjà prévu ; il n’est pas présenté comme une nouvelle confirmation officielle de ce thème pour l’INP-HB. Ajout d’**`ENSEA-AS-ANALYSE`** après complexes : la Q19 du document local indexé 2017 fait explicitement intervenir continuité et non-dérivabilité. L’incertitude sur la date de ce document reste signalée. L’ensemble du module d’analyse propose une préparation plus large que cette seule question observée.
- **ESATIC-BAC** : remplacement d’`ESATIC-BAC-ARITH` par sa référence. Ajout de **`ENSEA-AS-COMPLEXES`** puis **`ENSEA-AS-ANALYSE`**, justifié par les questions précises des scans 2016, 2017 et 2024 ci-dessus. Ces ajouts suivent MATH-LNEXP et MATH-SUITES. Arithmétique vient ensuite ; sa première leçon définit elle-même les entiers, la divisibilité et les restes.

Aucune matière, catégorie, niveau ou hiérarchie n’a été ajoutée. Les seuls niveaux d’exercice restent 1, 2 et 3. Les autres données des programmes, notamment les anciennes notes de sources et les formats d’épreuves, sont conservées dans le périmètre strict de modification autorisé.

## 5. Choix pédagogiques

Les définitions précèdent leurs usages : nombre complexe avant module/argument ; radians et cercle unité avant forme exponentielle ; continuité avant TVI ; primitive avant intégrale ; vecteur avant produit scalaire et projection ; effectif avant moyenne ; division avant congruence.

Les leçons font 3 à 4 minutes et comportent 6 à 10 blocs, avec objectif, explication, exemples, piège, mini-question et récapitulatif. Les modules de complexes et d’analyse dépassent légèrement la cible habituelle de dix leçons (11 et 12) pour isoler les premiers angles, les racines complexes, la continuité, la réciproque et les accroissements finis. Les autres ont neuf ou dix leçons.

Les notions déjà présentes dans MATH-LNEXP sont rappelées brièvement avec des renvois, puis réinvesties dans des situations nouvelles. L’analyse ne duplique pas l’exercice ESATIC 2017 sur ln x/x déjà présent dans MATH-LNEXP-E08 ; elle propose notamment la dérivée composée AS 2026. La variance descriptive est reliée à MATH-PROBA, tout en explicitant la différence entre observation avec effectifs et loi de probabilité.

Les conventions statistiques sont annoncées : médiane paire égale à la moyenne des deux valeurs centrales ; quartiles aux rangs plafonds de N/4 et 3N/4 ; variance descriptive divisée par N. Les exercices de régression contrôlent la variance non nulle des abscisses et distinguent corrélation, causalité et extrapolation.

L’arithmétique est rédigée parce que son entrée était explicitement demandée dans le lot. Sa progression PGCD → Bézout → Gauss → congruences est un **choix pédagogique**, et non un programme officiel ESATIC vérifié. Le problème original final croise deux restes avec un intervalle de recherche ; la Q22 INP-HB n’est pas reproduite sous une date incertaine.

## 6. Modules et liste des leçons

| Module | Leçons | Exercices | Durée totale indicative |
|---|---:|---:|---:|
| ENSEA-AS-COMPLEXES — Nombres complexes | 11 | 16 | 42 min |
| ENSEA-AS-ANALYSE — Limites, continuité, dérivation | 12 | 16 | 46 min |
| ENSEA-AS-INTEGR — Intégration et équations différentielles | 10 | 16 | 39 min |
| ENSEA-AS-GEOM — Géométrie dans l’espace | 9 | 14 | 36 min |
| ENSEA-AS-STAT — Statistique descriptive | 9 | 14 | 32 min |
| ESATIC-BAC-ARITH — Arithmétique | 9 | 14 | 35 min |

### ENSEA-AS-COMPLEXES

- `ENSEA-AS-COMPLEXES-L1` — Un nombre qui se place dans le plan (4 min).
- `ENSEA-AS-COMPLEXES-L2` — Additionner et multiplier (3 min).
- `ENSEA-AS-COMPLEXES-L3` — Le conjugué pour diviser (4 min).
- `ENSEA-AS-COMPLEXES-L4` — Le module mesure une distance (3 min).
- `ENSEA-AS-COMPLEXES-L5` — Un angle sur le cercle unité (4 min).
- `ENSEA-AS-COMPLEXES-L6` — Passer à la forme exponentielle (4 min).
- `ENSEA-AS-COMPLEXES-L7` — Multiplier les modules, additionner les angles (4 min).
- `ENSEA-AS-COMPLEXES-L8` — Trouver les racines carrées d’un complexe (4 min).
- `ENSEA-AS-COMPLEXES-L9` — Résoudre une équation du second degré (4 min).
- `ENSEA-AS-COMPLEXES-L10` — Répartir les racines n-ièmes sur un cercle (4 min).
- `ENSEA-AS-COMPLEXES-L11` — Lire une transformation du plan (4 min).

### ENSEA-AS-ANALYSE

- `ENSEA-AS-ANALYSE-L1` — Décrire une limite (4 min).
- `ENSEA-AS-ANALYSE-L2` — Lever une forme indéterminée (4 min).
- `ENSEA-AS-ANALYSE-L3` — Encadrer une fonction pour trouver sa limite (3 min).
- `ENSEA-AS-ANALYSE-L4` — Raccorder sans saut : la continuité (4 min).
- `ENSEA-AS-ANALYSE-L5` — Prouver qu’une solution existe et qu’elle est unique (4 min).
- `ENSEA-AS-ANALYSE-L6` — Dériver une puissance ou une racine (4 min).
- `ENSEA-AS-ANALYSE-L7` — Dériver une fonction composée (4 min).
- `ENSEA-AS-ANALYSE-L8` — Dériver une fonction réciproque (4 min).
- `ENSEA-AS-ANALYSE-L9` — La dérivée seconde décrit la pente (3 min).
- `ENSEA-AS-ANALYSE-L10` — Contrôler un écart avec les accroissements finis (4 min).
- `ENSEA-AS-ANALYSE-L11` — Reconnaître une asymptote (4 min).
- `ENSEA-AS-ANALYSE-L12` — Organiser une étude de fonction (4 min).

### ENSEA-AS-INTEGR

- `ENSEA-AS-INTEGR-L1` — Remonter d’une dérivée à une primitive (3 min).
- `ENSEA-AS-INTEGR-L2` — Reconnaître les primitives usuelles (4 min).
- `ENSEA-AS-INTEGR-L3` — L’intégrale mesure une accumulation (4 min).
- `ENSEA-AS-INTEGR-L4` — Découper, combiner et encadrer (4 min).
- `ENSEA-AS-INTEGR-L5` — Moyenne et borne qui varie (4 min).
- `ENSEA-AS-INTEGR-L6` — Intégrer par parties (4 min).
- `ENSEA-AS-INTEGR-L7` — Changer une variable affine (4 min).
- `ENSEA-AS-INTEGR-L8` — Résoudre y′ = ay (4 min).
- `ENSEA-AS-INTEGR-L9` — Résoudre y′ = ay + b (4 min).
- `ENSEA-AS-INTEGR-L10` — Vérifier une solution avec une dérivée seconde (4 min).

### ENSEA-AS-GEOM

- `ENSEA-AS-GEOM-L1` — Repérer un déplacement dans l’espace (4 min).
- `ENSEA-AS-GEOM-L2` — Combiner des vecteurs et reconnaître une direction (4 min).
- `ENSEA-AS-GEOM-L3` — Le produit scalaire détecte un angle droit (4 min).
- `ENSEA-AS-GEOM-L4` — Décrire une droite avec un paramètre (4 min).
- `ENSEA-AS-GEOM-L5` — Décrire un plan avec deux directions (4 min).
- `ENSEA-AS-GEOM-L6` — Une équation cartésienne pour un plan (4 min).
- `ENSEA-AS-GEOM-L7` — Trouver une intersection (4 min).
- `ENSEA-AS-GEOM-L8` — Projeter un point sur une droite (4 min).
- `ENSEA-AS-GEOM-L9` — Projeter sur un plan et mesurer une distance (4 min).

### ENSEA-AS-STAT

- `ENSEA-AS-STAT-L1` — Compter des observations (3 min).
- `ENSEA-AS-STAT-L2` — La moyenne partage un total (3 min).
- `ENSEA-AS-STAT-L3` — La médiane repère le milieu (3 min).
- `ENSEA-AS-STAT-L4` — Les quartiles délimitent la moitié centrale (3 min).
- `ENSEA-AS-STAT-L5` — Mesurer la dispersion autour de la moyenne (4 min).
- `ENSEA-AS-STAT-L6` — Observer deux caractères ensemble (4 min).
- `ENSEA-AS-STAT-L7` — La covariance décrit le sens d’une liaison (4 min).
- `ENSEA-AS-STAT-L8` — Ajuster une droite par les moindres carrés (4 min).
- `ENSEA-AS-STAT-L9` — Interpréter la corrélation sans surinterpréter (4 min).

### ESATIC-BAC-ARITH

- `ESATIC-BAC-ARITH-L1` — Diviser en gardant un reste (4 min).
- `ESATIC-BAC-ARITH-L2` — Décomposer en nombres premiers (4 min).
- `ESATIC-BAC-ARITH-L3` — Trouver le PGCD avec Euclide (4 min).
- `ESATIC-BAC-ARITH-L4` — Trouver le premier multiple commun (3 min).
- `ESATIC-BAC-ARITH-L5` — Bézout : écrire le PGCD comme combinaison (4 min).
- `ESATIC-BAC-ARITH-L6` — Résoudre une équation en entiers (4 min).
- `ESATIC-BAC-ARITH-L7` — Calculer avec des congruences (4 min).
- `ESATIC-BAC-ARITH-L8` — Repérer le cycle des puissances (4 min).
- `ESATIC-BAC-ARITH-L9` — Résoudre une congruence linéaire (4 min).

## 7. Exercices repris ou adaptés et traçabilité

Les autres exercices et les mini-questions portent une source originale. Les explications ci-dessous commencent toutes par l’organisme, la session et l’épreuve ; « adaptation » est indiqué quand la tâche a été ciblée ou reformulée.

| Exercice | Source locale | Tâche |
|---|---|---|
| `ENSEA-AS-COMPLEXES-E06` | ESATIC 2024, `6ac01ecf36d8963a0a88c481` | Choisis une forme trigonométrique de √3 − i (Q13). |
| `ENSEA-AS-COMPLEXES-E08` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Donne une forme exponentielle de (1 + i√3)/(1 − i) (ex. 1, Q8b). |
| `ENSEA-AS-COMPLEXES-E09` | ESATIC 2024, `6ac01ecf36d8963a0a88c481` | Calcule (1 + i)¹² (Q18). |
| `ENSEA-AS-COMPLEXES-E13` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Quel est l’ensemble des solutions de z⁵ − z² = 0 dans ℂ (ex. 1, Q10) ? |
| `ENSEA-AS-COMPLEXES-E14` | ESATIC 2024, `6ac01ecf36d8963a0a88c481` | La similitude z′ = (1 − i)z + i a quel centre, rapport et angle (Q9) ? |
| `ENSEA-AS-COMPLEXES-E15` | ENSEA 2025, `6ac272b2316193dda86e4398` | Résous 2z⁴ − 3z² − 2 = 0 dans ℂ (ex. 1, Q10). |
| `ENSEA-AS-ANALYSE-E06` | ENSEA 2025, `6ac272b2316193dda86e4398` | Pourquoi x³ + 3x − 1 = 0 a-t-elle une unique racine réelle située dans ]0 ; 1[ (ex. 3, Q1) ? |
| `ENSEA-AS-ANALYSE-E07` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Dérive f(x) = ln(x + √(1 + x²)) sur ℝ (ex. 1, Q5). |
| `ENSEA-AS-ANALYSE-E08` | ENSEA 2025, `6ac272b2316193dda86e4398` | Dérive ln(cos(3x)) sur ]0 ; π/6[ (ex. 1, Q5). |
| `ENSEA-AS-ANALYSE-E12` | ENSEA 2024, `6ac272a7316193dda86e437c` | Trouve l’asymptote oblique en +∞ de (x² − 5x + 7)/(x − 2) (ex. 1, Q3). |
| `ENSEA-AS-ANALYSE-E13` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Quelle est l’asymptote oblique en +∞ de (3x³ + 2x² + 7x − 1)/(x² + 3) (ex. 1, Q3) ? |
| `ENSEA-AS-ANALYSE-E15` | ENSEA 2025, `6ac272b2316193dda86e4398` | Pour f(x) = 1/(x² + 3) sur [0 ; 1], quelle borne k < 1 peut-on choisir pour /f′(x)/ (adaptation ex. 3, Q3) ? |
| `ENSEA-AS-INTEGR-E08` | ESATIC 2017, `6ac01eb336d8963a0a88c45e` | Quelle est une primitive de ln x sur ]0 ; +∞[ (Q5) ? |
| `ENSEA-AS-INTEGR-E10` | ESATIC 2024, `6ac01ecf36d8963a0a88c481` | Résous f′ + √3 f = 0 et f(0) = −5 (Q8). |
| `ENSEA-AS-INTEGR-E12` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Calcule ∫₂³ 2x/(1 + x²) dx (ex. 1, Q1). |
| `ENSEA-AS-INTEGR-E13` | ENSEA 2025, `6ac272b2316193dda86e4398` | Calcule ∫₀² xe^(−x²) dx (ex. 1, Q1). |
| `ENSEA-AS-INTEGR-E14` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Détermine f vérifiant 3f′ + 2f = 0 et f(1) = 3 (ex. 1, Q9). |
| `ENSEA-AS-INTEGR-E16` | ESATIC 2017, `6ac01eb336d8963a0a88c45e` | Vérifier les fonctions candidates sur ℝ, adaptation de Q12 avec ajout d’un contre-exemple. |
| `ENSEA-AS-GEOM-E12` | ENSEA 2026, `6ac272bd316193dda86e43b4` | Pour M(x ; y ; z), quel est son projeté sur D passant par (0 ; −1 ; 0) et dirigée par (1 ; 1 ; 1) (adaptation ex. 3, Q2a) ? |
| `ENSEA-AS-GEOM-E13` | ENSEA 2026, `6ac272bd316193dda86e43b4` | D₁ passe par (0 ; −1 ; 0), directeur (1 ; 1 ; 1). D₂ passe par (0 ; 1 ; 0), directeur (1 ; 0 ; 1). Pourquoi sont-elles coplanaires (adaptation ex. 3, Q1) ? |

## 8. Correspondance des anciens codes

Il n’y avait aucune leçon publiée sous les sept entrées `aVenir` de ce lot. **Aucun ancien code de leçon n’est supprimé ni renuméroté** : la correspondance ancien → nouveau pour les leçons existantes est donc sans objet. Les leçons de tous les autres modules gardent leurs codes et leurs contenus.

| Ancienne entrée de module prévue | Référence finale | Nouveaux codes de leçon |
|---|---|---|
| `ENSEA-AS-COMPLEXES` | `ENSEA-AS-COMPLEXES` | `ENSEA-AS-COMPLEXES-L1` à `-L11` |
| `INPHB-BAC-COMPLEXES` | `ENSEA-AS-COMPLEXES` partagé | Mêmes leçons, sans doublon |
| `ENSEA-AS-ANALYSE` | `ENSEA-AS-ANALYSE` | `ENSEA-AS-ANALYSE-L1` à `-L12` |
| `ENSEA-AS-INTEGR` | `ENSEA-AS-INTEGR` | `ENSEA-AS-INTEGR-L1` à `-L10` |
| `ENSEA-AS-GEOM` | `ENSEA-AS-GEOM` | `ENSEA-AS-GEOM-L1` à `-L9` |
| `ENSEA-AS-STAT` | `ENSEA-AS-STAT` | `ENSEA-AS-STAT-L1` à `-L9` |
| `ESATIC-BAC-ARITH` | `ESATIC-BAC-ARITH` | `ESATIC-BAC-ARITH-L1` à `-L9` |

Les exercices vont de E01 à E16 pour complexes, analyse et intégration, et de E01 à E14 pour géométrie, statistique et arithmétique. Chaque leçon contient exactement une mini-question de code `<code-leçon>-Q1`.

## 9. Vérifications effectuées

- `npm run prep:check` exécuté après chacun des six modules, après les modifications de références et après relecture : succès sans avertissement. Ce mode lance `buildPack.js --check`, sans écriture du pack.
- Contrôle complémentaire des séquences de codes, unicité des nouveaux codes de leçons/exercices/mini-questions, notions rattachées au module, présence de sources, une clé pour chaque QCM à réponse unique, nombre de blocs et présence de mini-question et récapitulatif.
- Relecture des corrections, distracteurs et réponses des formats non numériques. Vérification des 20 documentId et années d’exercices attribués dans l’index local.
- **33 réponses numériques d’exercices et 29 mini-réponses numériques recalculées**, dont les covariances, la régression, les distances et les restes de grandes puissances. Pour les résultats irrationnels ou fractions non décimales demandés à 0,001 près, les clés gardent la valeur non arrondie avec une tolérance absolue de 0,001.
- Substitution numérique des racines dans les équations complexes ; quadrature de contrôle sur quatre intégrales, dont les deux intégrales AS 2025–2026 ; contrôle de la dérivée composée AS 2026 sur cinq valeurs ; vérification de l’appartenance et de l’orthogonalité d’un exemple de projection.
- Aucun test ajouté au dépôt, aucun serveur démarré, aucune base consultée ou modifiée, aucun pack généré. Les fichiers sensibles mentionnés dans la mission n’ont été ni lus ni affichés.

## 10. Limites et incertitudes

- Le niveau des exercices de concours est abordé par des tâches ciblées et des corrections décomposées. Ces modules ne reproduisent pas des épreuves chronométrées complètes ni tous les prolongements des problèmes.
- Aucune récurrence de statistique descriptive ne peut être affirmée à partir des seuls passages AS lus : son inclusion repose sur la rubrique officielle. Les séries sont discrètes ; l’interpolation des quantiles dans des classes continues n’est pas développée.
- Aucun programme officiel détaillé de mathématiques bacheliers INP-HB ou Licence 1 ESATIC n’a été vérifié. La présence des complexes à l’INP-HB demeure non confirmée dans les passages consultés ; le module y remplace un thème déjà prévu sur demande expresse. Pour l’ESATIC, les ajouts d’analyse et complexes sont appuyés par des questions effectivement lues.
- PGCD, Bézout, Gauss et congruences ESATIC ne sont pas confirmés par les pages consultées. Leur enseignement répond au module d’arithmétique demandé ; leur présence dans une future épreuve ne doit pas être présentée comme certaine.
- La date du document INP-HB indexé 2017 est ambiguë, et le statut officiel du « Sujet 2 » indexé 2026 n’a pas été authentifié. Aucun des deux n’est utilisé pour une reproduction attribuée à une session certaine.
- La résolution des équations différentielles couvre y′ = ay + b à coefficients constants, avec le cas a = 0. Une leçon supplémentaire apprend à **vérifier** une solution du second ordre, observée dans ESATIC 2017 ; elle ne prétend pas enseigner leur résolution générale. Les équations avec second membre non constant, visibles notamment en ESATIC 2024, dépassent cette couverture.
- Les statistiques et l’arithmétique apportent une progression complète sur les notions ciblées, mais le lot ne prétend pas couvrir à lui seul l’intégralité des brochures CAPESA, notamment tous les problèmes longs et leurs variantes.
