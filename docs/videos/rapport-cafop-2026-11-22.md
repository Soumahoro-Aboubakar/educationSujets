# Vidéos YouTube des leçons CAFOP — rapport du 22 novembre 2026

Mécanisme réutilisé sans modification d’architecture : collection `prepvideos`, `GET /api/prep/videos`,
lecteur intégré existant (site et application), outillage `backend/scripts/video/externe/`
(procédure : [videos-externes.md](videos-externes.md)).

## Résultats

| Indicateur | Résultat |
|---|---|
| Leçons CAFOP (26 modules) | 224 |
| Leçons analysées | 224 |
| Vidéos validées (publiques, intégrables, en français, ≤ 15 min, revérifiées sur YouTube) | 174 |
| dont couverture exacte de la leçon / partielle | 102 / 72 |
| Durée moyenne des vidéos retenues | 5,4 min |
| Vidéos existantes conservées | 0 (aucune vidéo CAFOP n’existait) |
| Leçons sans vidéo (`a_rechercher`, aucune vidéo approximative) | 50 |
| Vidéos rejetées à la vérification puis remplacées | 3 (deux vidéos non francophones, une vidéo de 55 min annoncée à 5 min par ChatGPT) |
| Associations écrites en base | 174, **en production** le 22/11/2026 (après test sur une copie locale) |
| Tests | 90/90 (vidéos), 63/63 (préparation), relance de l’écriture sans doublon |

| Matière | Leçons | Avec vidéo |
|---|---|---|
| Mathématiques | 73 | 69 |
| Français | 63 | 53 |
| Culture générale | 56 | 36 |
| Psychopédagogie | 16 | 12 |
| ECM et Fonction publique | 8 | 4 |
| Test psychotechnique | 8 | 0 |

## Collaboration avec ChatGPT

ChatGPT (Codex CLI, recherche web, `rechercher.js`) a été réellement utilisé sur les 26 modules, en
4 lots parallèles : 22 réponses exploitables, 4 inexploitables (EDHC, Étude de texte, Vocabulaire,
Test psychotechnique). Il est efficace en mathématiques et en français, faible en culture générale
(quelques candidats seulement). La recherche directe sur la page de résultats YouTube
(`chercher-youtube.js`) a couvert les 26 modules. Claude a relu chaque candidat, choisi une vidéo par
leçon ou `null`, et chaque choix a été revérifié sur YouTube par `decider.js`.
Origine des 174 vidéos retenues : 61 proposées par ChatGPT, 113 issues de la recherche YouTube relue
par Claude.

## Leçons sans vidéo et raisons

- **Test psychotechnique (8)** : les vidéos trouvées traitent des tests de logique, alors que le test
  du CAFOP est un questionnaire de personnalité. Aucune n’a été retenue pour ne pas induire en erreur.
- **Fonction publique (4)** : les vidéos expliquent le statut français, différent de la loi ivoirienne
  n° 2023-892 (statut, recrutement, droits, positions). Seules les capsules ivoiriennes
  (« Fonction Publique Ci ») et un principe commun ont été retenus.
- **Culture générale (20)** : beaucoup de résultats sont des quiz sans explication (rejetés).
  CAFOP-CG-IA L2-L5, L7, L8 ; CG-CI L4, L8 ; CG-EDHC L1, L8 ; CG-LETTRES L1-L3, L8 ; CG-MONDE L8 ;
  CG-PAYS L1, L3, L5, L7, L8.
- **Français (10)** : leçons propres au concours (sujets 2021, 2023 et 2025 ; gestion de l’épreuve),
  titre d’un texte, plan d’un essai court, bilans de méthode.
- **Mathématiques (4)** : bilans de méthode et recherche de chiffres inconnus.
- **Professeur de CAFOP (4)** : transfert des apprentissages, analyse de prestation, didactique de la
  lecture et des mathématiques.

## Modification de code

`backend/scripts/video/externe/verifier.js` : une erreur réseau n’est plus conservée une semaine en
cache comme un refus (elle bloquait la revérification de dizaines de vidéos pendant une coupure).

## Mise en production (22 novembre 2026, avec l’accord du propriétaire)

Sauvegarde préalable de `prepcontents`, `preppublications` et `prepvideos`. Publication du contenu CAFOP (génération 1 → 2, 30 éléments ajoutés, aucun contenu existant modifié), puis `attacher.js --ecrire` : 174 vidéos ajoutées, 387 inchangées, aucune erreur ; relance sans effet (pas de doublon). L’API publique sert les 4 concours CAFOP et les 174 vidéos.

## Procédure de référence

1. Publier d’abord le contenu CAFOP en production (voir `docs/prep-contenus/09-cafop.md`) : une vidéo
   est rattachée à la révision publiée de la leçon.
2. Puis, avec l’accès à la base de production : `node scripts/video/externe/attacher.js` (à blanc),
   puis `--ecrire`. Écriture relançable sans doublon ; aucune vidéo Fatafalta n’est remplacée.
3. Contrôle périodique : `node scripts/video/externe/verifier.js --selections --force`.
