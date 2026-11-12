# Lot 4 — Français et méthodologie de culture générale

Rédaction et vérifications : 12 novembre 2026.

## Livraison

| Module | Leçons | Exercices notés | Mini-questions | Durée déclarée |
| --- | --- | --- | --- | --- |
| `FR-RESUME` remanié | 8 | 14 | 8 | 30 min |
| `ENSEA-AS-OG` créé | 9 | 15 | 9 | 33 min |
| `INFJ-MAG-SYNTHESE` créé | 8 | 14 | 8 | 31 min |
| Total du lot | 25 | 43 | 25 | 94 min |

Fichiers de contenu : `backend/data/prep/bibliotheque/langues.js` et nouveau `backend/data/prep/bibliotheque/francais-methodes.js`. La partie anglais de `langues.js` est conservée. Les nouveaux modules respectent les sept champs habituels et le DSL existant.

Les seules modifications fonctionnelles de `programmes.js` concernent les références suivantes, dans des matières et programmes déjà présents :

- `ENSEA-AS`, Français : promotion de `ENSEA-AS-OG`.
- `INFJ-MAG`, Culture générale : insertion de `ENSEA-AS-OG` avant la promotion de `INFJ-MAG-SYNTHESE`, après `CG-INSTIT` déjà présent.
- `INFJ-GREFFES-CMS`, Français : remplacement du placeholder `INFJ-CMS-DISSERT` par `'ENSEA-AS-OG'`, après `FR-RESUME`. Aucun module de dissertation identique n’est créé sous un second code.
- `ENS-EDUCATEUR`, Culture générale : ajout de `'ENSEA-AS-OG'` aux références existantes `FR-RESUME` et `CG-INSTIT`.

Aucun niveau, programme, matière ou étage de navigation ajouté. Les autres modifications préexistantes du dépôt sont conservées. Aucun serveur, accès à la base ou génération de pack lancé.

## Informations officielles confirmées et sources consultées

Sources Web consultées le 12 novembre 2026. Les informations historiques ci-dessous ne sont pas présentées comme des prescriptions automatiquement applicables à une nouvelle session.

1. [CAPESA, page des programmes](https://capesa.ensai.fr/informations/) : affiche désormais le concours d’avril 2027 et ses brochures.
2. [Brochure CAPESA ISE cycle long / AS 2027, octobre 2026](https://capesa.ensai.fr/app/uploads/2026/10/2027-brochure-ISE-CLAS.pdf), pages 4 et 9 : ordre général, 3 h, coefficient 25 ; contraction, 3 h, coefficient 15. Les conseils demandent analyse du sujet, arguments expliqués, plan cohérent et expression soignée ; contraction à longueur fixée avec marge de 10 %. [Brochure 2026 déjà référencée dans le programme](https://capesa.ensai.fr/app/uploads/2025/11/brochure-ISE-cycle-long-AS.pdf) : mêmes durées et coefficients pour ces deux épreuves. Les métadonnées de session du programme ne sont pas réécrites dans ce lot.
3. [CAPESA, annales et remarques du jury](https://capesa.ensai.fr/annales/) : accès aux documents 2024–2026. [Jury ISE cycle long / AS 2026](https://capesa.ensai.fr/app/uploads/2026/08/ISE-CL-AS-2026_remarques-et-recommandations-du-jury-a-lissue-du-concours.pdf), pages 3–4 et 8 : plan effectivement suivi, transitions et réponse finale ; dissertation rédigée sans titres de parties apparents. En contraction, des références aux scientifiques peuvent être nécessaires au raisonnement. Le comptage doit être réel et indiqué. Ces éléments motivent des contrôles ciblés, sans imposer à tous les concours les usages ENSEA.
4. [INFJ, matières aux concours directs](https://infj.ci/affiche-concours.php?d=CONCOURS+DIRECTS&f=MATIERES+AUX+CONCOURS) : la page institutionnelle mentionne SOG ou note de synthèse en magistrature et SOG au cycle moyen supérieur des greffes. Elle ne fournit pas ici de format détaillé rattaché à une session précise. Cela confirme la pertinence des deux méthodes, pas une longueur de note ou un nombre obligatoire de parties.
5. [Ministère de la Justice, arrêté CMS pour l’admission 2018](https://www.justice.ci/wp-content/uploads/2022/11/ARRETE-N-205-DU-1ER-MARS-2017-CMS-direct-2018-2.pdf), article 11 : dissertation d’ordre général, 4 h, coefficient 4 ; résumé ou commentaire, 3 h, coefficient 3. Confirmation historique de l’utilité du socle partagé pour le CMS.
6. [INFJ, arrêté CD Magistrature, admission 2026/session 2025](https://infj.ciconcours.com/uploads/communiques/1/CD_MAGISTRATURE.pdf) et [autre PDF Magistrature du portail](https://infj.ciconcours.com/uploads/communiques/1/magistrature.pdf) : ouverture effectuée, mais extraction des pages vide par l’outil Web. Les extraits de recherche indexés mentionnent le sujet d’ordre général ; ils ne permettent pas de certifier le détail d’un format de synthèse actuel. L’[ancienne URL officielle de l’arrêté Magistrature 2017](https://www.justice.ci/wp-content/uploads/2022/11/ARRETE-N-202-DU-1ER-MARS-2017-Magistrature-2018-5.pdf) a renvoyé une erreur 509 : elle n’est pas une preuve relue dans ce lot.
7. [ENS Abidjan, communiqué du 27 avril 2021](https://www.ensabidjan.ci/communique2021.pdf) : texte indexé consulté, indiquant pour Éducateur une épreuve de culture générale de 3 h, coefficient 2. L’ouverture directe du PDF a échoué en 502. Confirmation historique limitée ; aucune extrapolation à un programme détaillé 2026. Le format résumé et production écrite est observé directement dans le scan local 2026 ci-dessous.
8. [Université de Strasbourg, IEJ, méthodologie de note de synthèse, janvier 2020](https://droit.unistra.fr/websites/droit/iej/CRFPA/2020/Methodologie_janvier_2020.pdf) : support universitaire primaire consulté pour contrôler la distinction entre note documentaire et dissertation, la fidélité, la neutralité et l’organisation thématique. Ses modalités françaises de durée, longueur et présentation ne sont pas transposées à l’INFJ.

## Sources secondaires et statut des interprétations

La recherche a notamment renvoyé [Cours Sésame, préparation Magistrature](https://coursesesame.com/concours/magistrature/) et [ses concours blancs](https://coursesesame.com/concours-blancs/), ainsi que des agrégateurs et partages de documents. Les extraits consultés servent au repérage ; aucun programme, barème ou énoncé livré ne repose sur leur seule affirmation. Les concours blancs ne sont pas traités comme des annales officielles.

Les plans, répartitions de temps, exemples, introductions et mini-synthèses du lot sont des choix pédagogiques propres. Ils ne sont jamais présentés comme des corrigés officiels ou un barème INFJ. L’attribution des annales locales repose sur l’index demandé et les en-têtes des documents, sans authentification indépendante de chaque fichier.

## Annales effectivement analysées

Corpus local : `/private/tmp/claude-501/-Users-macbookair-Documents-projets-educationSujets/267ba4d0-68fa-4847-8c15-9efba55cda49/scratchpad/annales`.

Métadonnées : `index.json`. Lecture des textes extraits pour les sujets d’ordre général ENSEA ; lecture ciblée des consignes, passages de début et de fin pour les contractions. Pour les trois scans ENS/INFJ retenus, les `.txt` ne contiennent pratiquement que le filigrane : première page rendue à 80 dpi avec `pdftoppm -r 80 -png -f 1 -l 2`, puis inspectée visuellement. Chacun tient sur une page.

| Identifiant | Document et lecture utile | Notions observées |
| --- | --- | --- |
| `6ac272ad316193dda86e438a` | ENSEA ISE cycle long / AS 2024, ordre général, page unique | Trois sujets au choix, 3 h ; IA : rôles, progrès, dangers ; patrimoine culturel et ouverture. Relier plusieurs demandes, discuter des effets et conditions. |
| `6ac272b7316193dda86e43a6` | ENSEA ISE cycle long / AS 2025, ordre général, page unique | Réseaux sociaux et qualité de l’information ; accès équitable à l’eau aux échelles locale et transnationale. Moyens justifiés, acteurs et échelles à distinguer. |
| `6ac272c4316193dda86e43c2` | ENSEA ISE cycle long / AS 2026, ordre général, page unique | Responsabilité des anciens titulaires de mandats ; migrations et partenariat ; puissance mondiale. Définir les termes, répondre aux questions associées et discuter. Les affirmations géopolitiques ne sont pas reproduites comme des faits actuels dans le cours. |
| `6ac272a5316193dda86e4375` | ENSEA AS 2024, contraction ; consigne et passages sur recherche/découverte | 250 mots ± 10 %, total en fin de copie ; progrès, invention, travail collectif, limites et conditions sociales de la recherche. Garder les différents mouvements jusqu’à la fin. |
| `6ac272af316193dda86e4391` | ENSEA AS 2025, contraction ; consigne et passages démographie/futur | 250 mots ± 10 % ; progression explicative, hypothèses, diversité des phénomènes et conclusion sur les générations futures. Préserver prudence et point de vue. Les chiffres historiques du texte ne sont pas actualisés ni réemployés comme données actuelles. |
| `6ac272ba316193dda86e43ad` | ENSEA AS 2026, contraction ; consigne, début et fin sur l’attachement | 250 mots ± 10 %, comptage explicitant « l’ » comme un mot, total demandé ; contraste entre conceptions éducatives, expériences et découvertes nommées, effets de l’attachement. Ne pas supprimer indistinctement noms et expériences. |
| `6ad44375dd410f0b0256bc42` | INFJ Magistrature, session juillet 2025 pour admission 2026, scan page 1 | Citation attribuée à Octavio Paz sur rencontres, cultures et isolement ; « Qu’en pensez-vous ? », 4 h. Discussion argumentée d’une citation, sans dossier de synthèse. L’année source reste 2025 selon l’index et la session indiquée. |
| `6ad44320dd410f0b0256bc18` | INFJ Secrétaires des greffes, cycle moyen, session août 2025/admission 2026, scan page 1 | Dissertation, 4 h, coefficient 4 ; jeunesse particulièrement pénalisée lors des crises, affirmation à discuter. Attention à la portée de « les premiers ». Ce document est du cycle moyen, pas du CMS : il ne constitue pas une annale CMS prétendue. |
| `6ae6cbf211c325e41b45d6df` | ENS Éducateur 2026, Culture générale (Français), scan page 1 | Compréhension et explication en contexte ; résumé de 100 mots ± 10 % ; production écrite reliant la définition du travail décent au métier d’éducateur. Distinguer restitution et application argumentée. |

Les autres scans repérés dans l’index mais non inspectés ne sont pas utilisés comme preuves. Aucun dossier local de note de synthèse INFJ n’a été identifié parmi les documents ciblés : le dossier pédagogique du module est donc entièrement inventé et annoncé comme tel.

### Exercices explicitement adaptés d’une annale lue

| Exercice | Document source | Adaptation |
| --- | --- | --- |
| `FR-RESUME-E09` | `6ac272ba316193dda86e43ad` | Calcul de l’intervalle autorisé à partir de la vraie consigne, pas restitution intégrale du texte. |
| `ENSEA-AS-OG-E06` | `6ac272b7316193dda86e43a6` | Choix d’un plan couvrant les deux échelles du sujet 3 sur l’eau. |
| `ENSEA-AS-OG-E07` | `6ac272ad316193dda86e438a` | Problématique articulant progrès et dangers de l’IA, sujet 1. |
| `ENSEA-AS-OG-E12` | `6ad44375dd410f0b0256bc42` | Démarche de discussion de la citation, sans prétendre fournir son corrigé officiel. |
| `ENSEA-AS-OG-E13` | `6ae6cbf211c325e41b45d6df` | Analyse de la production écrite reliant travail décent et métier visé. |
| `INFJ-MAG-SYNTHESE-E12` | `6ad44375dd410f0b0256bc42` | Identification du travail demandé et renvoi au socle dissertation, sans répétition de celui-ci. |

Ces six exercices portent `source.type: 'annale'`, organisme, année, épreuve et `documentId`. Leur explication commence par l’organisme et la session. Les autres exercices, y compris les mini-questions, portent `source.type: 'original'` et `inspireDe`. Un exercice inspiré de la longueur ou du thème d’une annale n’est pas automatiquement présenté comme une reprise officielle.

## Choix pédagogiques et corrections

- Départ sans prérequis méthodologique : texte, idée et consigne avant résumé ; sujet et demande avant dissertation ; dossier et nature documentaire avant synthèse. Les notions propres au droit sont brièvement définies, sans enseignement de règles positives inventées.
- Une idée principale par leçon, 7–8 blocs et 3–4 minutes déclarées. Objectif, explications, exemples, piège, une mini-question et récapitulatif à chaque fois. Tableaux du contenu limités à deux colonnes.
- Le résumé existant devient huit étapes au lieu de deux longues leçons. Les notions et bonnes idées déjà présentes sont conservées et développées avec des exemples plus progressifs.
- Correction de la reformulation qui transformait « une part très importante » en « majoritaire » : la proportion supérieure à la moitié n’est pas établie par la phrase initiale. L’exercice reformulé conserve une jeunesse nombreuse et la condition de formation, sans ajouter de majorité.
- Les exemples ne sont plus déclarés systématiquement supprimables. Leur fonction décide : illustration redondante ou étape indispensable de la démonstration. Même prudence pour les noms propres.
- Comptage : aucune convention apostrophes/traits d’union n’est présentée comme universelle. L’exemple entier de résumé en L8 compte 17 mots selon sa convention explicitement donnée ; les marges 100, 150 et 250 mots sont détaillées et revérifiées.
- Le socle dissertation est écrit une seule fois. Les renvois du module INFJ et l’ordre des références dans le programme rendent le préalable explicite.
- Les plans en deux parties sont des exemples argumentés ; aucun plan obligatoire ni barème universel n’est inventé. L’usage ENSEA des parties non titrées est distingué de la présentation des notes de synthèse.
- Le dossier fictif D1–D4 revient de la carte documentaire jusqu’à une note complète. Il permet de travailler gratuité/accueil, effets limités du numérique, équipement, avis sur l’accompagnement et projet expérimental. Aucun document n’est une vraie loi, une décision réelle ou un texte officiel INFJ.
- Les exercices automatisés corrigent des choix de méthode et de fidélité. Les leçons montrent aussi une introduction, un paragraphe, une conclusion et une note entière ; la production longue ne peut pas être notée automatiquement avec les types disponibles.

### Couverture des leçons par les exercices

| Module | Leçons → exercices principaux |
| --- | --- |
| `FR-RESUME` | L1 → E01 ; L2 → E02, E04, E11 ; L3 → E03, E06 ; L4 → E05, E12 ; L5 → E07, E11 ; L6 → E08 ; L7 → E09, E10, E13 ; L8 → E12–E14. |
| `ENSEA-AS-OG` | L1 → E01, E12, E13 ; L2 → E02, E06, E07 ; L3 → E03, E07 ; L4 → E04, E08, E12 ; L5 → E06, E14, E15 ; L6 → E05 ; L7 → E09, E15 ; L8 → E10 ; L9 → E11, E14, E15. |
| `INFJ-MAG-SYNTHESE` | L1 → E01, E12 ; L2 → E02, E03, E05 ; L3 → E04 ; L4 → E06 ; L5 → E07 ; L6 → E08, E09, E11 ; L7 → E10, E12 ; L8 → E11, E13, E14. |

## Liste des leçons

### FR-RESUME — Résumé et contraction de texte

- `FR-RESUME-L1` — Comprendre ce que demande un résumé (3 min).
- `FR-RESUME-L2` — Distinguer thème, thèse et exemple (4 min).
- `FR-RESUME-L3` — Comprendre les liens entre les idées (4 min).
- `FR-RESUME-L4` — Retrouver les mouvements du texte (4 min).
- `FR-RESUME-L5` — Raccourcir sans changer le sens (4 min).
- `FR-RESUME-L6` — Conserver la manière de parler du texte (3 min).
- `FR-RESUME-L7` — Calculer et vérifier le nombre de mots (4 min).
- `FR-RESUME-L8` — Rédiger puis relire un résumé complet (4 min).

### ENSEA-AS-OG — Ordre général : la dissertation

- `ENSEA-AS-OG-L1` — Reconnaître la tâche et choisir un sujet (3 min).
- `ENSEA-AS-OG-L2` — Définir les mots et délimiter la question (4 min).
- `ENSEA-AS-OG-L3` — Construire une problématique (4 min).
- `ENSEA-AS-OG-L4` — Construire un argument avec un exemple (4 min).
- `ENSEA-AS-OG-L5` — Organiser un plan qui répond au sujet (4 min).
- `ENSEA-AS-OG-L6` — Rédiger une introduction utile (4 min).
- `ENSEA-AS-OG-L7` — Rédiger un paragraphe et une transition (4 min).
- `ENSEA-AS-OG-L8` — Conclure en répondant vraiment (3 min).
- `ENSEA-AS-OG-L9` — Organiser son temps et relire sa copie (3 min).

### INFJ-MAG-SYNTHESE — Dissertation et note de synthèse

- `INFJ-MAG-SYNTHESE-L1` — Identifier ce que la copie doit produire (3 min).
- `INFJ-MAG-SYNTHESE-L2` — Faire la carte des documents (4 min).
- `INFJ-MAG-SYNTHESE-L3` — Prendre des notes utiles et traçables (4 min).
- `INFJ-MAG-SYNTHESE-L4` — Croiser les documents au lieu de les empiler (4 min).
- `INFJ-MAG-SYNTHESE-L5` — Construire le plan de la note (4 min).
- `INFJ-MAG-SYNTHESE-L6` — Rédiger une synthèse neutre (4 min).
- `INFJ-MAG-SYNTHESE-L7` — Raisonner avec précision en culture générale et juridique (4 min).
- `INFJ-MAG-SYNTHESE-L8` — Achever et contrôler une note complète (4 min).

## Correspondance des anciens codes et progression

Le code du module `FR-RESUME` est conservé. La redistribution ci-dessous est sémantique : elle ne constitue pas une migration automatique de la progression apprenant.

| Ancienne leçon | Nouvelles leçons correspondant au contenu |
| --- | --- |
| `FR-RESUME-L1` — La méthode du résumé | `FR-RESUME-L1` (tâche), `FR-RESUME-L4` (ordre des mouvements), `FR-RESUME-L5` (condensation), `FR-RESUME-L6` (énonciation), `FR-RESUME-L7` (longueur), `FR-RESUME-L8` (méthode complète). |
| `FR-RESUME-L2` — Les connecteurs logiques | `FR-RESUME-L3` (liens logiques), puis `FR-RESUME-L4` (leur rôle dans les mouvements). |

`FR-RESUME-L2` enseigne désormais thème, thèse et exemple : son sens a changé malgré le code conservé. Les applications existantes qui mémorisent L2 comme terminée peuvent donc considérer cette nouvelle leçon comme déjà vue. Les notions de cette leçon existaient dans les exercices, mais n’étaient pas réellement enseignées auparavant. Aucun accès aux données ni migration n’est effectué dans ce lot. Il revient au propriétaire de décider d’un éventuel réajustement de progression avant publication.

Les anciens exercices E01–E09 sont réécrits ou redistribués ; E01–E14 constituent maintenant la série complète, sans conservation supposée de l’identité pédagogique d’un exercice par son seul numéro. Les nouveaux modules n’avaient que des placeholders, donc aucune ancienne leçon à migrer. `INFJ-CMS-DISSERT` n’avait aucune leçon publiée ; sa référence de programme devient `ENSEA-AS-OG` conformément à la mutualisation demandée.

## Vérifications réalisées

- `npm run prep:check` après le remaniement du résumé, après chaque nouveau module et après le raccordement des programmes : succès, aucun avertissement.
- Audit complémentaire sans fichier de test ajouté : sept champs des modules, codes de leçons et exercices consécutifs, mini-questions uniques, une mini-question et un récapitulatif par leçon, durée 3–6 min, 6–14 blocs, tableaux de trois colonnes maximum, notions valides, source et mini-cours présents, `aRetenir` présent et rappels de moins de 150 mots.
- QCM : une seule clé ; relecture des distracteurs, de la portée et des corrections. Réponses des exercices ordre, classement, glisser et surlignage relues. Aucun exercice numérique à tolérance dans ce lot.
- Six métadonnées d’annale rapprochées de l’index : organisme, année et identifiant cohérents ; adaptations annoncées en tête des corrections.
- Comptages et sommes contrôlés : 100 ± 10 % → 90–110 ; 150 ± 10 % → 135–165 ; 250 ± 10 % → 225–275 ; exemple court → 17 mots ; répartitions de temps → 180 et 240 min.
- `git diff --check` sur les fichiers concernés : succès.
- Validation globale finale attendue et relancée à la livraison : `✅ Contenu valide : 25 modules, 186 leçons, 319 exercices, 8 programmes.` Ces chiffres décrivent toute la bibliothèque présente dans l’espace de travail ; le volume propre au lot est donné en ouverture.

## Limites et incertitudes

- Pas de dossier officiel INFJ de synthèse exploité localement ; la méthode est entraînée sur un petit dossier fictif, et non sur une reproduction de note officielle. La page INFJ confirme l’alternative SOG/synthèse mais pas le nombre de pages, les titres, les références ou la conclusion à imposer à toutes les sessions.
- Le scan des greffes analysé est un sujet de cycle moyen. Le raccordement CMS s’appuie sur la page officielle des matières et l’arrêté historique CMS, sans inventer une annale CMS récente.
- L’annale ENS 2026 justifie le travail de production argumentée dans sa matière Culture générale. Cela ne signifie pas qu’une dissertation longue autonome est systématiquement demandée à toutes les sessions ENS.
- Les durées et formats administratifs déjà inscrits dans `programmes.js` n’ont pas été actualisés : seules les références de modules entraient dans le périmètre autorisé.
- Les exercices interactifs préparent les gestes méthodologiques ; un entraînement chronométré à la rédaction intégrale reste nécessaire pour évaluer une copie longue.
