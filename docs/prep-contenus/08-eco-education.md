# Lot 08 — Économie et éducation

Date de consultation et de validation : 12 novembre 2026.

## Résultat et périmètre

Deux modules refondus et quatre modules créés : **61 leçons, 61 mini-questions non notées et 85 exercices** dans ce lot. Les codes des modules existants sont conservés. Les quatre annonces correspondantes ont été remplacées par leurs références dans les matières existantes de `ENSEA-ISE-ECO` et `ENS-EDUCATEUR`.

Fichiers rédigés :

- `backend/data/prep/bibliotheque/education-economie.js` : ECO-MONNAIE refondu.
- `backend/data/prep/bibliotheque/economie.js` : ISE-ECO-CN, ISE-ECO-MICRO, ISE-ECO-MACRO.
- `backend/data/prep/bibliotheque/education.js` : EDU-SEI refondu et ENS-EDU-PSYCHOPEDA.
- `backend/data/prep/programmes.js` : uniquement les quatre remplacements aVenir de ce lot. Les changements des lots antérieurs déjà présents ont été conservés.
- Le présent rapport.

EDU-SEI a été déplacé dans education.js en conservant son code. Chaque fichier exporte un tableau de modules et se charge par le mécanisme existant. Aucun autre aVenir ne subsiste dans ENS-EDUCATEUR ; les références de culture générale étaient déjà publiées à l’ouverture du lot. Aucun nouveau programme, matière, niveau ou mécanisme de rendu n’a été ajouté.

L’état initial comportait de nombreuses modifications étrangères au lot. Elles ont été conservées. Aucun fichier de configuration secret n’a été consulté. Aucun serveur, accès à la base ou génération de pack n’a été lancé.

## Sources officielles et informations confirmées

### CAPESA et ENSEA

- [Page officielle des programmes CAPESA](https://capesa.ensai.fr/informations/) et [brochure ISE économie actuellement publiée, concours 2027, mise à jour octobre 2026](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-ECO.pdf), pages 4 et 9–10. Le programme inclut comptes nationaux, comportements micro et macro, mécanismes monétaires, finances publiques, échanges et développement. L’épreuve d’économie est écrite, dure 4 h et porte le coefficient 30. La brochure situe la voie externe en L3 de sciences économiques. Ce document actuel sert de référence de couverture, sans modifier les métadonnées générales du programme hors du périmètre autorisé.
- [Annales et recommandations du jury CAPESA](https://capesa.ensai.fr/annales/). Les [sujets officiels ISE économie 2025](https://capesa.ensai.fr/app/uploads/2025/05/ISE_eco_2025_sujets.pdf), page 5, et [2026](https://capesa.ensai.fr/app/uploads/2026/05/ISE_Eco_2026-sujets.pdf), page 6, confirment les intitulés des sujets économiques lus dans le corpus local : deux dissertations au choix, 4 h. Les [remarques du jury 2026](https://capesa.ensai.fr/app/uploads/2026/08/ISE-option-economie-2026_remarques-et-recommandations-du-jury-a-lissue-du-concours.pdf) ont aussi été consultées. Les conseils détaillés sur la problématisation figurent surtout dans la partie ordre général : leur transfert aux exercices d’argumentation est un choix pédagogique, pas un nouveau barème officiel d’économie.
- [Présentation officielle de la filière ISE à l’ENSEA](https://ensea.ed.ci/formation-initiale/ise/) : rôle de la filière et accès aux annales. Cette page affiche encore des informations de session 2025 ; ses modalités ne sont pas substituées à la brochure CAPESA actuelle.

Une ancienne adresse de brochure CAPESA de novembre 2024 renvoie une erreur 404. La brochure actuelle a été retrouvée depuis la navigation du site officiel ; aucune référence absente n’a été reconstituée artificiellement.

### Monnaie, comptes nationaux et développement

- [BCEAO, présentation institutionnelle](https://www.bceao.int/fr/content/presentation-de-la-bceao) : institut d’émission commun, huit États membres de l’UMOA, siège à Dakar et missions. [COFEB/BCEAO, politique monétaire](https://cofeb.bceao.int/en/node/222) : taux directeurs et réserves obligatoires. Les niveaux courants de taux directeurs ne sont pas figés dans les cours. [BCEAO, cours applicables aux transferts](https://www.bceao.int/fr/cours/cours-des-devises-contre-Franc-CFA-appliquer-aux-transferts), tableau du 12 novembre 2026 : euro à 655,957 FCFA ; [instruments de politique monétaire](https://www.bceao.int/fr/content/instruments-de-mise-en-oeuvre-de-la-politique-monetaire) : cadre des opérations et de la liquidité.
- [BCEAO, bulletin mensuel de février 2025](https://www.bceao.int/sites/default/files/2025-04/Bulletin%20Mensuel%20des%20Statistiques%20f%C3%A9vrier%202025.pdf) : nomenclature des agrégats et contreparties. Les calculs du lot sont fictifs et ne reproduisent aucune série nationale. Les agrégats sont présentés dans un cadre UEMOA simplifié, sans importer les seuils de dépôts de la zone euro.
- [Insee, PIB et composantes](https://www.insee.fr/fr/statistiques/8958305) : articulation des agrégats ; [Insee, tableau des opérations financières](https://www.insee.fr/fr/metadonnees/definition/c2071) : lien entre compte financier et capacité de financement, différence entre transactions et encours. [Jeu officiel Insee sur le tableau économique d’ensemble](https://www.data.gouv.fr/datasets/tableau-economique-densemble) : enchaînement production, revenus, épargne et financement. Ces références vérifient les concepts, sans assimiler les statistiques françaises à des données ivoiriennes.
- [FMI, guide de compilation de la balance des paiements BPM6](https://www.imf.org/external/pubs/ft/bop/2007/bop6comp.htm), [OCDE, présentation du jeu de balance des paiements](https://data-explorer.oecd.org/vis?bp=true&df%5Bag%5D=OECD.SDD.TPS&df%5Bds%5D=dsDisseminateFinalDMZ&df%5Bid%5D=DSD_BOP%40DF_BOP&fc=Th%C3%A8me&lc=fr) et [Banque de France, méthodologie 2025](https://acpr.banque-france.fr/system/files/2025-07/BDP-2025_FR_METHODOLOGIE.pdf) : séparation des comptes et convention de solde financier. Le cours annonce explicitement actifs acquis moins passifs contractés ; il ne mélange pas les conventions de signes des anciennes présentations.
- [Insee, taux de chômage](https://www.insee.fr/fr/metadonnees/definition/c1687) : chômeurs rapportés à la population active.
- [PNUD, définition de l’IDH](https://hdr.undp.org/data-center/human-development-index) : santé, éducation et revenu, limites d’une moyenne.
- [Robert Solow, conférence Nobel](https://www.nobelprize.org/prizes/economic-sciences/1987/solow/lecture/) : cadre d’analyse de la croissance. Les exemples de capital et de productivité du lot sont originaux.

### ENS et éducation ivoirienne

- [Portail officiel des concours ENS](https://ens.mesrs-ci.net/) et [communiqué Éducateurs 2026](https://ens.mesrs-ci.net/educateur) : existence de la filière et conditions administratives. Le communiqué consulté ne contient pas de programme détaillé de psychopédagogie ni de coefficients vérifiables. Il ne justifie donc pas une liste officielle d’auteurs obligatoires.
- [Site institutionnel de l’ENS](https://ens-abidjan.ci/) et [page concours directs](https://ens-abidjan.ci/concours-direct/) : informations générales et renvoi vers le portail. L’ancien communiqué [2024](https://www.ensabidjan.ci/communique%20educateur.pdf), retrouvé dans la recherche, ne sert pas à fixer les modalités 2026. L’ancienne adresse d’épreuves écrites/orales a retourné une erreur 502 : elle n’a pas été utilisée pour inventer un format.
- [Ministère ivoirien, gouvernance scolaire](https://www.education.gouv.ci/index.php/Reseaux/gouvernance) : participation des acteurs et rôle communautaire des COGES. La page comporte aussi des développements institutionnels hétérogènes : aucune composition chiffrée d’un conseil n’a été reprise comme règle générale. Son en-tête de 2026 emploie MENAET ; les cours utilisent « ministère chargé de l’éducation », pour ne pas conserver l’ancienne appellation MENA comme constante.
- [Ministère, établissements secondaires](https://www.education.gouv.ci/index.php/Reseaux/etablissement) et [DECO, examens scolaires](https://www.men-deco.org/public/) : repères collège/lycée et examens CEPE, BEPC, baccalauréat.
- [Portail gouvernemental, adoption de l’école obligatoire](https://www.gouv.ci/actualite/education-nationale-la-loi-sur-lecole-obligatoire-pour-les-enfants-de-6-a-16-ans-adoptee-a-lassemblee-nationale-2579) et [gouvernement, politique de scolarisation obligatoire](https://www.gouv.ci/actualite/politique-de-scolarisation-obligatoire-le-gouvernement-veut-des-formations-adaptees-au-marche-de-lemploi-2569) : champ 6–16 ans et référence de 2015. [Notice juridique de l’OIT/NATLEX](https://natlex.ilo.org/dyn/natlex2/r/natlex/fe/details?p3_isn=104175) : loi n° 2015-635 du 17 septembre 2015 modifiant celle de 1995. Le cours présente ce repère historique sans inventer une procédure juridique de sanction des familles.
- [Autorité chargée de l’enseignement technique, articulation formation-insertion](https://enseignement-technique.gouv.ci/actualite/340) : confirmation de l’enjeu compétences/emploi. Les pourcentages et objectifs chiffrés du scan ENS ne sont pas transformés en statistiques nationales actuelles.

### Sources scientifiques primaires complémentaires

- [Ryan et Deci, 2000](https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf) et [Ryan et Deci, 2020](https://selfdeterminationtheory.org/wp-content/uploads/2020/06/2020_RyanDeci_IntrinsicandExtrinsic.pdf) : motivation intrinsèque/extrinsèque, autonomie, compétence et lien social. Le module ne prétend pas que toute motivation extrinsèque serait inefficace ni que l’autonomie supprimerait les règles.
- [UNICEF, éducation](https://www.unicef.org/fr/education) : adaptation aux besoins, parcours d’apprentissage et accès des adolescents. Les exemples d’accompagnement du lot demeurent des situations fictives.

## Sources secondaires et degré de confiance

La recherche a également fait apparaître des pages de QuizConcours, ISE-ENEAM, Scribd et Le Secret des Maîtres, ainsi que des articles de presse et Wikipédia. Elles ont servi au repérage de pistes dans les résultats de recherche, **pas à certifier un programme ou une annale**. Les miroirs de brochures n’ont pas été préférés au document retrouvé sur CAPESA. Aucun texte pédagogique du lot n’est présenté comme une citation de ces sites.

Le corpus local contient parfois sujet et proposition de corrigé dans le même fichier. Le sujet effectivement lu fonde les attributions ; ses chiffres de contexte et les propositions de correction ne sont pas considérés comme des données officielles indépendamment vérifiées. En particulier, le fichier 2025 inverse la numérotation des sujets dans son corrigé : les métadonnées du lot suivent la page de sujet, où le climat est le **sujet 2**.

## Annales effectivement analysées

Corpus : index.json et fichiers du répertoire annales fourni. Les textes ENSEA ont été lus ; les deux sujets ENS, quasi vides en extraction, ont été rendus avec pdftoppm à 80 dpi puis inspectés visuellement. Les deux scans ENS comportent chacun une page.

| Organisme, année et ID | Éléments observés | Utilisation |
| --- | --- | --- |
| ENSEA ISE économie 2024 — 6ac272c6316193dda86e43c9 | Deux sujets au choix, 4 h ; zones monétaires/Zone franc ; croissance africaine et investissement international | Union monétaire, arbitrages, développement et financement ; adaptation ECO-MONNAIE-E13 du sujet 1 |
| ENSEA ISE économie 2025 — 6ac272d2316193dda86e43e5 | Deux sujets au choix, 4 h ; IA, développement et inégalités ; dépendance et défis climatiques | Macro : productivité, répartition, diversification et résilience ; adaptation ISE-ECO-MACRO-E15 du sujet 2 |
| ENSEA ISE économie 2026 — 6ac272df316193dda86e4408 | Deux sujets au choix, 4 h ; industrialisation verte et dépendance ; réformes monétaires, intégration et vulnérabilités | Macro et monnaie : outils, conditions et limites ; adaptation ISE-ECO-MACRO-E14 du sujet 2 |
| ENS Éducateur 2026 — 6ae69a5411c325e41b45d4cc | Scan de psychopédagogie/système éducatif, 3 h ; trois questions sur participation à l’enseignement technique, intérêt de cette formation et actions pour la développer | EDU-SEI-L6/L7 ; adaptations EDU-SEI-E10 (question 1) et E11 (question 2) |
| ENS Éducateur 2026 — 6ae6cbf211c325e41b45d6df | Scan de culture générale/français, 3 h ; compréhension, résumé en 100 mots avec tolérance de 10 %, production écrite sur le travail décent et l’éducateur | Vérification des besoins de rédaction ; les modules existants FR-RESUME et ENSEA-AS-OG sont déjà référencés, sans duplication |

Les sujets économiques 2025 et 2026 ont été rapprochés des PDF CAPESA officiels. Pour les scans ENS, l’en-tête et le contenu sont lisibles dans le corpus ; leur hébergement public officiel individuel n’a pas été retrouvé. Les durées de ces scans décrivent ces sujets, pas toutes les sessions futures. Aucun autre sujet ancien non lu n’est cité comme preuve d’une récurrence.

Sur ces trois sessions économiques, on observe le retour de l’intégration/monnaie, de la transformation productive, de la dépendance et de la durabilité, sous forme argumentative. Le scan ENS justifie une place explicite à l’orientation technique ; il ne prouve pas une récurrence des théories de Piaget, Maslow ou Vygotski dans des sessions non disponibles.

Cinq exercices notés ont une source annale avec organisme, année, épreuve et documentId ; leur correction commence par l’attribution et précise l’adaptation. Tous les autres exercices notés portent une source original. Les mini-questions portent aussi une source original. Les calculs nationaux, budgets, fonctions et situations d’élèves sont fictifs : aucune présentation comme question officielle.

## Progression et choix pédagogiques

Ordre économique conservé dans le programme : **ECO-MONNAIE → ISE-ECO-CN → ISE-ECO-MICRO → ISE-ECO-MACRO**. Les quatre premières leçons de monnaie construisent choix, agents, circuit, marché, prix, stock/flux, valeur et pourcentage avant les mécanismes monétaires. Les modules suivants rappellent explicitement les notions nécessaires au lieu de supposer un premier cours universitaire.

Le cadre scolaire précède la psychopédagogie : **EDU-SEI → ENS-EDU-PSYCHOPEDA**. Piaget, Maslow et conduite du groupe quittent la leçon fourre-tout initiale pour des capsules dédiées. Les âges ne deviennent pas un classement rigide ; Maslow ne constitue pas un escalier universel et le style démocratique ne devient pas une garantie automatique de réussite. Les suivis partent de faits, prévoient des relais et distinguent conflit négociable et violence nécessitant protection.

Toutes les leçons durent 3 ou 4 minutes dans les données, comportent 8 ou 9 blocs environ, une mini-question et un récapitulatif. Leur volume constaté se situe autour de 200–320 mots, exemples et retours compris. Les durées sont des estimations pédagogiques, non une mesure vidéo. Microéconomie (11 capsules) et macroéconomie (14) dépassent la plage typique de 5–10 leçons pour garder les sujets séparés : rendements, coûts, monopole, équilibre général, politiques, échanges, croissance et développement ne sont pas comprimés en longues leçons.

Les exercices progressent des applications aux comparaisons et aux raisonnements conditionnels. Les tableaux de leçon ont au plus trois colonnes. Les mini-cours des exercices notés rappellent une règle sans fournir leur réponse ; les mini-questions de leçon restent non notées selon le DSL existant.

Les optimisations continues sont introduites par les rapports marginaux et leurs hypothèses ; les exercices utilisent aussi des choix discrets vérifiables. Les démonstrations de théorèmes d’équilibre général, les calculs complets de systèmes nationaux et les dissertations intégrales ne sont pas simulés par un QCM. Les exercices d’argumentation sont des entraînements guidés vers la rédaction réelle. Les modules de méthodologie déjà présents fournissent les gestes de résumé et de dissertation.

## Modules et listes de leçons

### ECO-MONNAIE — Monnaie et politique monétaire dans l’UEMOA

10 leçons ; 14 exercices ; niveaux 1 / 2 / 3 : 5 / 6 / 3.

- ECO-MONNAIE-L1 — Pourquoi l’économie étudie-t-elle des choix ? (3 min).
- ECO-MONNAIE-L2 — Qui produit et qui consomme ? (4 min).
- ECO-MONNAIE-L3 — Lire l’offre et la demande sur un marché (3 min).
- ECO-MONNAIE-L4 — Mesurer une quantité, une valeur et une variation (4 min).
- ECO-MONNAIE-L5 — Pourquoi utilise-t-on de la monnaie ? (3 min).
- ECO-MONNAIE-L6 — Comment un crédit crée-t-il un dépôt ? (4 min).
- ECO-MONNAIE-L7 — Mesurer la masse monétaire sans double compte (4 min).
- ECO-MONNAIE-L8 — Financer un projet par banque ou par titres (3 min).
- ECO-MONNAIE-L9 — Suivre une décision de politique monétaire (4 min).
- ECO-MONNAIE-L10 — Partager une monnaie : avantages et contraintes (4 min).

### ISE-ECO-CN — Comptabilité nationale

10 leçons ; 14 exercices ; niveaux 1 / 2 / 3 : 4 / 7 / 3.

- ISE-ECO-CN-L1 — Compter la valeur réellement ajoutée (4 min).
- ISE-ECO-CN-L2 — Mesurer le PIB par trois approches (4 min).
- ISE-ECO-CN-L3 — Classer les unités en secteurs institutionnels (4 min).
- ISE-ECO-CN-L4 — Passer des revenus primaires au revenu disponible (4 min).
- ISE-ECO-CN-L5 — Lire la chaîne des comptes économiques intégrés (4 min).
- ISE-ECO-CN-L6 — De l’épargne au financement de l’investissement (4 min).
- ISE-ECO-CN-L7 — Lire les opérations financières dans le TOF (4 min).
- ISE-ECO-CN-L8 — Équilibrer les ressources et les emplois d’un produit (4 min).
- ISE-ECO-CN-L9 — Distinguer intérieur, national, brut et net (4 min).
- ISE-ECO-CN-L10 — Mesurer la croissance en volume (4 min).

### ISE-ECO-MICRO — Microéconomie

11 leçons ; 15 exercices ; niveaux 1 / 2 / 3 : 4 / 6 / 5.

- ISE-ECO-MICRO-L1 — Choisir un panier dans un budget (4 min).
- ISE-ECO-MICRO-L2 — Raisonner à la marge pour choisir (4 min).
- ISE-ECO-MICRO-L3 — Mesurer la réaction de la demande (4 min).
- ISE-ECO-MICRO-L4 — Combiner travail et capital (4 min).
- ISE-ECO-MICRO-L5 — Distinguer rendement marginal et rendement d’échelle (3 min).
- ISE-ECO-MICRO-L6 — Calculer coûts, recette et profit (4 min).
- ISE-ECO-MICRO-L7 — Choisir la production en concurrence (4 min).
- ISE-ECO-MICRO-L8 — Pourquoi le monopole raisonne-t-il autrement ? (4 min).
- ISE-ECO-MICRO-L9 — Comprendre la structure d’un marché et le long terme (4 min).
- ISE-ECO-MICRO-L10 — Du marché isolé à l’équilibre général (4 min).
- ISE-ECO-MICRO-L11 — Trouver un équilibre de Nash (4 min).

### ISE-ECO-MACRO — Macroéconomie et politiques économiques

14 leçons ; 16 exercices ; niveaux 1 / 2 / 3 : 5 / 6 / 5.

- ISE-ECO-MACRO-L1 — Relier consommation et épargne au revenu (4 min).
- ISE-ECO-MACRO-L2 — Pourquoi investir aujourd’hui pour produire demain ? (4 min).
- ISE-ECO-MACRO-L3 — Comprendre l’ajustement dans le modèle classique (4 min).
- ISE-ECO-MACRO-L4 — Pourquoi une économie peut-elle produire trop peu ? (4 min).
- ISE-ECO-MACRO-L5 — Calculer un multiplicateur sous hypothèses (4 min).
- ISE-ECO-MACRO-L6 — Relier budget, déficit et dette (4 min).
- ISE-ECO-MACRO-L7 — Relier marché des biens et marché de la monnaie (4 min).
- ISE-ECO-MACRO-L8 — Comprendre l’avantage comparatif (4 min).
- ISE-ECO-MACRO-L9 — Lire la balance des paiements (4 min).
- ISE-ECO-MACRO-L10 — Comprendre le change et les vulnérabilités externes (4 min).
- ISE-ECO-MACRO-L11 — Expliquer les moteurs de la croissance (4 min).
- ISE-ECO-MACRO-L12 — Distinguer croissance, développement et pauvreté (4 min).
- ISE-ECO-MACRO-L13 — Transformer une économie face aux contraintes écologiques (4 min).
- ISE-ECO-MACRO-L14 — Mobiliser les courants de pensée dans une argumentation (4 min).

### EDU-SEI — Le système éducatif ivoirien et l’éducateur

7 leçons ; 12 exercices ; niveaux 1 / 2 / 3 : 4 / 5 / 3.

- EDU-SEI-L1 — Lire le parcours de l’enseignement général (4 min).
- EDU-SEI-L2 — Rendre la scolarisation effective (3 min).
- EDU-SEI-L3 — Identifier les acteurs de l’école (3 min).
- EDU-SEI-L4 — Suivre un élève à partir de faits (4 min).
- EDU-SEI-L5 — Poser un cadre qui protège (4 min).
- EDU-SEI-L6 — Orienter vers des parcours de formation (4 min).
- EDU-SEI-L7 — Construire une réponse sur un enjeu éducatif (4 min).

### ENS-EDU-PSYCHOPEDA — Psychopédagogie de l’adolescent

9 leçons ; 14 exercices ; niveaux 1 / 2 / 3 : 4 / 5 / 5.

- ENS-EDU-PSYCHOPEDA-L1 — Comprendre l’adolescence sans étiqueter (4 min).
- ENS-EDU-PSYCHOPEDA-L2 — Passer du concret au raisonnement sur des hypothèses (4 min).
- ENS-EDU-PSYCHOPEDA-L3 — Faire apprendre au-delà de la répétition immédiate (4 min).
- ENS-EDU-PSYCHOPEDA-L4 — Aider juste assez, puis retirer l’aide (4 min).
- ENS-EDU-PSYCHOPEDA-L5 — Soutenir une motivation qui dure (4 min).
- ENS-EDU-PSYCHOPEDA-L6 — Utiliser l’erreur pour ajuster l’aide (4 min).
- ENS-EDU-PSYCHOPEDA-L7 — Adapter les moyens sans enfermer les élèves (3 min).
- ENS-EDU-PSYCHOPEDA-L8 — Conduire un groupe avec un cadre partagé (4 min).
- ENS-EDU-PSYCHOPEDA-L9 — Traiter un conflit et repérer la violence (4 min).

## Correspondance des anciens codes de leçon

Les codes des **modules** sont inchangés. La correspondance suivante décrit les contenus, pas une migration effectuée. Les nouvelles capsules n’ont pas une équivalence de validation automatique avec les anciennes leçons longues.

| Ancien code et contenu | Nouveaux codes correspondants | Incidence pour la progression |
| --- | --- | --- |
| ECO-MONNAIE-L1 — monnaie et création | ECO-MONNAIE-L5 (fonctions et formes), ECO-MONNAIE-L6 (création) | L1 porte désormais les fondations économiques ; une ancienne validation de L1 ne démontre pas la maîtrise de ces fondations |
| ECO-MONNAIE-L2 — masse monétaire et BCEAO | ECO-MONNAIE-L7 (agrégats), ECO-MONNAIE-L9 (transmission), ECO-MONNAIE-L10 (union et parité) | L2 désigne désormais agents et circuit ; le contenu monétaire est réparti |
| EDU-SEI-L1 — organisation, cycles, obligation et COGES | EDU-SEI-L1 (parcours), EDU-SEI-L2 (obligation), EDU-SEI-L3 (acteurs) | Code L1 conservé avec périmètre réduit ; L2 et L3 ne sont pas automatiquement acquises |
| EDU-SEI-L2 — vie scolaire, Piaget, Maslow et Lewin | EDU-SEI-L4/L5 (suivi et cadre), ENS-EDU-PSYCHOPEDA-L2 (Piaget), L5 (motivation/Maslow), L8 (groupe/Lewin) | EDU-SEI-L2 désigne désormais la scolarisation effective ; les repères psychologiques sont déplacés dans le module dédié |

Nouvelles fondations sans ancien équivalent direct : ECO-MONNAIE-L1 à L4 ; développement de la finance en L8 ; EDU-SEI-L6/L7 sur l’orientation et l’argumentation. Les trois modules ISE et ENS-EDU-PSYCHOPEDA étaient des annonces sans leçons : aucun ancien code à convertir pour ceux-ci.

Les exercices des deux modules refondus ont été réécrits et renumérotés. Leurs anciens codes ne doivent pas être supposés correspondre au même item. Aucune donnée de progression ni base n’a été modifiée ; le propriétaire pourra décider de la politique de reprise en tenant compte de cette correspondance.

## Contrôles et corrections de rigueur

- Chargement par le DSL et contrôle global effectués après les intégrations de modules. Dernier contrôle : **npm run prep:check → ✅ Contenu valide : 39 modules, 392 leçons, 570 exercices, 8 programmes.** Aucun avertissement affiché.
- Audit complémentaire en mémoire : codes de leçons consécutifs, exercices à deux chiffres consécutifs, un Q1 par leçon, unicité incluant les mini-questions de toute la bibliothèque, tableaux de trois colonnes maximum, durées de 3–6 min et taille de 6–14 blocs, récapitulatif final, sources et notions des exercices, présence des niveaux 1/2/3.
- Les **27 réponses numériques** du lot ont été recalculées par des expressions arithmétiques indépendantes des clés. Les tolérances sont absolues nulles pour les résultats exacts ; la conversion euro/FCFA accepte 0,05 FCFA autour de 131 191,4, cohérent avec l’affichage à une décimale.
- QCM relus pour une seule réponse correcte ; comparaison des quatre profits discrets et examen systématique des déviations du jeu de Nash : unique équilibre (dévier, dévier). Les clés et réponses parfaites passent aussi le validateur partagé via prep:check.
- Relecture conceptuelle : impôts sur les produits distingués des impôts de l’approche revenus du PIB ; résidence distinguée de nationalité ; CI distinguées de salaires et de capital fixe ; prêts distingués de revenus ; flux distingués de réévaluations ; déficit distingué de dette ; demande solvable distinguée de besoin ; efficacité de Pareto distinguée d’équité ; élasticité finie explicitement annoncée avec base initiale.
- La politique monétaire est présentée comme conditionnelle et progressive, sans taux courant à mémoriser. Le retrait bancaire change la forme de la monnaie sans création dans le cadre donné. Les agrégats ne mélangent pas dépôts détenus et réserves des banques.
- Les gestes éducatifs sont des repères pédagogiques : aucune procédure disciplinaire détaillée ou obligation juridique de signalement non vérifiée n’a été inventée. La règle de protection renvoie aux responsables et procédures compétents.

## Limites et points à connaître

1. L’échantillon local pertinent se limite aux annales listées ; il n’autorise pas une statistique de fréquence sur 2015–2026. Les champs inspireDe n’impliquent pas que les calculs ou les théories psychologiques figuraient dans ces sujets.
2. Le programme détaillé ENS, ses coefficients actuels et une liste officielle d’auteurs de psychopédagogie n’ont pas été vérifiés. Le module adolescent est un choix de préparation à partir du titre déjà annoncé et de repères disciplinaires, pas un programme officiel inventé.
3. La brochure CAPESA est celle du concours 2027, publiée en octobre 2026. La description générale préexistante de ENSEA-ISE-ECO dans programmes.js mentionne encore « licence 2 » alors que la brochure indique L3. Ce champ n’a pas été modifié, puisque l’autorisation porte uniquement sur les références de modules ; cette incohérence de métadonnées est signalée au propriétaire.
4. Les cadres TRE/TCEI/TOF, IS-LM, multiplicateurs et choix marginaux sont des introductions rigoureuses et simplifiées. Les hypothèses sont énoncées ; ils ne remplacent ni un manuel exhaustif de licence ni la pratique de dissertations complètes et de tableaux statistiques réels.
5. Les repères légaux et institutionnels sont datés et sourcés ; les noms de responsables, organigrammes détaillés et taux monétaires variables ne sont pas transformés en contenus intemporels. La parité fixe sert uniquement au cadre explicitement présenté et à une conversion hors frais.
6. Les leçons sont calibrées pour un rendu mobile et une explication orale courte. Aucun test sur appareil ni export vidéo n’a été réalisé dans ce lot ; le code de rendu n’a pas été touché.
7. Aucun pack n’a été généré. La publication et une éventuelle reprise des anciennes progressions restent sous le contrôle du propriétaire.
