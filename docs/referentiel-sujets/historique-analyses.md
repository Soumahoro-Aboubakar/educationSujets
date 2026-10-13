# Historique des analyses du référentiel

## Synchronisation du 2026-10-10 (09:19 UTC) — automatique

- Ressources publiées : **297** (295 sujets, 2 corrigés séparés, 76 sujets avec corrigé inclus)
- Catalogue dynamique : 260 · legacy : 37 · complètes : 260 · partielles : 37 · avec anomalies : 28
- Correspondances : doublon_confirme 0, doublon_probable 10, a_verifier 3
- Inventaire initial
- Requêtes HTTP : 104

## Audit initial du 2026-10-10 — compte rendu détaillé

**Méthode.** Analyse du code (`backend/models/Document.js`, `services/documentService.js`, `services/seoCatalogService.js`, routes publiques), puis extraction par l'API publique en lecture seule : `/api/documents` (3 pages de 100), `/api/documents?documentType=corrige`, `/api/seo/catalog` (contrôle croisé), arbre complet du catalogue dynamique (6 organismes : structure, types de parcours, matières, nœuds) et référentiels legacy. 104 requêtes GET espacées de 400 ms ; aucune écriture, aucun téléchargement de fichier, aucun accès à la base ni au `.env`.

**Exhaustivité.** 295 sujets récupérés pour 295 annoncés par la pagination, 2 corrigés séparés pour 2 annoncés ; les 260 sujets du catalogue SEO sont tous présents dans l'inventaire. Périmètre limité aux ressources publiées (voir README, « Périmètre et limites »).

**Organisation des données sur le serveur.** Deux modèles coexistent : le catalogue dynamique (260 sujets : ENSEA 139, EAMAC 62, inphb 30, ENA 14, ESATIC 11, ERNAM 4), structuré organisme → année → matière, le type de concours étant porté par `parcoursType` ; et l'ancien modèle (35 sujets + 2 corrigés) : université / catégorie / niveau, sans matière ni année stockée. Les 37 ressources legacy sont donc « partielles » (année déduite du titre pour 27 d'entre elles, absente pour 10 ; organisme absent pour 4).

### Doublons probables (à examiner par un humain)

- `6a5f59d065ac8dbeaa8e712c` « Examen d'Algèbre 4B avec Proposition de Correction Détaillée - Année académique 2022-2023 » ↔ `6a5f5bbe65ac8dbeaa8e71ee` « Examen d'Algèbre 4B avec Proposition de Correction Détaillée - Année académique 2022-2023 » — contexte : organisme identique, annee identique; similarité titre/description 100 %; titres quasi identiques, même organisme et même année (matière non renseignée)
- `6abef2bc25de0f7a2e7d03d7` « EAMAC 2012 – Physique, Contrôleurs de la Circulation Aérienne » ↔ `6abef2b025de0f7a2e7d03a6` « EAMAC 2012 (Franceville) – Physique, Contrôleurs de la Circulation Aérienne » — même organisme, année et matière; similarité titre/description 93 %
- `6abef2be25de0f7a2e7d03de` « EAMAC 2012 – Physique, Technicien & Technicien Supérieur » ↔ `6abef2b325de0f7a2e7d03b4` « EAMAC 2012 (Franceville) – Physique, Technicien & Technicien Supérieur » — même organisme, année et matière; similarité titre/description 92 %
- `6abef2ba25de0f7a2e7d03d0` « EAMAC 2012 – Physique, Ingénieur » ↔ `6abef2b225de0f7a2e7d03ad` « EAMAC 2012 (Franceville) – Physique, Ingénieur » — même organisme, année et matière; similarité titre/description 90 %
- `6abef28825de0f7a2e7d0384` « EAMAC 2013 (Cameroun) – Mathématiques, Ingénieur » ↔ `6abef28025de0f7a2e7d0362` « EAMAC 2013 – Mathématiques, Ingénieur » — même organisme, année et matière; similarité titre/description 90 %
- `6abef28525de0f7a2e7d037d` « EAMAC 2013 (Cameroun) – Physique, Contrôleurs de la Circulation Aérienne » ↔ `6abef27a25de0f7a2e7d0341` « EAMAC 2013 – Physique (Proposition 3), Contrôleurs de la Circulation Aérienne » — même organisme, année et matière; similarité titre/description 89 %
- `6a771a489905fe6016fc21d6` « ENA Cycle Moyen 2020 – Test d'aptitude verbale (Présélection) » ↔ `6a7a64ee9905fe6016fc2350` « ENA 2020 – Cycle moyen : Aptitude verbale » — même organisme, année et matière; similarité titre/description 88 %
- `6abef28b25de0f7a2e7d0392` « EAMAC 2013 (Cameroun, version anglaise) – Mathématiques, Technicien & Technicien Supérieur » ↔ `6abef28425de0f7a2e7d0376` « EAMAC 2013 – Mathématiques, Technicien & Technicien Supérieur » — même organisme, année et matière; similarité titre/description 81 %
- `6abef28a25de0f7a2e7d038b` « EAMAC 2013 (Cameroun) – Physique, Ingénieur » ↔ `6abef27e25de0f7a2e7d0355` « EAMAC 2013 – Physique (Proposition 2), Ingénieur » — même organisme, année et matière; similarité titre/description 80 %
- `6a5ef3785fac2a9953e88e06` « test1 » ↔ `6a5f51e36ae0bca7eebf7e03` « Examen d'Analyse 3B (Séries et intégrales impropres 1) avec Correction Détaillée - 1ère Session 2022-2023 » — taille identique à l'octet (269187 o); même nom de fichier d'origine (« Analyse3B_Series_Integrales_Impropres_Sujet_et_Correction.pdf »); contexte : organisme identique

### À vérifier

- `6a5f592f65ac8dbeaa8e7106` « Examen d'Algèbre 4A avec Proposition de Correction Détaillée - Année académique 2022/2023 » ↔ `6a5f59d065ac8dbeaa8e712c` « Examen d'Algèbre 4B avec Proposition de Correction Détaillée - Année académique 2022-2023 » — même nom de fichier d'origine (« Examen_Algebre_4A_Sujet_et_Correction.pdf »); contexte : organisme identique, annee identique
- `6a4bf8761067f0d1d6b997e7` « Test de sélection en M1 Data Science 2021 - Statistiques et Probabilités » ↔ `6a4bf9d31067f0d1d6b997f8` « Test de sélection en M1 Data Science 2021 - Mathématiques » — contexte : organisme identique, annee identique; similarité titre/description 80 %
- `6a5f51e36ae0bca7eebf7e03` « Examen d'Analyse 3B (Séries et intégrales impropres 1) avec Correction Détaillée - 1ère Session 2022-2023 » ↔ `6a5f6a16cfd044b594c230f9` « Examen d'Analyse 3B avec Proposition de Correction Détaillée - Année Académique 2022-2023 » — contexte : organisme identique, annee identique, session identique; similarité titre/description 75 %

### Anomalies relevées

- **8 documents de test ou au titre non descriptif publiés** (visibles du public) : `6a5ef3785fac2a9953e88e06` « test1 », `6a66c760cf28531ddc5743ca` « Test09 », `6a66dc32673ea4ade2aa99b4` « Dara », `6a6cad8bb2880023e548e7e8` « document-genere.pdf », `6a6d3d9cb2880023e548eaa4` « rooo**** », `6a6d40e6b2880023e548ec09` « Sujet_Bac_Histoire_Geo.pdf------------- », `6a7efa8d5bf8af377920ea77` « infas_test_1 », `6a636b31d91470ab6c504686` « test2 ».
- **20 sujets annoncent une correction dans leur titre** mais n'ont ni corrigé séparé ni l'indicateur « corrigé inclus dans le PDF » : le filtre « avec corrigé » du site ne les montre pas (surtout Université Alassane Ouattara).
- Titre malformé : `6a5f6ae2cfd044b594c2313f` « Examen de Mécanique Quantique avec Proposition de Correction Détaillée - Année Académique 2022-2022022-2023 ».
- Taxonomie : matières « Français 2 » et « français » coexistent chez inphb (casse différente) ; 4 ressources legacy sans organisme.
- Exposition de données : la route publique `GET /api/documents` renvoie `storageKey` (qui contient l'identifiant du contributeur), `file` et le nom/rôle de l'auteur et du validateur, alors que le flux SEO les exclut volontairement. Ces champs ne sont pas repris dans le référentiel, hormis la clé de stockage utile à la détection de doublons. À examiner côté backend.

Aucune ressource n'a été modifiée, supprimée ou republiée sur le serveur.
