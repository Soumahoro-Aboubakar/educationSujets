# Batch 1 — Mathématiques : fondations de ln/exp, suites et probabilités

Date de consultation et de rédaction : **12 novembre 2026**.

## Résultat et périmètre

Les trois modules existants sont réécrits dans `backend/data/prep/bibliotheque/mathematiques.js`. Leurs codes, titres et références de programmes sont conservés. `programmes.js` ne nécessite aucune modification. Aucun module, niveau, catégorie ou étage de navigation n’est ajouté.

Le lot passe de **6 à 40 leçons** et de **27 à 48 exercices**, avec **40 mini-questions non notées**. Chaque leçon contient un objectif et son utilité, une explication, un ou deux exemples, un piège, une mini-question et un récapitulatif. Les leçons durent de 3 à 5 minutes et comportent de 7 à 10 blocs. Leur texte principal reste compatible avec une courte vidéo ; la durée affichée comprend aussi la lecture et l’interaction.

Seuls le fichier de bibliothèque et ce rapport sont modifiés par ce lot. Aucun accès à `.env`, `keys.text`, à la base de données ou au serveur ; aucune construction ni copie du pack mobile.

## Informations officielles confirmées

Les liens ci-dessous ont été ouverts ou consultés par le moteur de recherche. Les informations de programme viennent des brochures institutionnelles, et non de sites de préparation.

- **CAPESA, session 2027**, actuellement présentée sur la [page Programmes](https://capesa.ensai.fr/informations/), avec la [page Inscriptions](https://capesa.ensai.fr/inscriptions/). La [brochure ISE cycle long / AS, mise à jour en octobre 2026](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-CLAS.pdf), pages 4 et 6–8, confirme deux compositions de mathématiques de 4 h et 3 h, coefficient 30 chacune, et un exercice éliminatoire de dix questions dans la première. Elle cite suites, récurrence, convergence, logarithme, exponentielle, dérivation, limites, dénombrement, conditionnement, arbres et variables discrètes avec moments. L’ENSEA recrute les AS par ce concours commun. La construction détaillée des leçons reste notre choix pédagogique.
- **CAPESA, ISE économie 2027** : la [brochure officielle](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-ECO.pdf), pages 8–9, mentionne notamment Bayes, probabilités totales, indépendance, variables discrètes, espérance, variance et loi binomiale. Le programme complet dépasse nettement ce module de fondations : il comporte aussi d’autres lois et des variables continues.
- **INP-HB, bacheliers/BT 2026** : la [page Admission BAC](https://inphb.edu.ci/admission-bac/) confirme une sélection sur dossier suivie d’un test écrit de 3 h 30, réunissant culture générale, anglais et culture scientifique, avec mathématiques et logique. Cela justifie des questions courtes de traduction et de raisonnement. Aucun programme mathématique exhaustif récent n’a été identifié sur cette page.
- **ESATIC** : l’[arrêté d’ouverture Licence 2024](https://concours.esatic.ci/docsconcours/comopenlicence.pdf), article 8, indique mathématiques : 1 h 30, coefficient 4. Cette information a été retrouvée dans l’indexation du PDF officiel ; l’extraction directe fournit peu de texte. La [fiche institutionnelle Licence SRIT publiée dans le répertoire 2026](https://esatic.ci/wp-content/uploads/2026/02/Licence-SRIT.pdf) confirme l’accès depuis un bac scientifique et le rôle des mathématiques/physique, sans détailler les chapitres ni la durée actuelle de l’épreuve. Le [portail officiel de concours](https://concours-rec.esatic.ci/login) affiche une session 2026 et demande de consulter les arrêtés propres aux parcours. La grille de 2024 n’est pas présentée ici comme une règle confirmée pour 2026 ou 2027.
- La [page officielle des annales du CAPESA](https://capesa.ensai.fr/annales/) référence les sessions 2024–2026. Les adaptations du code sont fondées sur les documents locaux effectivement lus ci-dessous.

### Sources secondaires et statut des copies

Le résultat de recherche [MAXA sur CAPESA 2027](https://www.maxaapp.com/actualites/capesa-le-concours-qui-paie-tes-etudes) signalait de nouvelles brochures ; cette indication a été vérifiée sur le site du CAPESA. Aucun fait de programme n’est retenu sur la seule autorité de cet extrait secondaire. Les autres résultats commerciaux de recherche ne servent pas de références.

Le scan local de présélection ENSEA 2021 porte le marquage Fomesoutra ; celui d’ESATIC 2017 porte « ESATIC E-Books ». Ce sont des copies fournies dans le corpus : leur lecture est certaine, leur chaîne de numérisation n’a pas été authentifiée indépendamment. Les métadonnées de provenance reprennent l’épreuve visible et l’index fourni, sans attribuer ces copies à un téléchargement institutionnel vérifié.

## Annales effectivement analysées

Racine commune : `/private/tmp/claude-501/-Users-macbookair-Documents-projets-educationSujets/267ba4d0-68fa-4847-8c15-9efba55cda49/scratchpad/annales`.

| Document local et id | Parties lues, notions observées | Utilisation dans le lot |
| --- | --- | --- |
| ENSEA ISE cycle long / AS 2024, 2e composition — `6ac272aa316193dda86e4383` | Énoncés des exercices 1–6 : logarithme, exponentielle, variations, limites et urne avec X = écart absolu. Page 2 du PDF rendue pour vérifier les barres de valeur absolue. | PROBA-E15 adapte l’exercice 5 : loi par comptage, puis variance. |
| ENSEA ISE cycle long / AS 2025, 2e composition — `6ac272b6316193dda86e439f` | Énoncés des exercices 1–5 et début du 6 : suites récurrentes, logarithmes et fonctions usuelles. L’exercice 4 utilise uₙ₊₁ = uₙ sin(uₙ). | Observation du niveau de justification ; pas de reproduction. La trigonométrie nécessaire n’est pas ajoutée à ce lot. |
| ENSEA ISE cycle long / AS 2026, 2e composition — `6ac272c1316193dda86e43bb` | Énoncés des exercices 1–4 ; page 2 du PDF rendue. Étude de 5x² + 2x − 2x² ln x ; probabilités totales produisant une récurrence affine ; coût moyen d’analyses groupées. | LNEXP-E16 ; SUITES-E14 avec relation fournie ; PROBA-E16 avec n fixé à 20. Le point fixe **7/16** a été contrôlé sur le PDF car l’extraction présentait la fraction dans le mauvais ordre. |
| ENSEA ISE économie 2024, 2e composition — `6ac272cd316193dda86e43d7` | Énoncés des cinq exercices. Exercice 2 : deux dés distinguables, comparaison des faces, puis attente et conditionnement. | PROBA-E04 adapte uniquement la question 1, probabilité blanc > rouge. La loi d’attente et le développement en série ne sont pas prétendus couverts. |
| ENSEA présélection AS 2021 — `6ac2728b316193dda86e4330` | `.txt` minuscule : pages 1–2 rendues à 80 dpi et lues. Sommes/produits structurés ; exercice 3 sur quatre erreurs corrigées par relectures indépendantes ; autres exercices d’analyse et complexes. | Confirme l’intérêt du comptage, du contraire et de l’indépendance. Aucune question reproduite de ce scan. |
| INP-HB bacheliers 2017 — `6ac01f4b36d8963a0a88c4c3` | Extraits de la partie mathématiques, notamment Q1 (progression de nombres), Q17 (trois cartes rouges), Q23 (suite de carrés). | PROBA-E14 adapte Q17 en explicitant **sans remise** : le texte extrait ne précisait pas la remise ; la valeur obtenue correspond à la proposition 11,3 %. Ce choix est annoncé dans la correction. |
| INP-HB bacheliers 2024 — `6ad9c9c036b1c50cc9403b37` | Culture scientifique, Q41–Q44 : commissions et paires, comparaison de quantités, augmentations successives. | PROBA-E13 adapte Q41 : correspondance entre conseillers et paires de commissions. |
| ESATIC Licence 2017 — `6ac01eb336d8963a0a88c45e` | `.txt` minuscule : pages 1–2 rendues à 80 dpi. Page 1 de couverture ; page 2 : Q1–Q10. Suites géométriques, limites, ln, exponentielle, dérivation et intégration. | SUITES-E04 (Q1), SUITES-E09 (Q2), LNEXP-E08 (Q6), avec reformulation et correction détaillée. |

Les références abrégées de la dernière colonne sont préfixées par `MATH-` dans le code. Aucun document simplement listé dans `index.json` n’est présenté comme intégralement lu. Les conclusions sur les récurrences portent sur cet échantillon, pas sur une statistique exhaustive des sessions.

## Choix pédagogiques

- **LNEXP** commence par les puissances, explique ce qu’est une fonction et l’intérêt de transformer les produits en sommes. Produit, quotient et puissance du logarithme ont chacun leur leçon. La dérivée est expliquée par un taux de variation avant son emploi sur ln. La caractérisation précise de ln par sa dérivée et sa valeur en 1 arrive seulement à ce stade. L’existence de ln et les limites de comparaison sont admises et signalées comme telles. Aucune primitive n’est requise pour entrer dans le module.
- **SUITES** introduit termes, rangs, formule explicite et calcul de proche en proche avant les modèles arithmétique/géométrique. Les sommes comptent systématiquement les termes inclus. La récurrence est une preuve distincte d’une relation de calcul. La convergence est justifiée avant toute équation de point fixe ; le décalage d’une récurrence affine donne ensuite une formule réellement exploitable.
- **PROBA** peut se lire seul, notamment en tête du programme ISE économie. Il rappelle brièvement fractions, pourcentages, puissances et racines au moment utile. On construit le vocabulaire, puis le comptage nécessaire. Conditionnement, arbres et indépendance précèdent les variables aléatoires. Loi, espérance et variance sont séparées. Modèle binomial, moments et événements cumulés sont également séparés.
- Les seules notions mathématiques rédigées ailleurs dans la bibliothèque concernent les calculs de santé (`CALC-SANTE`, autre parcours). Elles ne fournissent pas ces progressions d’analyse/probabilités. Les puissances sont enseignées dans LNEXP puis brièvement rappelées, avec référence, dans SUITES ; pas de second cours complet.
- Les anciens exemples utiles sont conservés ou réemployés : maximum de ln(x)/x, équations logarithmiques avec contrôle du domaine, somme arithmétique, transformation affine, machines et défauts, deux piles sur quatre lancers. Les corrections sont désormais décomposées.
- **15, 11 et 14 leçons**, plutôt que la fourchette indicative de 5–10 : le périmètre de chaque ancien module est très large. Ce nombre permet de maintenir une idée principale et des séquences courtes, sans créer de nouvelle hiérarchie.
- Chaque module contient 16 exercices, avec niveaux 1 puis 2 puis 3. Les dix adaptations portent `source.type = 'annale'`, les champs de document demandés et une ouverture de correction identifiant l’épreuve. Les 38 autres exercices et les 40 mini-questions sont déclarés `original`, avec un corpus d’inspiration effectivement consulté. La difficulté élevée vient du raisonnement et des étapes, pas d’un calcul direct artificiellement classé niveau 3.

## Modules et listes de leçons

### MATH-LNEXP — Logarithme et exponentielle

15 leçons, 62 minutes indicatives, 16 exercices : 6 / 7 / 3 aux niveaux 1 / 2 / 3.

| Code | Leçon | Minutes |
| --- | --- | --- |
| MATH-LNEXP-L1 | Lire et calculer une puissance | 4 |
| MATH-LNEXP-L2 | Pourquoi inventer un logarithme ? | 4 |
| MATH-LNEXP-L3 | Le logarithme d’un produit | 3 |
| MATH-LNEXP-L4 | Quotient et inverse dans un logarithme | 3 |
| MATH-LNEXP-L5 | Puissances et racines dans un logarithme | 4 |
| MATH-LNEXP-L6 | Où le logarithme existe-t-il, et quel est son signe ? | 5 |
| MATH-LNEXP-L7 | Comprendre une dérivée | 5 |
| MATH-LNEXP-L8 | Dériver un logarithme pour étudier les variations | 5 |
| MATH-LNEXP-L9 | Lire les limites du logarithme | 5 |
| MATH-LNEXP-L10 | L’exponentielle : revenir de ln à son entrée | 4 |
| MATH-LNEXP-L11 | Calculer avec des exponentielles | 3 |
| MATH-LNEXP-L12 | Dériver une exponentielle | 4 |
| MATH-LNEXP-L13 | Lire les limites de l’exponentielle | 4 |
| MATH-LNEXP-L14 | Résoudre une équation avec ln ou exp | 5 |
| MATH-LNEXP-L15 | Résoudre une inéquation avec ln ou exp | 4 |

### MATH-SUITES — Suites numériques

11 leçons, 47 minutes indicatives, 16 exercices : 5 / 7 / 4 aux niveaux 1 / 2 / 3.

| Code | Leçon | Minutes |
| --- | --- | --- |
| MATH-SUITES-L1 | Une suite : un nombre à chaque rang | 3 |
| MATH-SUITES-L2 | Formule directe ou calcul de proche en proche | 4 |
| MATH-SUITES-L3 | Suite arithmétique : ajouter toujours le même nombre | 4 |
| MATH-SUITES-L4 | Additionner des termes arithmétiques | 4 |
| MATH-SUITES-L5 | Suite géométrique : multiplier toujours par le même nombre | 4 |
| MATH-SUITES-L6 | Additionner des termes géométriques | 4 |
| MATH-SUITES-L7 | Savoir si une suite monte ou descend | 4 |
| MATH-SUITES-L8 | Comprendre une limite de suite | 5 |
| MATH-SUITES-L9 | Prouver une propriété par récurrence | 5 |
| MATH-SUITES-L10 | Prouver la convergence avant de chercher la limite | 5 |
| MATH-SUITES-L11 | Transformer une récurrence affine en suite géométrique | 5 |

### MATH-PROBA — Dénombrement et probabilités

14 leçons, 59 minutes indicatives, 16 exercices : 4 / 8 / 4 aux niveaux 1 / 2 / 3.

| Code | Leçon | Minutes |
| --- | --- | --- |
| MATH-PROBA-L1 | Décrire une expérience aléatoire | 3 |
| MATH-PROBA-L2 | Calculer une probabilité en équiprobabilité | 4 |
| MATH-PROBA-L3 | Compter des choix successifs | 4 |
| MATH-PROBA-L4 | Choisir un groupe sans tenir compte de l’ordre | 4 |
| MATH-PROBA-L5 | Traduire « et » et « ou » | 4 |
| MATH-PROBA-L6 | Calculer une probabilité sachant une information | 4 |
| MATH-PROBA-L7 | Utiliser un arbre pour additionner les bons chemins | 5 |
| MATH-PROBA-L8 | Distinguer indépendance et incompatibilité | 4 |
| MATH-PROBA-L9 | Décrire la loi d’une variable aléatoire | 5 |
| MATH-PROBA-L10 | L’espérance : une moyenne pondérée | 4 |
| MATH-PROBA-L11 | Variance et écart-type : mesurer la dispersion | 5 |
| MATH-PROBA-L12 | Reconnaître et calculer une loi binomiale | 5 |
| MATH-PROBA-L13 | Moyenne et dispersion d’une loi binomiale | 4 |
| MATH-PROBA-L14 | Calculer « au moins » et « au plus » | 4 |

## Couverture des leçons par les exercices

Les mini-questions vérifient chaque leçon immédiatement ; les références ci-dessous désignent les exercices du module, avec le préfixe commun omis.

| Module | Correspondance leçon → exercices |
| --- | --- |
| LNEXP | L1 → E01 ; L2 → E03 ; L3 → E02/E03 ; L4 → E02/E04 ; L5 → E02/E04 ; L6 → E05/E07/E15 ; L7 → E06 ; L8 → E08/E16 ; L9 → E09 ; L10 → E10 ; L11 → E10 ; L12 → E11 ; L13 → E12 ; L14 → E13/E14 ; L15 → E15. |
| SUITES | L1 → E01 ; L2 → E02 ; L3 → E03/E05 ; L4 → E06 ; L5 → E04/E05 ; L6 → E07/E16 ; L7 → E08/E13 ; L8 → E09/E14 ; L9 → E10/E15 ; L10 → E11/E13 ; L11 → E12/E14/E16. |
| PROBA | L1 → E01 ; L2 → E02/E04 ; L3 → E03 ; L4 → E03/E13/E15 ; L5 → E05/E08 ; L6 → E06/E07/E14 ; L7 → E07 ; L8 → E08/E11/E14 ; L9 → E09/E15/E16 ; L10 → E10/E16 ; L11 → E12/E15 ; L12 → E11/E16 ; L13 → E12 ; L14 → E12/E16. |

## Correspondance des anciens codes de leçons

**Attention à la progression enregistrée :** les codes de modules sont stables, mais les anciens codes L1 et L2 sont réutilisés dans un ordre pédagogique nouveau. Une ancienne validation de L1 ou L2 ne signifie donc pas que l’apprenant a suivi les nouveaux contenus. Cette table décrit une correspondance éditoriale, **pas une migration automatique des validations**. Une migration ou une réinitialisation ciblée des progressions relève du propriétaire, hors de ce lot ; aucune donnée d’apprenant n’a été modifiée.

| Ancien code et ancien titre | Nouveaux codes où les thèmes sont développés |
| --- | --- |
| `MATH-LNEXP-L1` — La fonction logarithme népérien | `MATH-LNEXP-L2`, `MATH-LNEXP-L3`, `MATH-LNEXP-L4`, `MATH-LNEXP-L5`, `MATH-LNEXP-L6`, `MATH-LNEXP-L8`, `MATH-LNEXP-L9`. |
| `MATH-LNEXP-L2` — La fonction exponentielle | `MATH-LNEXP-L10`, `MATH-LNEXP-L11`, `MATH-LNEXP-L12`, `MATH-LNEXP-L13`, `MATH-LNEXP-L14`, `MATH-LNEXP-L15`. |
| `MATH-SUITES-L1` — Suites arithmétiques et géométriques | `MATH-SUITES-L3`, `MATH-SUITES-L4`, `MATH-SUITES-L5`, `MATH-SUITES-L6`. |
| `MATH-SUITES-L2` — Récurrence et convergence | `MATH-SUITES-L7`, `MATH-SUITES-L8`, `MATH-SUITES-L9`, `MATH-SUITES-L10`, `MATH-SUITES-L11`. |
| `MATH-PROBA-L1` — Dénombrer sans se tromper | `MATH-PROBA-L3`, `MATH-PROBA-L4`. |
| `MATH-PROBA-L2` — Probabilités et loi binomiale | `MATH-PROBA-L2`, `MATH-PROBA-L5`, `MATH-PROBA-L6`, `MATH-PROBA-L7`, `MATH-PROBA-L8`, `MATH-PROBA-L12`, `MATH-PROBA-L13`, `MATH-PROBA-L14` ; les préalables sur les variables et leurs moments sont développés en `MATH-PROBA-L9`, `MATH-PROBA-L10`, `MATH-PROBA-L11`. |

Fondations nouvelles sans ancien équivalent autonome : LNEXP-L1 (puissances), LNEXP-L7 (sens de la dérivée), SUITES-L1/L2 (termes et définitions), PROBA-L1 (univers et événements). Les équations/inéquations, récurrences affines et moments reçoivent aussi des applications nouvelles. Les anciens codes d’exercices E01–E09 sont réaffectés ; il ne faut pas interpréter une ancienne réussite comme une réussite au nouvel énoncé.

## Vérifications effectuées

- Chargement JavaScript et `npm run prep:check` après la fin de chaque module, puis sur l’ensemble du lot. Résultat final : **✅ Contenu valide : 14 modules, 62 leçons, 147 exercices, 8 programmes.** Aucun avertissement du validateur.
- Audit structurel en mémoire : mêmes sept champs de module ; 16 exercices par module ; indices de leçons, exercices et mini-questions consécutifs ; une mini-question par leçon ; dernier bloc de type récapitulatif ; durées de 3–5 minutes et blocs dans la fourchette demandée ; notions déclarées ; mini-cours avec titre, corps, règle à retenir et corps inférieur à 150 mots ; provenance de tous les exercices, y compris mini-questions. Aucun fichier de test supplémentaire n’est introduit.
- Contrôle des 88 exercices/mini-questions du lot, avec niveaux croissants pour les exercices notés. Les codes sont également vérifiés dans toute la bibliothèque par `prep:check`.
- Les **31 réponses numériques**, mini-questions comprises, ont été recalculées indépendamment : listes de termes pour les sommes, énumération des 36 couples de dés, des 16 séries de lancers et des 28 paires de boules, ainsi que calcul direct des espérances. Pour l’urne ENSEA : effectifs **6, 13, 6, 3**, E(X) = **17/14**, V(X) = **159/196**. Pour les analyses groupées avec n = 20 : **21 − 20 × 0,95²⁰ ≈ 13,83028155**.
- Les réponses arrondies sont stockées avec la valeur arrondie demandée, non avec une approximation brute et une large tolérance : par exemple 1,10 au centième, 0,417 et 0,811 au millième. La tolérance absolue de 0,000001 absorbe les effets de représentation numérique sans accepter une unité d’arrondi voisine. Les valeurs exactes gardent une tolérance nulle.
- Dérivées et résolutions revérifiées par décomposition algébrique. Les dérivées de ln(x)/x et de 5x² + 2x − 2x² ln x ont aussi été confrontées à des différences centrées en quatre points positifs. Le QCM sur xe⁻ˣ demande explicitement le **plus grand** intervalle de croissance, pour éviter qu’un sous-intervalle proposé soit lui aussi une réponse correcte.
- Les dix exercices déclarés comme adaptations ont été reliés à une entrée existante de l’index local, avec année et PDF contrôlés. Les autres contenus restent explicitement originaux.
- Aucun `npm run prep:pack` exécuté ; aucun pack généré ou fichier mobile modifié par ce travail.

## Limites et incertitudes

1. Ce lot donne une progression de fondations et des questions représentatives du niveau concours. Il ne prétend pas remplacer un sujet complet ni couvrir les intégrales, complexes ou fonctions trigonométriques présentes dans certaines annales. Le logarithme en base quelconque et des limites locales plus spécialisées restent hors du contenu réécrit.
2. En ISE économie, les variables continues, lois géométrique/Poisson/normale/exponentielle, covariance, estimation et autres compléments du programme officiel restent à traiter dans d’autres lots. Le module présent se limite aux lois discrètes finies et à la binomiale ; il ne suppose aucun cours d’analyse préalable.
3. Les grandes propriétés analytiques (existence de ln, règles de dérivation, croissances comparées) et le théorème de convergence monotone sont admis avec explication de leur rôle. Leur démonstration complète n’est pas un prérequis caché : les exercices n’exigent que les propriétés enseignées ou rappelées. De même, l’additivité des variances pour les variables indépendantes est admise explicitement.
4. Pour l’INP-HB et l’ESATIC, aucun syllabus détaillé récent des mathématiques du concours n’a été confirmé dans les pages officielles consultées. Les annales lues orientent les exercices, sans extrapoler une liste officielle exhaustive. Le format et les coefficients ESATIC 2024 doivent être revérifiés pour une session future.
5. `programmes.js` conserve ses métadonnées historiques 2026 : la consigne n’autorise ici que les changements de références de modules, inutiles puisque leurs codes sont stables. Les brochures CAPESA 2027, notamment les conditions de candidature ISE économie désormais indiquées en troisième année de licence, sont signalées dans ce rapport sans réécrire les métadonnées du programme hors périmètre.
6. La correspondance des leçons ne règle pas techniquement les validations déjà enregistrées. L’exploitation des nouveaux contenus doit tenir compte de ce changement de sens des anciens codes.
