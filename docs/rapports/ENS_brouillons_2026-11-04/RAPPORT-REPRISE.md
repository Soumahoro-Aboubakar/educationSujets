# ENS — audit administratif et état de reprise du 4 novembre 2026

Mission en cours, collecte et intégration non achevées. Ce rapport décrit uniquement les opérations de cette session. Le rapport PDF antérieur est conservé et n'est pas une preuve des opérations réalisées ici.

## Résultats constatés

Connexion administrateur réussie via les deux variables autorisées, chargées en mémoire par dotenv. Aucun contenu de .env, mot de passe ou jeton affiché ou enregistré dans les rapports. API de production utilisée : https://educationsujets.onrender.com/api.

- Documents publiés rattachés au catalogue ENS : 76.
- Brouillons globaux : 394 ; rattachés ENS : 0.
- En attente rattachés ENS : 0 ; corbeille rattachée ENS : 0.
- Parcours ENS existants : 27 ; années : 13 ; matières : 18.
- Titres/parcours explicitement professionnels dans ce périmètre : 3.
- Familles professionnelles repérées sur le catalogue institutionnel : 10. Les options, matières et années d'ouverture ne sont pas encore toutes établies.
- Catégories créées : 0 ; nouveaux sujets intégrés : 0 ; corrections ajoutées : 0 ; publications : 0.
- PDF locaux antérieurs ouverts, paginés et empreintés : 13. Ils restent à vérifier ; leur conformité aux originaux n'est pas établie par la simple extraction textuelle.
- Une épreuve professionnelle 2020 consultée en aperçu ; une piste 2018 indexée ; un concours blanc 2023 écarté comme annale authentique.
- Six archives professionnelles repérées sur Fomesoutra ; rapprochement CAFOP encore nécessaire, aucune identité de fichier confirmée.

L'inventaire administratif filtre les rattachements aux nœuds ENS. Les brouillons sans métadonnées, les documents legacy ou rangés sous CAFOP peuvent échapper à ce périmètre. Les nombres ci-dessus ne prouvent donc pas une couverture de tous les fichiers ENS mal classés. Les rejets ne disposent pas d'une route de liste identifiée. Les pages des fichiers existants n'ont pas été téléchargées/comptées : champ explicitement non mesuré.

## Architecture et import

Frontend React/Tailwind dans frontend, application mobile dans fatafalta ; backend Express/Mongoose. Catalogue dynamique Organisme → Noeud (année) → Matiere, avec ParcoursType. Modèles legacy également présents.

POST /api/auth/login fournit le jeton conservé en mémoire. GET /documents/manage fournit seulement les sujets approuvés ; /drafts et /pending sont paginés séparément ; /trash est réservé au super-administrateur. L'accès à ces listes a été effectué sans modification serveur.

POST /api/documents est l'import multipart existant, réservé admin. Pour un sujet dynamique, fournir type=sujet, titre, noeudId, matiereId, hasParcoursType=true, parcoursTypeId, publicationStatus=draft et metadataStatus=false. Le service impose alors draft. Attention : le chemin correction force approved ; il ne convient pas à la contrainte de cette mission. Aucun appel d'import n'a été émis.

Stockage R2/B2 par abstraction existante, clés en base et URL signées temporaires. canAccessDocument refuse les non-approuvés aux anonymes. Vérification du code seulement : aucun test réel de confidentialité d'un nouveau fichier n'est possible puisqu'aucun fichier n'a été importé. Ne pas modifier les permissions globales.

Outils existants : pdf-lib et traitement des images serveur ; référentiel anti-doublons dans backend/scripts/referentiel. Une future insertion doit passer verify:subjects, la comparaison administrative et celle des contenus, puis un GET authentifié et des contrôles anonymes du document, du téléchargement et de /uploads.

## Couverture professionnelle 2026–2020

| Année | Candidats professionnels repérés ici | PDF vérifiés admissibles à l'import | Ajouts brouillon | À vérifier |
|---|---:|---:|---:|---:|
| 2026 | 0 | 0 | 0 | 0 |
| 2025 | 0 | 0 | 0 | 0 |
| 2024 | 0 | 0 | 0 | 0 |
| 2023 | 0 (un blanc écarté) | 0 | 0 | 0 |
| 2022 | 0 (un communiqué identifié) | 0 | 0 | 0 |
| 2021 | 0 | 0 | 0 | 0 |
| 2020 | 1 aperçu | 0 | 0 | 1 |
| Avant 2020 | 1 piste indexée + 6 entrées archives | 0 | 0 | 7 |

Ces valeurs ne signifient pas que les sujets sont introuvables. Les recherches sont partielles. Les nombres de sujets déjà présents par année doivent être lus dans inventaire-admin-ens.csv ; les archives CAFOP doivent aussi être comparées. Les six entrées sont des documents de catalogue, pas six nouvelles épreuves authentifiées.

## Décisions et obstacles

Les 13 PDF locaux concernent des concours directs d'après les mentions textuelles, sauf 2018 dont le type n'est pas explicite dans l'extraction. Ne pas les reclasser professionnels. Aucun original n'a été modifié pendant cette session. Leur provenance antérieure est décrite dans le rapport PDF déjà présent ; elle reste à revérifier avant intégration, notamment les mentions et marques de provenance et l'absence de reconstruction du contenu.

Facebook a été interrogé avant l'élargissement documentaire, sans source d'image exploitable. Scribd indique des droits réservés ; aucun contournement ni téléchargement protégé. Fomesoutra exige une autorisation écrite pour la reproduction. Le statut brouillon ne lève pas la contrainte de droits définie par la mission. Les sources publiques consultables ne constituent pas automatiquement une autorisation de réhébergement.

Aucun nouveau sujet ne possède actuellement toutes les validations nécessaires (fichier original complet, authenticité, classement professionnel, absence de doublon et droit de rediffusion). Aucun lot admissible n'a été envoyé. Les logos n'ont pas été ajoutés à ces documents non acceptés ; le logo Fatafalta existe dans fatafalta/assets/brand. Le logo institutionnel doit encore être vérifié.

## Reprise précise

1. Explorer les publications et albums Facebook publics accessibles ; ne pas utiliser les identifiants Fatafalta sur Facebook. Continuer les combinaisons annuelles et les options manquantes, sans déclarer la matrice complète.
2. Chercher les arrêtés et programmes annuels du ministère de la Fonction publique, organisateur des concours professionnels. La matrice-professionnels.csv contient 70 cases de départ ; options, matières et sessions restent ouvertes.
3. Trouver une source originale autorisée pour CAFOP Français, SGFP, 10 octobre 2020. Vérifier intégralité et doublons dans tous les organismes avant de télécharger/importer.
4. Vérifier la piste Logique CAFOP AEC, 29 septembre 2018 ; comparer les archives Fomesoutra 3944 et 3957–3961 avec les documents CAFOP déjà présents.
5. Obtenir la preuve de diffusion applicable ou une copie institutionnelle autorisée. Ne pas solliciter un tiers par message sans instruction explicite.
6. Reprendre les 13 sujets directs seulement après la priorité professionnelle ; contrôler les originaux et les marques de provenance.
7. Pour chaque candidat admissible : PDF avec couverture discrète et originaux préservés, SHA-256, lot JSON, verify:subjects, contrôle administratif, import draft, contrôle de statut et confidentialité, journal d'identifiant serveur. Ne jamais emprunter la route de correction qui approuve automatiquement.

## Documents professionnels déjà classés ENS

- 6adf2d4becb585bf0e4f2bf8 — ENS 2004 – Concours professionnel Éducateur – ECM et Fonction publique (sujet + corrigé) — approved.
- 6adf2d46ecb585bf0e4f2bdd — ENS 2004 – Concours professionnel Assistant conservateur, Professeur CAP/CPLAS, CAPEAS – ECM et Fonction publique (sujet + corrigé) — approved.
- 6adf2d41ecb585bf0e4f2bc8 — ENS 2004 – Concours professionnel CAPCM – ECM et Fonction publique (sujet + corrigé) — approved.

## Archives Professeur de CAFOP à rapprocher (référentiel public)

- 6adf8990ecb585bf0e4f5054 — CAFOP 2005 – Professeur de CAFOP (concours professionnel) – Psychopédagogie (2e sujet).
- 6adf4c60ecb585bf0e4f3f63 — CAFOP 2005 – Professeur de CAFOP (concours professionnel) – Psychopédagogie générale (1er sujet).
- 6adf4c51ecb585bf0e4f3f2d — CAFOP 2004 – Professeur de CAFOP (concours professionnel) – ECM et Fonction publique (sujet + corrigé).
- 6adf4c4becb585bf0e4f3f12 — CAFOP 2004 – Professeur de CAFOP (concours professionnel) – Psychopédagogie générale.

## Sources consultées

- https://ens-abidjan.ci/concours-professionnel/ — 10 familles repérées ; ne prouve pas leur ouverture chaque année.
- https://fr.scribd.com/document/884501871/Sujet-Sgfp — à confirmer.
- https://www.scribd.com/document/737006819/SUJETS-de-LOGIQUE-Ministere-de-La-Fonction-Publique — à confirmer.
- https://www.scribd.com/document/670740289/Professeur-de-Cafop-Option-HG — rejeté comme annale authentique.
- https://www.laurore.net/wp-content/uploads/2022/05/CP-PROF.-CAFOP-HISTOIRE-GEO.pdf — référence documentaire, pas un sujet.
- https://www.fomesoutra.com/sujets/sujet-concours/ens-sujet/professeur-de-cafop — 6 entrées repérées, non importées.
- https://www.fomesoutra.com/condition — reproduction suspendue.
- https://www.facebook.com/ — accès limité.
