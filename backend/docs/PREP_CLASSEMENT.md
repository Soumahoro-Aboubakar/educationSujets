# Classement et recherche des candidats — lot backend

Contrat de toutes les réponses réussies : `{ "success": true, "data": ... }`.
L'identité personnelle est résolue par l'en-tête `X-Prep-Token` existant. Sans identité ou sans
progression dans ce programme, `rang` et `moi` valent `null` ; la liste reste consultable.
Les trois routes ci-dessous émettent `Cache-Control: private, no-store`.

## Classement

```http
GET /api/prep/programmes/ENSEA-AS/classement
GET /api/prep/programmes/ENSEA-AS/classement?periode=semaine&limite=30
GET /api/prep/programmes/ENSEA-AS/classement?periode=semaine&limite=30&apres=<suivant>
GET /api/prep/programmes/ENSEA-AS/classement?periode=semaine&limite=30&avant=<precedent>
GET /api/prep/programmes/ENSEA-AS/classement?periode=semaine&limite=30&autour=moi
```

- `periode` : `tout` par défaut, `semaine` = activité dans les 7 derniers jours glissants,
  `mois` = 30 derniers jours glissants. Le score et les statistiques restent cumulatifs :
  la période sélectionne les participants, elle ne recalcule pas leurs scores.
- `limite` : entier positif, 30 par défaut ; les valeurs supérieures à 50 sont ramenées à 50.
- `apres` et `avant` : curseurs opaques base64url, sans remplissage, contenant
  `{score, _id}` ; `_id` est celui de la **progression**. Les clients réutilisent les chaînes
  reçues sans les fabriquer. Toujours garder le même programme et la même période.
- `apres` et `avant` sont exclusifs ; `autour=moi` est incompatible avec les deux.
- Ordre de toutes les réponses : score décroissant, puis `_id` croissant.
- Rang de compétition = nombre de participants de la période ayant un score strictement
  supérieur + 1. Les profils masqués participent au rang et au total.
- Les profils masqués sont exclus des `candidats`, y compris pour leur propriétaire ;
  celui-ci reçoit toujours `moi`, avec `visible: false`.
- `moi` est renvoyé dès qu'une progression existe, même hors page ou inactive dans la période.
  Dans ce dernier cas, le rang compare encore son score aux participants de la période : il
  peut donc valoir `total + 1`. Le profil individuel suit cette même règle.
- `autour=moi` réserve jusqu'à `floor(limite / 2)` lignes au-dessus, puis complète en dessous ;
  les places inutilisées aux bords sont remplies par l'autre côté. Si le propriétaire est
  masqué/inactif, la page est ancrée sur sa position sans l'ajouter à la liste.
  Sans progression personnelle, cette option renvoie la première page avec `moi: null`.
- `precedent` et `suivant` valent `null` quand aucun candidat visible ne reste de ce côté.
  Utiliser `avant=precedent` ou `apres=suivant`, sans conserver `autour=moi`.
- Compatibilité : `rang`, `total`, `candidats`, `moi`, `variation` et `rangApprox` sont conservés.
  `rangApprox` est désormais un alias du vrai `rang`. `variation` conserve le calcul historique
  depuis le rang de référence hebdomadaire enregistré.

Exemple illustratif pour `?limite=2` : neuf participants, dont deux masqués.
Les objets `stats` sont abrégés aux compteurs pertinents dans ces exemples ; les autres
compteurs publics existants sont également conservés.

```json
{
  "success": true,
  "data": {
    "total": 9,
    "periode": "tout",
    "rang": 7,
    "variation": 0,
    "moi": {
      "rang": 7,
      "score": 50,
      "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 },
      "visible": true,
      "identite": "000000000000000000000007",
      "pseudonyme": "Moi-4000"
    },
    "candidats": [
      {
        "identite": "000000000000000000000001",
        "pseudonyme": "Ancien-1000",
        "avatarTeinte": 0,
        "score": 100,
        "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 },
        "rang": 1,
        "rangApprox": 1,
        "moi": false
      },
      {
        "identite": "000000000000000000000003",
        "pseudonyme": "Écureuil-1172",
        "avatarTeinte": 0,
        "score": 80,
        "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 },
        "rang": 3,
        "rangApprox": 3,
        "moi": false
      }
    ],
    "precedent": null,
    "suivant": "eyJzY29yZSI6ODAsIl9pZCI6IjAwMDAwMDAwMDAwMDAwMDAwMDAwMDNlYSJ9"
  }
}
```

## Recherche

```http
GET /api/prep/programmes/ENSEA-AS/candidats?q=%C3%89CU
GET /api/prep/programmes/ENSEA-AS/candidats?q=1172
GET /api/prep/programmes/ENSEA-AS/candidats?q=cauri&periode=mois
```

`q` est une chaîne de 2 à 40 caractères Unicode après retrait des espaces de bord.
Recherche par préfixe, insensible à la casse et aux accents décomposables Unicode,
également sur le suffixe numérique du pseudonyme (`1172` trouve `Cauri-1172`). Les caractères
regex sont traités littéralement. Au plus 20 résultats visibles, ayant une progression dans
le programme et, si fournie, la période. La limite intervient après cette vérification.
L'ordre de recherche n'est pas contractuel. Le limiteur existant `limits.search` est réutilisé.

```json
{
  "success": true,
  "data": {
    "periode": "tout",
    "candidats": [
      {
        "identite": "000000000000000000000003",
        "pseudonyme": "Écureuil-1172",
        "avatarTeinte": 0,
        "score": 80,
        "rang": 3,
        "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 }
      },
      {
        "identite": "000000000000000000000004",
        "pseudonyme": "Cauri-1172",
        "avatarTeinte": 0,
        "score": 80,
        "rang": 3,
        "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 }
      }
    ]
  }
}
```

## Profil individuel

```http
GET /api/prep/programmes/ENSEA-AS/candidats/000000000000000000000003?periode=semaine
```

```json
{
  "success": true,
  "data": {
    "identite": "000000000000000000000003",
    "pseudonyme": "Écureuil-1172",
    "avatarTeinte": 0,
    "periode": "semaine",
    "rang": 2,
    "score": 80,
    "stats": { "questions": 100, "reussies": 80, "reussite": 0.8 },
    "matieresFortes": []
  }
}
```

404 si identité/progression absente ou profil masqué pour le demandeur. Le propriétaire
identifié peut consulter son profil masqué. Les matières fortes sont conservées dans un champ
public dénormalisé, alimenté à la finalisation et par la migration ; aucun `etat` n'est lu.

Paramètres invalides : HTTP 400, code `PREP_CLASSEMENT_PARAMETRE`, par exemple :

```json
{"success": false, "error": "Curseur invalide", "code": "PREP_CLASSEMENT_PARAMETRE"}
```

Le middleware d'erreur peut ajouter `requestId`. Le limiteur peut répondre HTTP 429 avec
`Retry-After` et le code `RATE_LIMITED`. Les erreurs Mongo restent gérées par le middleware
commun ; une expiration Mongo ne sert pas silencieusement des données personnelles périmées.

## Statistiques

`publicStats()` ajoute deux champs, sans changer les compteurs ni la formule du score :

- `reussies` : somme des premiers essais corrects N1–N3 (`premierCoup`), dans tous les contextes
  sauf `test`. Les répétitions comptent à nouveau. C'est le numérateur exact de `reussite`.
- `reussite` : fraction 0–1, arrondie à trois décimales, sur les mêmes premiers essais.
- `secondesChancesReussies` : compteur historique de toutes les tentatives correctes à `essai=2`,
  tous niveaux et contextes, y compris `test` ; exclues de `reussies` et `reussite`.

Les champs existants restent disponibles : `questions`, `modulesValides`, `erreurs`,
`erreursCorrigees`, `raisonnementsValides`, `serieRecord`, `meilleurBlanc`, et `serie` ajoutée
par le serveur. `questions` garde son périmètre historique, plus large que celui de `reussite`.

## Requêtes, cache et index

Aucune requête du service de classement/recherche/profil ne charge `etat`. Les recherches
simples utilisent des projections d'inclusion et `.lean()` ; les agrégations renvoient
nativement des objets simples. Toutes ces requêtes ont `maxTimeMS: 3000`.

La visibilité est vérifiée par jointure avec l'identité (index `_id` natif), **avant la limite**.
Aucun champ `visible` dénormalisé n'est nécessaire ; cela protège immédiatement les anciens
profils masqués et évite une synchronisation entre deux collections. Une visibilité absente
vaut visible. Les identités fusionnées sont exclues des listes/recherches.

Les rangs d'une page sont calculés avec une seule agrégation par intervalles de score,
incluant les masqués ; elle renvoie au plus 51 compteurs d'intervalles. Le rang personnel est
compté séparément. Aucun `skip` profond, ni comptage répété pour chaque candidat de la page.

Cache mémoire par processus, clé `(programme, période)`, expiration 45 secondes, maximum
200 entrées. Le total et les 51 premières lignes publiques servent toutes les limites jusqu'à
50. Les chargements simultanés sont mutualisés et les erreurs ne restent pas en cache.
La ligne `moi`, son rang et ses statistiques ne sont jamais servis depuis ce cache.
Invalidation du programme après finalisation ; invalidation globale après modification du
profil public et fusion d'identités. Une invalidation en vol ne peut pas réinsérer son ancien
chargement dans le cache. Les identités d'une première page réutilisée sont revérifiées par
une requête bornée (51 identités maximum) ; en cas de masquage/suppression/fusion ou de changement
du pseudonyme/avatar, la page entière est rechargée pour conserver une limite complète.

Index ajoutés aux schémas (création effective non exécutée pendant ce lot) :

| Collection | Index | Usage |
| --- | --- | --- |
| PrepProgression | `{programme:1, score:-1, _id:1, derniereActivite:1}` | Tri stable dans les deux sens ; préfixe couvrant le curseur, suffixe activité pour le filtre de période et les comptages de score |
| PrepProgression | `{programme:1, derniereActivite:1, score:-1}` | Totaux et sélection des périodes par plage de dates, score disponible dans l'index |
| PrepIdentite | `{pseudonymeNormalise:1}` | Préfixe normalisé indexable, sans option regex `i` |
| PrepIdentite | `{pseudonymeNumero:1}` | Préfixe du suffixe numérique indexable |

L'index unique existant `{identite:1, programme:1}` sert à la progression personnelle et à la
jointure de recherche. L'ancien `{programme:1, score:-1}` n'est plus déclaré ; la migration
ne le supprime pas en base. Les coûts et le plan retenu doivent être confirmés par `explain`
sur le volume cible : aucun benchmark à 400 000 candidats n'a été exécuté ici.

## Migration et limites connues

Le script idempotent `backend/scripts/migratePrepRanking.js` est fourni et **n'a pas été exécuté**.
Il requiert explicitement `PREP_MIGRATION_MONGODB_URI`, ne charge aucun `.env`, et n'a aucune
base par défaut. Il complète les champs de recherche, `stats.reussies`,
`stats.secondesChancesReussies`, les matières fortes et ajoute les index via `createIndexes()`.
Traitement par curseur et lots de 500, gardes contre les modifications concurrentes par
pseudonyme / `updatedAt`. Une relance rattrape les lignes modifiées pendant son passage.

À la création et à chaque `save()` d'identité, les champs normalisés sont alimentés par un
hook Mongoose. **Les anciennes identités non sauvegardées doivent être migrées avant que la
recherche puisse toutes les trouver** ; les anciennes statistiques/matières fortes doivent
également être rattrapées. Le classement et la confidentialité fonctionnent sans migration
de visibilité.

Les jointures utilisent la syntaxe MongoDB 5.0+ (`localField`/`foreignField` avec `pipeline`).
Version réelle du serveur non vérifiée. La performance dépend notamment du taux de profils
masqués ; les jointures s'arrêtent à la limite visible ou au délai maximal Mongo.

Le cache et ses invalidations sont locaux au processus : les scores/totaux des autres instances
expirent en 45 secondes au maximum après une écriture sur une autre instance. Les profils masqués
sont néanmoins revérifiés à chaque réutilisation de page, sans attendre cette expiration.
La pagination n'est pas un instantané : elle est sans trou ni doublon à scores/visibilités et
périmètre constants ; une modification du score pendant le défilement peut déplacer un candidat.

`prepCore.js` conserve la syntaxe CommonJS et les fonctions existantes. Sa copie dans l'app
n'a pas été touchée : le test d'identité source/copie échoue tant que le lot app ne synchronise
pas le moteur. Les résultats réels des commandes figurent dans `prep-ranking-tests.txt`.

## Fichiers du lot

- `controllers/prepController.js`, `routes/prep.js` : paramètres, recherche, confidentialité HTTP,
  invalidation du cache après modification du profil/fusion.
- `services/prep/rankingService.js`, `services/prep/pseudonymSearch.js` : classement, rangs,
  cache, recherche, profil sans état complet et normalisation.
- `services/prep/progressService.js` : délégation, compteurs/matières publics et invalidation
  après finalisation ; recalcul des statistiques lors d'une fusion.
- `services/prep/shared/prepCore.js` : compteurs publics explicites et périmètres documentés.
- `models/PrepIdentite.js`, `models/PrepProgression.js` : champs et index.
- `scripts/migratePrepRanking.js` : rattrapage explicite idempotent non exécuté.
- `tests/prepRanking.test.js`, `tests/prepRanking.integration.test.js`, `package.json` : tests
  hors base et Mongo/HTTP, ajoutés à `npm run test:prep` sans nouvelle dépendance.
- `docs/PREP_CLASSEMENT.md`, `docs/prep-ranking-tests.txt` : contrat et sorties des tests.
