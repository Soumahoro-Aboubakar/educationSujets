# Lot 09 — CAFOP (quatre concours)

Date de consultation et de validation : 22 novembre 2026.

## Résultat

L’organisme CAFOP déjà présent au catalogue (`6adf3fe1857bb04cc210e462`) reçoit quatre préparations, une par parcours existant. Aucun organisme ni parcours n’a été créé : les programmes sont rattachés par `organisme.recherche` et le nom exact du parcours, comme les préparations pilotes.

| Programme | Parcours du catalogue | Matières | Modules publiés |
|---|---|---|---|
| `CAFOP-IA` — Concours direct d’entrée au CAFOP | Instituteur adjoint (IA) | Français, Mathématiques, Culture générale, Test psychotechnique | 17 |
| `CAFOP-RECRUT` — Concours exceptionnel d’instituteurs contractuels (2019) | Recrutement exceptionnel des enseignants contractuels | Français, Mathématiques, Culture générale | 8 |
| `CAFOP-IO` — Ancien concours d’entrée des instituteurs ordinaires | Instituteur ordinaire (IO) | Français, Mathématiques, Culture générale | 9 |
| `CAFOP-PROF` — Accès à la formation de professeur de CAFOP | Professeur de CAFOP (concours professionnel) | Psychopédagogie, ECM et Fonction publique | 5 |

**26 modules nouveaux, 224 leçons, 377 exercices notés** (plus 224 mini-questions de leçon non notées). Les modules communs (`CG-INSTIT`, `EDU-SEI`, `FR-RESUME`, `ENS-EDU-PSYCHOPEDA`) sont réutilisés par référence, sans copie. Les modules `CAFOP-*` sont partagés par les trois concours d’instituteurs.

| Module | Matière | Leçons | Exercices (niv. 1/2/3) | Exercices tirés d’annales |
|---|---|---|---|---|
| CAFOP-FR-ORTHO | Français | 10 | 15 (6/5/4) | 5 |
| CAFOP-FR-CONJ | Français | 10 | 15 (6/5/4) | 6 |
| CAFOP-FR-GRAM | Français | 9 | 15 (6/5/4) | 5 |
| CAFOP-FR-VOCAB | Français | 9 | 15 (6/5/4) | 6 |
| CAFOP-FR-TEXTE | Français | 9 | 15 (6/5/4) | 4 |
| CAFOP-MATH-NOMBRES | Mathématiques | 10 | 15 (6/5/4) | 5 |
| CAFOP-MATH-ARITH | Mathématiques | 9 | 15 (6/5/4) | 7 |
| CAFOP-MATH-PROP | Mathématiques | 10 | 15 (6/5/4) | 5 |
| CAFOP-MATH-MESURES | Mathématiques | 10 | 15 (6/5/4) | 5 |
| CAFOP-MATH-PROBLEMES | Mathématiques | 10 | 15 (6/5/4) | 7 |
| CAFOP-CG-CI | Culture générale | 8 | 14 (6/5/3) | 8 |
| CAFOP-CG-MONDE | Culture générale | 8 | 14 (6/5/3) | 11 |
| CAFOP-CG-SCIENCES | Culture générale | 8 | 14 (6/5/3) | 8 |
| CAFOP-CG-LETTRES | Culture générale | 8 | 14 (6/5/3) | 8 |
| CAFOP-PSYCHOTECH | Test psychotechnique | 8 | 14 (6/5/3) | 0 (contenu du test non publié) |
| CAFOP-PROF-PSYCHO | Psychopédagogie | 8 | 14 (6/5/3) | 5 |
| CAFOP-PROF-FONCPUB | ECM et Fonction publique | 8 | 14 (6/5/3) | 3 |

Chaque exercice porte `source` : `annale` (adaptation d’un sujet CAFOP identifié par son `documentId`, contrôlé contre `docs/referentiel-sujets/inventaire-complet.json` : 98 références, toutes valides) ou `original`. Aucune question ouverte n’est notée automatiquement : les épreuves rédactionnelles (essai, dissertation de psychopédagogie, cas pratique) sont entraînées par des exercices vérifiables et par les leçons de méthode.

Les outils existants s’appliquent sans développement spécifique : plan du jour, test de niveau, révisions et cahier d’erreurs, concours blanc chronométré noté sur 20 (`concoursBlanc` de chaque programme), classement, progression synchronisée web/Android, essai gratuit et abonnement.

## Sources officielles et informations confirmées

- [ePEDAGO (DECO) — concours direct régionalisé d’entrée dans les CAFOP-IA, session 2026](https://epedago.men-deco.org/cafop-ia) : nationalité ivoirienne ; 18 à 38 ans au 31 décembre 2025 ; BEPC ou diplôme équivalent (pas d’équivalence de l’enseignement technique) ; calendrier 2026 (épreuves écrites le samedi 11 avril 2026).
- [DECO — « Inscription aux examens et concours pédagogiques, session 2027 »](https://www.men-deco.org/actualite/actu-deco/inscription-aux-examens-et-concours-pedagogiques-session-2027) (11 novembre 2026) : le CAFOP-Instituteur adjoint figure dans la session 2027, sans dates détaillées.
- [Loi n° 2023-892 du 23 novembre 2023 portant Statut général de la Fonction publique](https://www.fonctionpublique.gouv.ci/assets/rubriques/_documentation/STATUT_GENERAL_DE_LA_FONCTION_PUBLIQUE.pdf), texte officiel lu (articles 1-3, 15-38, 46-63, 81-102). Elle remplace la loi n° 92-570 du 11 septembre 1992 : le corrigé ECM de 2004 n’est repris que lorsqu’il reste conforme.

**Non confirmé, donc non présenté comme officiel** : durées, coefficients et barèmes des épreuves du CAFOP-IA (`duree` et `coefficient` à `null`) ; contenu du test psychotechnique (module d’entraînement générique, annoncé comme tel) ; calendrier 2027 (annoncé par la presse — [Ouestin, 28/10/2026](https://ouestin.com/actualite/2026/10/28/calendrier-concours-cafop-2027-inscription-compositions-proclamation-des-resultats/) : écrits le 24 avril 2027, test psychotechnique le 26 juin 2027 — à confirmer sur men-deco.org, aucun compte à rebours n’est affiché). Les épreuves de l’IO, du recrutement exceptionnel et du concours de professeur sont déduites des anciens sujets (`fiabilite: 'anciens-sujets'`).

## Annales effectivement analysées

Les 42 sujets CAFOP gratuits (sessions 1993-2009) ont été téléchargés par l’API publique le 22/11/2026 (accord du propriétaire), rendus en images et lus intégralement ; les sujets de 2010 et après exigent un abonnement et n’ont pas été lus. Corpus : 14 sujets de culture générale, 9 de français, 16 de mathématiques (IO), 3 de psychopédagogie et 1 d’ECM (professeur de CAFOP).

Constats utilisés : en français, un texte suivi de questions de compréhension, vocabulaire, grammaire, conjugaison et orthographe, avec un court essai (2 h, coefficient 4 imprimés sur les sujets IO) ; en mathématiques, 4 à 6 problèmes rédigés (2 h, coefficient 3 sur les sujets IO), avec équations et systèmes dans 10 sujets sur 10 et arithmétique dans 8 sur 10 ; en culture générale, cinq rubriques (arts-culture-sports, littérature, sciences, histoire, géographie), les associations auteur-œuvre revenant dans 12 sujets sur 14 ; pour le professeur de CAFOP, un texte et trois questions (3 h, coefficient 2) et un cas pratique ECM (2 h, coefficient 2).

Plusieurs corrigés imprimés sont faux (requin et caïman classés parmi les mammifères en 1993, alexandrin « de dix pieds », hématies qui « assurent la circulation du sang », régions administratives antérieures à 2011…). Les exercices concernés donnent la réponse exacte et signalent l’erreur.

## Renforcement avec les sujets 2010-2026 (22 novembre 2026, après-midi)

À la demande du propriétaire, les 37 sujets CAFOP de 2010 à 2026 ont été lus directement depuis le stockage (script en lecture seule chargeant `.env` sans afficher aucune valeur ; aucune écriture en base ni sur le stockage). Constats :

- **Durées et coefficients officiels du CAFOP-IA** (imprimés sur les sujets DECO 2021-2025) : français 2 h, coefficient 3 (compréhension 5, vocabulaire 3, structure et syntaxe 6, essai 6) ; mathématiques 2 h, coefficient 1 ; culture générale 1 h, coefficient 2. Ils sont désormais renseignés dans `CAFOP-IA` ; ceux des sujets IO et Professeur aussi.
- **Mathématiques IA** : un QCM d’environ 9 questions puis des exercices du programme de 3ᵉ (radicaux, intervalles, inéquations et systèmes, fonctions affines, vecteurs, repère, trigonométrie, angles inscrits, Thalès, solides, statistiques). Deux modules ajoutés : `CAFOP-MATH-ALGEBRE` et `CAFOP-MATH-GEOMETRIE` (12 et 11 exercices tirés des sujets 2021-2026).
- **Culture générale IA** : rubriques arts-culture-sport, littérature, histoire, géographie, sciences et, depuis 2025, EDHC. Module ajouté : `CAFOP-CG-IA` (14 exercices tirés des sujets 2021-2025).
- **Test psychotechnique** : les cahiers 2022 et 2025 contiennent un **questionnaire de personnalité** d’environ 180 affirmations notées de A à E, pas des tests de logique. `CAFOP-PSYCHOTECH` a été entièrement réécrit (format, échelle, feuille de réponses, cohérence, rythme). Le cahier interdit toute reproduction : aucune affirmation n’est recopiée, les exemples sont originaux.
- **Français IA** : la structure confirme les modules existants ; trois exercices tirés des textes 2021, 2023 et 2025 ont été ajoutés à `CAFOP-FR-TEXTE`.
- Les concours IO et Recrutement exceptionnel reçoivent les modules qui leur manquaient (culture générale CAFOP-CG-*, conjugaison, vocabulaire, algèbre et géométrie).

Total des références d’annales CAFOP contrôlées : 143, toutes valides.

## Extension (22 novembre 2026, fin d’après-midi)

Six modules ajoutés dans la continuité des précédents (chacun cite son module prérequis et se place après lui dans les programmes) :

| Module | Suite de | Leçons | Exercices | Exercices tirés d’annales |
|---|---|---|---|---|
| CAFOP-FR-ESSAI — Rédiger l’essai | CAFOP-FR-TEXTE | 8 | 14 | 4 |
| CAFOP-FR-SUJETS — Sujets de français corrigés (2021, 2023, 2025) | tous les modules de français | 8 | 14 | 21 |
| CAFOP-MATH-SUJETS — Sujets de mathématiques corrigés (2017-2021) | tous les modules de mathématiques | 8 | 14 | 12 |
| CAFOP-CG-EDHC — Droits de l’homme et citoyenneté | CG-INSTIT, CAFOP-CG-IA | 8 | 14 | 2 |
| CAFOP-CG-PAYS — Pays, capitales et géographie du monde | CAFOP-CG-MONDE, CAFOP-CG-CI | 8 | 14 | 1 |
| CAFOP-PROF-DIDACTIQUE — Didactique et préparation de la classe | CAFOP-PROF-PSYCHO | 8 | 14 | 3 |

Faits instables volontairement écartés : composition actuelle de la CEDEAO (retrait du Mali, du Burkina Faso et du Niger en 2025), titulaires actuels de fonctions. Total des références d’annales CAFOP contrôlées : 186.

## Publication

- Pack fichier : `npm run prep:pack` (fait : 56 modules, 544 leçons, 818 exercices, 12 programmes).
- Base où la publication dynamique est active (génération ≥ 1) : `node scripts/prep/publierNouveautes.js --uri=<mongodb> [--apply]`. Le script est à blanc par défaut, idempotent, n’ajoute que les codes absents, ne modifie aucun contenu publié et refuse une base distante sans `--autoriser-distant`. Testé sur une copie locale de `fatafalta-test-web` : génération 1 → 2 (17 modules + 4 programmes, tous rattachés à l’organisme CAFOP), seconde exécution sans ajout.

## Limites et suite

1. **Vidéos** : aucune vidéo CAFOP n’est encore rattachée (quota ChatGPT épuisé pendant le lot). Les leçons fonctionnent sans vidéo ; procédure : `docs/videos/videos-externes.md`.
2. **Annales 2010-2026** : lues le 22/11/2026 (voir « Renforcement ») ; certains scans IA (français 2017, 2022, 2024 ; culture générale 2017, 2020 ; maths 2011-2014) n’ont été que survolés.
3. **Concours blanc par matière** : le moteur propose un concours blanc par programme (toutes matières). Un concours blanc par matière demanderait un développement.
4. **Relecture humaine** : les modules de français et de mathématiques ont été rédigés par ChatGPT puis entièrement revérifiés (calculs refaits, deux doublons corrigés) ; la culture générale, le test psychotechnique et les modules du professeur ont été rédigés par Claude. Une relecture par un enseignant reste conseillée avant mise en avant commerciale.
