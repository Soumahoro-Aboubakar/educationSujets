# Référentiel des sujets Fatafalta — inventaire et anti-doublons

Ce dossier contient l'inventaire local de **toutes les ressources publiées** sur Fatafalta
(sujets et corrigés), leur taxonomie, leurs relations et un index des doublons potentiels.
Il sert de **référence obligatoire avant toute publication** d'un nouveau sujet.

Il est généré par `npm run referentiel:sync` (dans `backend/`) à partir de l'API publique en
**lecture seule**. Ne pas éditer à la main les fichiers générés (voir le tableau plus bas), sauf
`decisionsManuelles` dans `index-doublons.json`, `alias-organismes.json` et le champ `notes` d'une ressource.

---

## ⚠️ Règle obligatoire avant toute publication

Toute opération d'ajout ou de publication de sujets ou de corrigés (manuelle, scriptée ou réalisée
par Claude Code) suit ce protocole. Aucune exception.

1. **Mettre le référentiel à jour** s'il date de plus d'un jour (le contrôle l'affiche) :
   `cd backend && npm run referentiel:sync`
2. **Décrire le lot** à publier dans un fichier JSON (format ci-dessous), en indiquant le chemin du
   PDF dès qu'il est disponible (l'empreinte SHA-256 et la taille sont alors calculées).
3. **Contrôler le lot** (ne publie rien et n'écrit rien) :
   `cd backend && npm run verify:subjects -- <chemin/du/lot.json>`
4. **Appliquer la décision** de chaque ressource :

   | Statut | Décision |
   |---|---|
   | `doublon_confirme` | **Ne pas publier.** Indiquer la ressource existante et son identifiant. |
   | `doublon_probable` | **Suspendre.** Comparer les deux fichiers (contenu, pages, année, session) avant de décider. |
   | `a_verifier` | **Ne pas conclure automatiquement.** Examiner les raisons affichées, puis trancher (et consigner la décision). |
   | `nouvelle_ressource` | **Autorisé**, après contrôle des avertissements de métadonnées (matière ou parcours inconnus, année absente…). |

5. **Après chaque publication réussie** :
   - `npm run referentiel:empreinte -- --id <id renvoyé par le serveur> --fichier <chemin du PDF>`
   - puis `npm run referentiel:sync` pour intégrer les nouvelles métadonnées et identifiants.

En complément, l'application dispose d'un contrôle côté serveur, réservé aux comptes connectés :
`GET /api/documents/duplicates/title?title=…`. Il couvre aussi les documents **en attente ou en brouillon**,
invisibles pour ce référentiel (voir « Périmètre »).

Si les éléments disponibles ne permettent pas de trancher, **le dire explicitement** : ne jamais rejeter,
supprimer ou fusionner une ressource sur la seule base d'une similarité.

---

## Fichiers

| Fichier | Généré ? | Rôle |
|---|---|---|
| `README.md` | non | Ce document : règles, procédure, schéma. |
| `inventaire-complet.json` | oui | Inventaire structuré de chaque ressource (schéma ci-dessous), avec `bilan` et `limites`. |
| `inventaire-complet.csv` | oui | Même inventaire à plat (une ligne par ressource, même ordre), pour tableur. |
| `organismes.json` | oui | Organismes et établissements, avec alias, années, parcours, matières et nombre de sujets. |
| `taxonomie.json` | oui | Catalogue dynamique complet (structure, parcours, matières, nœuds par organisme) + référentiels de l'ancien modèle (catégories, universités, niveaux…). |
| `index-doublons.json` | oui (sauf `decisionsManuelles`) | Paires de ressources existantes suspectes, avec statut et raisons. |
| `relations-documents.json` | oui | Liens sujet ↔ corrigé, corrigés inclus dans le PDF, groupes « même contexte », arborescence organisme → parcours → année → matière → sujets. |
| `empreintes-fichiers.json` | alimenté par `referentiel:empreinte` | Empreintes SHA-256 des fichiers publiés (le serveur n'en stocke pas). |
| `alias-organismes.json` | non (maintenu à la main) | Autres écritures d'un même organisme (« UAO », « INP-HB », nom long). |
| `historique-analyses.md` | complété à chaque synchronisation | Compte rendu des audits successifs. |
| `journal-mises-a-jour.jsonl` | complété (jamais réécrit) | Une ligne JSON par événement : `inventaire_initial`, `synchronisation`, `ajout`, `modification`, `disparition`, `reapparition`, `empreinte`, `verification_lot`. |
| `exemple-lot.json` | non | Lot d'exemple couvrant les cas types. |

Code : `backend/scripts/referentiel/` (`lib.js` règles de comparaison, `sync.js`, `verify.js`, `record.js`).
Tests : `backend/tests/referentielSujets.test.js` (`npm run test:referentiel`).

---

## Commandes (depuis `backend/`)

```bash
npm run referentiel:sync                      # met à jour le référentiel (GET publics uniquement, ~100 requêtes espacées, ~2 min)
npm run referentiel:sync -- --dry-run         # affiche les changements sans rien écrire
npm run verify:subjects -- ../chemin/lot.json # contrôle un lot (lecture seule)
npm run verify:subjects -- lot.json --json    # rapport JSON ; --sortie rapport.json pour l'écrire ; --journaliser pour tracer
npm run referentiel:empreinte -- --id <id> --fichier <pdf>  # après publication
npm run test:referentiel                      # tests du protocole
```

Codes de sortie de `verify:subjects` : `0` uniquement des nouvelles ressources · `2` au moins un `a_verifier` ·
`1` au moins un doublon confirmé ou probable · `3` erreur (lot illisible, référentiel absent).

Les chemins passés aux commandes sont relatifs au dossier courant ; les chemins de fichiers **dans** le lot sont
relatifs au dossier du lot.

### Format d'un lot

Un tableau JSON, ou un objet `{ "lot": [ … ] }`. Tous les champs sont facultatifs, mais chaque champ manquant
réduit la fiabilité du contrôle (un avertissement le signale).

```json
{
  "lot": [
    {
      "ref": "identifiant libre pour le rapport",
      "type": "sujet",
      "titre": "INP-HB 2026 – Concours CAE : Mathématiques 1",
      "description": "…",
      "organisme": "INP-HB",
      "parcoursType": "CAE",
      "annee": "2026",
      "session": "Session 1",
      "matiere": "Mathématiques 1",
      "fichier": "pdf/inphb-2026-cae-maths1.pdf",
      "nomFichier": "facultatif si fichier est fourni",
      "tailleOctets": 123456,
      "sha256": "facultatif si fichier est fourni",
      "sujetParentId": "obligatoire pour type = corrige"
    }
  ]
}
```

`organisme` accepte le nom, le sigle, un alias ou l'identifiant. Pour un corrigé, le contexte (organisme,
année, matière, parcours) est hérité du sujet parent.

---

## Comment une ressource est comparée

Chaque candidat est comparé à toutes les ressources publiées **et** aux autres éléments du lot
(`backend/scripts/referentiel/lib.js`, fonction `compare`).

**A. Vérification exacte → `doublon_confirme`** : même identifiant serveur, même clé de stockage ou même fichier
stocké, même empreinte SHA-256 (registre `empreintes-fichiers.json`), ou décision manuelle enregistrée.
*Seule une identité de fichier ou une décision humaine permet de confirmer un doublon.*

**B. Doublons probables et correspondances incertaines.** Titres et descriptions sont normalisés (accents, casse,
ponctuation, sigles « INP-HB » → « inphb », abréviations « maths », « stats », « probas »), les mots vides retirés,
puis une similarité 0–100 % est calculée (mots communs + bigrammes de caractères). Le contexte est comparé champ
par champ : organisme (avec alias), année (« 2023 » compatible avec « 2022-2023 »), matière, type de parcours, session.

| Situation | Statut |
|---|---|
| Taille de fichier identique à l'octet, sans contradiction d'organisme ou d'année | `doublon_probable` |
| Même organisme + année + matière (+ parcours) et titres proches (≥ 60 %) | `doublon_probable` |
| Titres quasi identiques (≥ 95 %), même organisme et année, matière non renseignée | `doublon_probable` |
| Même organisme + année + matière mais titres différents | `a_verifier` |
| Même nom de fichier d'origine (non générique) | `a_verifier` (ou `probable` si titres proches) |
| Métadonnées incomplètes et titres proches (≥ 75 %) | `a_verifier` |
| Nouveau corrigé d'un sujet qui a déjà un corrigé (séparé ou inclus dans le PDF) | `a_verifier` — publier remplace l'ancien corrigé (mis à la corbeille) |
| Organisme, année, matière, parcours ou session **explicitement différents** | pas de correspondance |
| Numéros discriminants différents (« Mathématiques 1 »/« 2 », « 3A »/« 3B », « Série C »/« D ») | pas de doublon probable |
| Un sujet et un corrigé | jamais doublons l'un de l'autre |

Une similarité de titre seule ne suffit jamais : deux épreuves différentes peuvent porter des titres presque
identiques (ex. « ISE Option Mathématiques » et « ISE Option Économie » : même matière « Ordre général », parcours différents).

### Décisions manuelles

Quand une paire de `index-doublons.json` a été examinée, consigner la décision dans `decisionsManuelles` :

```json
{ "ids": ["<idA>", "<idB>"], "statut": "distinct", "date": "2026-10-10", "par": "…", "note": "<justification : contenu des deux PDF comparé, épreuves différentes>" }
```

`distinct` retire la paire de l'index ; `doublon_confirme` la confirme. Ces décisions sont conservées à chaque
synchronisation. **Ne jamais supprimer une ressource du serveur depuis ce référentiel** : la suppression se fait dans
l'administration Fatafalta, par un humain.

---

## Schéma d'une ressource (`inventaire-complet.json` → `ressources[]`)

| Champ | Signification |
|---|---|
| `id` | Identifiant MongoDB du document (`GET /api/documents/<id>`). |
| `modele` | `catalogue_dynamique` (organisme → nœuds → matière) ou `legacy` (université / catégorie / niveau). |
| `type` | `sujet` ou `corrige` (seuls types stockés par le serveur). |
| `nature` | Nature déduite du **titre** : `concours`, `examen`, `devoir`, `tp`, `td_exercices`, `baccalaureat`, `compilation`, `corrige` ; `null` si non indiquée. Source dans `nature.source`. |
| `statut` | Statut serveur (toujours `approved` : seules les ressources publiées sont visibles). |
| `titre`, `description` | Valeurs originales, accents conservés. Un corrigé n'a pas de titre : `titreHerite` le reconstitue depuis le sujet. |
| `organisme` | `{ id, nom, alias[], source }`, source = `catalogue_dynamique`, `legacy_universite` ou `legacy_institution`. |
| `parcoursType` | Type de concours / filière (ex. « Cycle moyen », « ISE Option Économie »). |
| `cheminCatalogue` | Nœuds du catalogue, de la racine à la feuille, avec le type de niveau (`annee`, `cycle`, `session`…). |
| `annee` | `{ valeur, source }` : `catalogue` (stockée sur le serveur) ou `deduite_titre` / `deduite_description` / `deduite_nomFichier` / `herite_sujet_…`. |
| `session` | `{ valeur, source }` si connue (catalogue ou déduite du texte). |
| `matiere` | `{ id, nom }` (catalogue dynamique uniquement). |
| `legacy` | Champs de l'ancien modèle : catégorie, type de concours, université, département, niveau, semestre, institution. |
| `fichier` | `nomStocke`, `cleStockage`, `nomOrigine`, `extension`, `mimeType`, `tailleOctets`, `fournisseur`. Aucun lien de téléchargement. |
| `corrige` | Pour un sujet : `inclusDansPdf` et `corrigesSeparesIds`. |
| `sujetParentId` | Pour un corrigé : le sujet corrigé. |
| `dates` | `ajout`, `creation`, `miseAJour`, `validation` (ISO 8601). |
| `champsAbsents` | Champs non renseignés sur le serveur. |
| `completude` | `complete` si titre, organisme, année (stockée) et matière sont connus ; sinon `partielle`. |
| `anomalies` | Incohérences détectées : `titre_de_test_ou_provisoire`, `titre_non_descriptif`, `titre_malforme`, `titre_egal_nom_de_fichier`, `annee_titre_…_differente_du_catalogue_…`, `corrige_inclus_mais_description_sans_corrige`, `correction_annoncee_mais_non_signalee`, `sujet_parent_absent_de_l_inventaire`. |
| `presentSurServeur` | `false` si la ressource n'apparaît plus dans l'API (elle est conservée, jamais effacée). |
| `premiereDetection`, `derniereDetection` | Dates de synchronisation. |
| `notes` | Libre, conservé entre synchronisations. |

Les compteurs volatils (vues, téléchargements) et l'identité des contributeurs ne sont pas conservés.

---

## Périmètre et limites

- **Source** : `https://educationsujets.onrender.com/api`, routes publiques GET uniquement : `/documents` (paginé,
  100 par page), `/documents?documentType=corrige`, `/seo/catalog` (contrôle croisé), `/organismes`, `/structures/:id`,
  `/organismes/:id/parcours-types`, `/matieres`, `/noeuds` (arbre complet), référentiels legacy.
- **Seules les ressources publiées** (`approved`, non supprimées) sont visibles. Les brouillons, documents en attente,
  rejetés et la corbeille nécessitent un compte administrateur : ils ne sont **pas** dans ce référentiel.
  Le contrôle serveur `/api/documents/duplicates/title` (connecté) les couvre.
- **Aucun fichier n'est téléchargé** : le téléchargement est soumis aux règles de facturation et incrémente les
  compteurs de production. Les empreintes SHA-256 ne sont donc connues que pour les fichiers enregistrés après
  publication via `referentiel:empreinte`. En leur absence, la taille à l'octet sert d'indice (probable, pas certain).
- Une image envoyée est convertie en PDF par le serveur : sa taille publiée diffère alors du fichier d'origine.
- Aucune donnée secrète n'est stockée ici (pas de jeton, pas d'e-mail, pas de lien signé).
