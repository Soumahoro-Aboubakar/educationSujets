# Lot 5 — Anglais

Travail réalisé le 12 novembre 2026. Parcours commun aux matières Anglais existantes de `ENSEA-ISE-ECO`, `INPHB-BAC` et `ESATIC-BAC` : **ANG-GRAM → ANG-QCM**.

## Résultat et périmètre

- `backend/data/prep/bibliotheque/langues.js` : remplacement du seul module `ANG-GRAM`. La partie française `FR-RESUME`, déjà modifiée avant ce lot, est conservée.
- `backend/data/prep/bibliotheque/anglais-qcm.js` : nouveau module `ANG-QCM`, « Anglais : réussir le QCM ».
- `backend/data/prep/programmes.js` : ajout de `'ANG-QCM'` après `'ANG-GRAM'` dans les trois matières Anglais existantes. Aucun autre changement de programme réalisé dans ce lot ; le fichier comportait déjà les modifications des lots précédents.
- 21 leçons, 32 exercices notés, 21 mini-questions par version linguistique. Chaque module comporte 16 exercices : 4 d’application, 7 d’entraînement, 5 d’approfondissement.
- Français par défaut, exemples anglais ; version anglaise complète conservée conformément au contrôle existant du dépôt. Les versions partagent les exercices notés et leurs clés. Les mini-questions françaises portent le suffixe `Q1`, leurs équivalents anglais `Q2`, afin de garder tous les codes uniques.
- Aucun pack généré, serveur lancé ou changement effectué dans la base, les modèles, services, routes, l’application mobile ou `package.json`. Aucun accès à `.env` ou `keys.text`.

## Informations officielles vérifiées

Sources consultées en ligne le 12 novembre 2026. Les informations historiques ci-dessous ne valent pas annonce d’une session future.

1. **CAPESA, brochure ISE option économie, concours 2026**, mise à jour octobre 2025, p. 4 : anglais d’une heure, coefficient 5 ; nouvelle épreuve depuis 2026, QCM commun aux options économie et mathématiques, réponses sur une feuille séparée. L’annexe contient un exemple de sujet, à distinguer de l’annale locale d’avril 2026 utilisée pour les adaptations.
   URL : https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISEeco.pdf
2. **INP-HB, grille officielle BAC & BT 2019** : test à 60 questions, dont 20 d’anglais ; une réponse par question, réponses sur grille, un point si juste, zéro si erreur ou absence. Ce barème est confirmé pour ce document de 2019, sans extrapolation automatique à 2026.
   URL : https://inphb.edu.ci/wp-content/uploads/2025/09/CORRIGE2019.pdf
3. **INP-HB, chronogramme BAC/BT 2026** : document institutionnel confirmant la session et la phase de composition écrite. Il ne donne pas de programme détaillé de grammaire.
   URL : https://inphb.edu.ci/wp-content/uploads/2026/07/chronogramme-BAC-2026-web_260728_093839.pdf
4. **ESATIC, arrêté d’ouverture 2024, article 8** : épreuve commune Langues (Français/Anglais), 1 h 30, coefficient 2 pour la Licence 1. Le PDF s’ouvre comme scan ; les dispositions de l’article sont également accessibles dans son texte indexé. La couverture de l’épreuve locale confirme la durée commune français/anglais.
   URL : https://concours.esatic.ci/docsconcours/comopenlicence.pdf
5. **Portail ESATIC actuel** : demande de lire les communiqués propres à chaque concours, les modalités variant entre formations. Au moment de la consultation, l’accueil met surtout en avant le master cybersécurité. Aucun programme grammatical détaillé Licence 1 pour 2026 n’a été confirmé sur cette page.
   URL : https://concours.esatic.ci/

Aucun référentiel officiel détaillé de grammaire anglaise propre à chacun des trois parcours n’a été trouvé. La progression ci-dessous est donc un choix pédagogique fondé sur les questions effectivement lues.

### Ressources linguistiques de référence

Publications pédagogiques de leur éditeur, distinctes des règlements de concours :

- British Council, *Reported speech: statements* : recul des temps et changement de repères.
  https://learnenglish.britishcouncil.org/free-resources/grammar/b1-b2/reported-speech-statements
- British Council, *Reported speech*, référence grammaticale : possibilité de conserver le présent pour une vérité toujours valable.
  https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/reported-speech?page=0
- British Council, *Conditionals* : constructions usuelles des types 0 à 3.
  https://africa.teachingenglish.org.uk/classroom/grammar/conditionals

### Sources secondaires repérées

Ces résultats ont servi uniquement à orienter la recherche ; ils ne fondent ni une règle de concours ni une attribution d’exercice :

- QuizConcours, fiche INP-HB cycle court : https://quizconcours.ci/concours/inp-hb/filieres/bach-cycle-court
- Simoon, présentation ESATIC 2026 : https://www.simoon-cv.com/blog/concours-esatic-2026-cote-ivoire-inscription-epreuves

Les durées et modalités présentées par ces sites n’ont pas été généralisées aux modules.

## Annales locales réellement analysées

Racine : `/private/tmp/claude-501/-Users-macbookair-Documents-projets-educationSujets/267ba4d0-68fa-4847-8c15-9efba55cda49/scratchpad/annales`. Identification et métadonnées vérifiées dans `index.json`.

| DocumentId | Document et lecture | Notions ou formats observés |
| --- | --- | --- |
| `6ac272dd316193dda86e4401` | ENSEA ISE option économie, anglais, avril 2026 ; texte extrait : consignes, Q1–50, premier texte de compréhension et Q51–61 | 75 questions en une heure : vocabulaire 20, grammaire 30, compréhension 25 ; réponse unique, un point si juste, zéro si faux selon la copie. Comparaison Q21, relatifs Q22–23, passé et auxiliaires Q24–29, quantités Q31–33, conditionnel Q36, discours rapporté Q40, for Q44, passif Q46, past perfect Q48 ; vocabulaire de prix et collocations ; reformulation et inférence en lecture. |
| `6ad95a7336b1c50cc9403833` | INP-HB BAC & BT, 2026, test de niveau, sujet 2 ; trois premières pages de texte extrait | Anglais Q1–20 dans un test global 3 h 30 ; lecture sur l’IA, définition en contexte, question NOT, much/information, collocations, passif, unless, texte à trous et traductions. |
| `6ad9c9c036b1c50cc9403b37` | INP-HB BAC & BT, 2024 ; section anglaise lue dans le texte extrait, premières pages | Lecture sur les procédés d’impression ; définition, information absente, many/much, vocabulaire courant, unless, texte à trous et traduction. |
| `6ad9c92336b1c50cc9403aed` | INP-HB BAC & BT, 2025 ; extrait presque vide, PDF rendu à 80 dpi, pages 1–2 effectivement vues | Lecture sur l’intelligence animale, inférence et synonymes ; connecteurs while/during/however ; associations avec make/do/get. Certaines options sont composites ou peu nettes : aucun corrigé général n’est déduit du scan. |
| `6ac01ecf36d8963a0a88c481` | ESATIC Licence, 2024 ; extrait constitué de filigranes, PDF rendu à 80 dpi : pages 1–2 puis pages ciblées 11–16 ; anglais effectivement vu p. 14–15 | Épreuve Langues commune français/anglais ; partie anglaise Q26–50 : vocabulaire concret, by bus, présent simple, relatifs, futur, ordre des mots, adverbes, question-tag, faux amis et vrai/faux. La p. 11 indique +2 juste, −1 faux, 0 blanc : ne pas confondre avec les règles ISE. Les pages de correction éditoriale vues ne constituent pas un corrigé officiel certifié. |

Pour ESATIC, les pages 18, 22, 26 et 28 ont aussi été visualisées pour localiser la partie anglaise et distinguer énoncé et correction éditoriale. Aucune correction n’a été copiée sans vérification grammaticale. Les autres années présentes dans l’index ne sont pas présentées comme analysées.

### Traçabilité des adaptations

Chaque exercice ci-dessous porte `source.type = 'annale'`, l’organisme, l’année, l’épreuve et le documentId. Son explication française et sa traduction anglaise commencent par l’attribution. Les autres exercices, y compris les mini-questions, sont des **créations originales** explicitement inspirées du corpus lu : ENSEA ISE 2026, INP-HB BAC 2024–2026, ESATIC Licence 2024.

| Exercice | Origine et adaptation |
| --- | --- |
| `ANG-GRAM-E07` | ENSEA 2026, Q27 : question au prétérit, options réordonnées. |
| `ANG-GRAM-E15` | ESATIC 2024, Q39 : suppression de la condition initiale pour isoler le futur avant le second module ; remplacement de distracteurs afin d’exclure des ordres d’adverbe acceptables. |
| `ANG-QCM-E04` | INP-HB 2026, Q9 : relative retirée et date conservée dans une phrase simple pour isoler le passif. |
| `ANG-QCM-E06` | ENSEA 2026, Q23 : remplacement de housecat par device pour éviter l’emploi possible de who avec un animal familier personnifié. |
| `ANG-QCM-E07` | ENSEA 2026, Q31 : quantité indénombrable, options réordonnées. |
| `ANG-QCM-E08` | ENSEA 2026, Q2 : formulation légèrement ajustée ; sens « réduction de prix » explicitement demandé. |
| `ANG-QCM-E09` | INP-HB 2025, Q6 et Q8 : deux items réunis en texte à trous, distracteurs adaptés. Le passé continu nécessaire à la lecture est rappelé dans la leçon 6. |
| `ANG-QCM-E15` | ENSEA 2026, texte 1 et Q53 : extrait condensé et reformulé ; conséquence de l’accès inégal aux outils numériques. |
| `ANG-QCM-E16` | INP-HB 2026, texte et Q6 : passage limité aux usages des modèles de langage ; recherche de l’application non mentionnée. |

## Progression et couverture

### ANG-GRAM — Grammaire anglaise essentielle

11 leçons de 4–5 minutes annoncées, 7–8 blocs chacune. Les notions grammaticales sont définies avant leur emploi. Les anciens bons exemples sur les habitudes, for/since/ago, la question au perfect et le repère yesterday sont conservés sous une forme plus guidée.

| Code | Idée principale | Exercices associés |
| --- | --- | --- |
| `ANG-GRAM-L1` | Construire une phrase : sujet, verbe, complément et pronoms | E01, E13 |
| `ANG-GRAM-L2` | To be : affirmation, négation et question | E02, E05 |
| `ANG-GRAM-L3` | Have/has, noms, a/an/the, pluriel | E03, E05 |
| `ANG-GRAM-L4` | Habitude et présent simple affirmatif | E04, E06 |
| `ANG-GRAM-L5` | Do/does et retour à la base | E05 |
| `ANG-GRAM-L6` | Présent continu et opposition à l’habitude | E06 |
| `ANG-GRAM-L7` | Prétérit régulier/irrégulier, did et was/were | E07, E12, E14 |
| `ANG-GRAM-L8` | Present perfect et for/since/ago | E08, E12, E13, E14 |
| `ANG-GRAM-L9` | Avenir : will et be going to | E09, E15 |
| `ANG-GRAM-L10` | Capacité, conseil, obligation et interdiction | E10, E16 |
| `ANG-GRAM-L11` | Comparatif, superlatif et égalité | E11 |

### ANG-QCM — Anglais : réussir le QCM

10 leçons de 4–5 minutes annoncées, 7–9 blocs chacune. Prérequis explicite : ANG-GRAM. Les participes nouveaux nécessaires au passif et le passé continu de l’annale 2025 sont introduits ou rappelés avant les exercices.

| Code | Idée principale | Exercices associés |
| --- | --- | --- |
| `ANG-QCM-L1` | Condition réelle : types 0/1 et unless | E01 |
| `ANG-QCM-L2` | Présent imaginaire : type 2 | E02 |
| `ANG-QCM-L3` | Passé imaginaire : type 3 et past perfect | E03, E12 |
| `ANG-QCM-L4` | Voix passive : réception de l’action | E04, E13 |
| `ANG-QCM-L5` | Discours indirect : personnes, temps et repères | E05, E13 |
| `ANG-QCM-L6` | Relatifs et liens entre informations | E06, E09, E10 |
| `ANG-QCM-L7` | Dénombrable/indénombrable et quantifieurs | E07, E14 |
| `ANG-QCM-L8` | Vocabulaire : rôle du mot, faux amis et collocations | E08, E14 |
| `ANG-QCM-L9` | Lecture : détail, référence, inférence et NOT | E10, E15, E16 |
| `ANG-QCM-L10` | Consigne, élimination, temps et grille | E11, E16 |

Chaque leçon contient un objectif utile, une explication, un ou deux exemples, un piège, une mini-question et un récapitulatif. Les exercices utilisent huit types du DSL : qcm, vf, glisser, ordre, relier, classer, entourer et surligner. Aucun tableau large n’est ajouté.

## Correspondance des anciens codes de leçon

| Ancien code et contenu | Nouveaux codes accueillant ce contenu |
| --- | --- |
| `ANG-GRAM-L1` — Les temps : présent, prétérit et present perfect | `ANG-GRAM-L4`, `ANG-GRAM-L5`, `ANG-GRAM-L6`, `ANG-GRAM-L7`, `ANG-GRAM-L8`. Les définitions initiales sont aussi développées dans L1–L3. |
| `ANG-GRAM-L2` — Conditionnels, voix passive et discours indirect | `ANG-QCM-L1`, `ANG-QCM-L2`, `ANG-QCM-L3`, `ANG-QCM-L4`, `ANG-QCM-L5`. |

**Attention à la progression existante :** le code module `ANG-GRAM` est conservé, mais `ANG-GRAM-L1` désigne maintenant la structure de phrase et `ANG-GRAM-L2` le verbe be. Une ancienne validation de ces codes ne prouve donc pas l’acquisition du nouveau contenu. La correspondance est documentaire, sans migration de progression réalisée dans ce lot. Les anciens codes spécifiques aux mini-questions anglaises (`…-Q1-EN`) ont disparu au profit du format `…-Q2`.

## Choix pédagogiques, limites et incertitudes

- Les deux anciennes leçons de onze minutes sont remplacées par des idées courtes, dans un ordre sans prérequis grammatical caché. La première étape n’exige pas de connaître les temps anglais ou les termes sujet/auxiliaire/participe.
- Les reprises évitent les erreurs absolues : for n’impose pas seul un temps ; le recul au discours indirect dépend du contexte ; l’interdiction de will vise les conditions futures ordinaires, pas tous les emplois de if ; mustn’t se distingue de don’t have to.
- Le second module réutilise les bases et ajoute des constructions, plutôt que réenseigner tous les temps. Les rappels dans les mini-cours restent des règles, sans donner la solution particulière de l’exercice.
- Les distracteurs ont été relus pour imposer une seule bonne réponse aux QCM simples, notamment après will, avec les relatifs, et au discours indirect. Les exercices à sélections multiples l’annoncent explicitement.
- Ce socle conduit à des items réels de concours, mais ne constitue pas un programme exhaustif d’anglais ni une promesse de score : les inversions négatives, le subjonctif après suggest, les question-tags, les constructions gérondif/infinitif complexes et le present perfect continu observés dans certaines annales ne sont pas évalués sans cours dédié.
- Le vocabulaire est un premier ensemble contextualisé, pas un lexique complet. Les textes longs ont été raccourcis pour entraîner une opération de lecture à la fois. Aucun texte original n’est présenté comme un document officiel.
- Les copies du corpus sont identifiées par leur index local ; leur présence ne certifie pas leur authenticité institutionnelle ou leur corrigé. Les annotations éditoriales et les questions discutables ne sont pas reprises comme autorité.
- La stratégie de temps est un exemple d’entraînement fictif, pas une durée officielle transférée entre concours. La leçon demande de lire le barème propre à la session, notamment à cause des pénalités différentes observées.
- La version anglaise respecte le mécanisme existant du dépôt, sans modifier le DSL ni le moteur de traduction. Le matériau évalué reste anglais ; les consignes françaises fournissent les glossaires nécessaires.

## Validation

`npm run prep:check` exécuté après ANG-GRAM, puis après ANG-QCM et son raccordement aux programmes. Résultat : **✅ Contenu valide : 26 modules, 205 leçons, 342 exercices, 8 programmes.** Aucun avertissement.

Audit complémentaire en mémoire : unicité des 790 codes de la bibliothèque, mini-questions dans les deux langues comprises ; séquences L1…Ln et E01…E16 ; leçons de 3–6 minutes et 6–14 blocs ; une mini-question et un récapitulatif par leçon ; sources, notions, clés et traductions contrôlées. Relecture manuelle de chaque choix et correction. Aucun exercice numérique introduit.
