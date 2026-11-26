# Indexation automatique de Fatafalta (IndexNow, sitemaps, Google Search Console)

Mise en place le 26 novembre 2026 ; non déployée. Complète [SEO.md](SEO.md) (pré-rendu, balises,
données structurées). Ce document fait foi pour l'indexation. Dans SEO.md, les parties sur
Render et sur `fatafalta.onrender.com` sont historiques : le site est sur Cloudflare Pages, à
l'adresse `fatafalta.com`.

## 1. Audit initial (production vérifiée le 26 novembre 2026)

| Constat | Conséquence |
|---|---|
| Site React pré-rendu au build sur **Cloudflare Pages** (1 880 URL dont 1 174 fiches), vrais 404, `Cache-Control: max-age=0, must-revalidate`, déploiements atomiques | Bonne base, conservée |
| Un sujet publié renvoie **404** tant que le site n'est pas reconstruit | Une notification envoyée avant la reconstruction mène le robot à une erreur |
| `seoNotifier` : file **en mémoire**, IndexNow envoyé **10 min fixes** après le hook, sans vérifier la mise en ligne, sans réessai, au-delà de 10 000 URL tronqué | Notifications perdues au redémarrage ou envoyées trop tôt ; aucun historique |
| Préparation et catalogue déclenchaient une reconstruction, mais seule `/sujets` était signalée ; organismes, parcours, noeuds et matières : rien | Pages modifiées jamais notifiées |
| Déploiements par `git push` (pages légales, gabarits) : rien n'était notifié | Changements du frontend invisibles pour Bing |
| Un seul `sitemap.xml` ; pas de `lastmod` pour les pages fixes, légales et la préparation | Google ignore un `lastmod` absent ou approximatif |
| Aucune liaison Search Console par API, aucun tableau de bord | Impossible de savoir ce qui est soumis, reçu, exploré, indexé |
| Test `prerender.test.mjs` cassé depuis l'ajout de `/suppression-compte` (expression trop large) | Corrigé |

## 2. Principe : détecter les changements dans ce que les robots voient

Chaque build publie un **manifeste** `/seo-manifest.json`. Pour chaque URL publique indexable, il
donne l'empreinte de son contenu significatif : titre, description, canonique, consigne robots,
JSON-LD et `<main>`. L'empreinte exclut l'en-tête et le pied de page, ignore les classes CSS et
normalise les espaces. Il donne aussi son `lastmod`, sa catégorie et sa présence dans le sitemap.

Le backend compare le manifeste en ligne à la base (`SeoPage`) :

| Situation | Action |
|---|---|
| URL nouvelle | ajout, signalée |
| Empreinte changée | modification, signalée |
| URL disparue | suppression, signalée après contrôle HTTP |
| Empreinte identique | rien (pas de notification, `lastmod` inchangé) |

Toutes les sources de changement sont traitées de la même façon : sujet, corrigé, organisme,
parcours, matière, préparation, métadonnées SEO, page légale, gabarit déployé par `git push`. Un
compteur de vues, un logo ou une donnée privée ne changent pas le HTML : aucune notification. Les
pages parentes ne sont signalées que si leur contenu a vraiment changé (compteurs, listes).

**`lastmod` exact** : au build, le pré-rendu lit le manifeste en ligne.

| Situation au build | `lastmod` |
|---|---|
| Empreinte inchangée | Date précédente conservée |
| Page changée | Date des données si elle est plus récente, sinon heure du build |
| Manifeste précédent absent ou incomplet | Date des données seulement, jamais une date inventée |

Une entrée de l'index de sitemaps est datée de la dernière modification de **son fichier**
(empreinte par fichier conservée dans le manifeste) : retrait d'adresse compris, et sans régression
au build suivant.

## 3. Architecture

```
Contrôleurs ──notifyCatalogChange()──▶ SeoState.dirtySince + SeoLog (2 écritures, ~0,5 ms)
                                            │
Worker (toutes les 60 s, verrou en base : un propriétaire par passage, bail de 10 min renouvelé
entre les étapes ; le worker et une action d'administration ne peuvent pas agir ensemble)
 1. Reconstruction : 10 min après le 1er changement non intégré, si aucun build n'est en cours,
    dans la limite de 10 par jour → POST hook Cloudflare Pages. Les changements ne sont effacés
    qu'à la mise en ligne du build ; un build échoué chez Cloudflare est redemandé après 45 min.
    Les changements arrivés pendant un build en déclenchent un autre.
 2. Version en ligne : seo-build.json (chaque minute si un build est attendu, sinon toutes les
    15 min) ; nouveau buildId → seo-manifest.json (même buildId exigé) → différences → file.
    Manifeste « incomplet » (catalogue ou préparation absents au build) → aucun retrait.
    Retraits > max(20, 20 %) → suspendus, confirmation dans l'administration.
 3. IndexNow (≤ 10 000 URL par requête) : fichier de clé vérifié en ligne (toutes les 6 h) ;
    suppressions vérifiées en HEAD sans suivre les redirections (40 par passage, 10 s max
    chacune) ; échantillon de 5 pages
    modifiées vérifiées en 200 ; sinon envoi reporté.
    200/202 → acceptée · 429 → Retry-After respecté, pause globale · 5xx/délai → réessai
    exponentiel (2 min → 6 h, ±20 %, 8 essais comptés par URL) · 400/403/422 → échec, relançable.
    « sent » depuis plus de 10 min (redémarrage) → rejoué.
 4. Google (si configuré) : index de sitemaps soumis après l'apparition de nouvelles URL
    (au plus 1 fois par 24 h) ; état du sitemap relu toutes les 6 h ; inspection de chaque page
    ajoutée ou modifiée 3 jours après (5 par passage, 100 par jour par défaut réservés
    atomiquement, quota API : 2 000/jour). Chaque tâche Google échoue sans bloquer les autres.
```

Choix d'infrastructure : MongoDB (déjà présent) sert de file persistante. Pas de Redis ni de
service payant : le volume se compte en milliers d'URL et les envois sont regroupés.

### États d'une URL (tableau de bord)

| État | Signification |
|---|---|
| Modifiée | Changement constaté dans une version **en ligne** |
| En attente | Dans la file, envoi prévu |
| Envoyée | Requête partie, réponse non enregistrée |
| Acceptée | IndexNow a répondu 200 ou 202 : adresse **reçue**, pas une preuve d'indexation |
| Échec | Refus ou réessais épuisés ; bouton « Relancer les échecs » |
| Explorée / Indexée | Uniquement d'après l'API d'inspection de Search Console, avec la date d'exploration et la date d'inspection |

## 4. Fichiers

Créés :
- `backend/services/seo/indexingService.js` : worker, différences, file IndexNow, tâches Google, administration.
- `backend/services/seo/googleSearchConsole.js` : jeton OAuth 2.0 d'un compte de service (JWT RS256), sitemaps, inspection d'URL. Aucune dépendance ajoutée.
- `backend/services/seo/urlPolicy.js` : validation des URL (domaine, HTTPS, chemins privés interdits).
- `backend/services/seo/config.js` : variables et valeurs par défaut.
- `backend/models/SeoPage.js`, `SeoState.js`, `SeoLog.js` : URL suivies, état global et verrou, journal (purgé après 180 jours).
- `backend/controllers/seoAdminController.js` : API d'administration.
- `backend/tests/seoIndexing.integration.test.js` : 20 tests de bout en bout (site, hook et IndexNow simulés).
- `frontend/src/components/admin/AdminSeo.js` : onglet « SEO et indexation ».
- `docs/seo-indexation.md`.

Modifiés :
- `backend/services/seoNotifier.js` : même interface, mais consignation persistante.
- `backend/controllers/dynamicCatalogController.js` : organismes, parcours, structure, noeuds et matières signalés.
- `backend/controllers/prepAdminController.js` : source « preparation ».
- `backend/routes/admin.js` : routes `/api/admin/seo/*`.
- `backend/server.js` : démarrage du worker.
- `backend/package.json` : test ajouté à `npm test`.
- `backend/tests/seoCatalog.test.js` : test de la politique d'URL.
- `frontend/scripts/prerender.mjs` : empreintes, manifeste, `seo-build.json`, sitemaps par catégorie, `lastmod`, en-têtes.
- `frontend/scripts/prerender.test.mjs` : tests de l'index, du manifeste et du `lastmod`.
- `frontend/src/pages/Dashboard.js` : nouvel onglet.

## 5. API d'administration (super administrateur)

Toutes les routes passent par `protect` + `authorize('admin')` + les limites `admin` et `adminWrite`
existantes. Aucune réponse ne contient de secret.

| Route | Rôle |
|---|---|
| `GET /api/admin/seo` | Compteurs, version en ligne, reconstruction, clé, Google, historique |
| `GET /api/admin/seo/pages?filtre=&q=&page=` | URL suivies (modifiées, en attente, acceptées, échecs, retirées, indexées) |
| `GET /api/admin/seo/rapport.csv` | Rapport complet (UTF-8, Excel) |
| `POST /api/admin/seo/reconstruction` | Régénère le site et ses sitemaps (passe outre le plafond quotidien) |
| `POST /api/admin/seo/verification` | Relit la version en ligne et traite la file tout de suite |
| `POST /api/admin/seo/retraits/confirmer {buildId}` | Applique des retraits massifs suspendus, uniquement pour la version affichée (sinon 409) |
| `POST /api/admin/seo/indexnow {url}` | Soumission manuelle : seulement une page connue de la version en ligne ; même version refusée pendant 1 h |
| `POST /api/admin/seo/echecs/relancer` | Remet les échecs en file |
| `POST /api/admin/seo/google/inspection {url}` | Inspection d'URL Search Console |
| `POST /api/admin/seo/google/sitemap` | Soumission du sitemap à Search Console |

## 6. Variables d'environnement

Backend (Render, service API) :

| Variable | Valeur | Obligatoire |
|---|---|---|
| `SITE_URL` | `https://fatafalta.com` (défaut) | non |
| `FRONTEND_DEPLOY_HOOK_URL` | **Secret** : Cloudflare → Workers & Pages → projet du site → Settings → Builds → Deploy hooks | pour la reconstruction automatique |
| `INDEXNOW_KEY` | Clé existante si elle est valide (8 à 128 caractères : lettres, chiffres, tirets). Même valeur côté site | pour IndexNow |
| `GSC_SERVICE_ACCOUNT_JSON` | **Secret** : clé JSON du compte de service, brute ou en base64 | pour Google |
| `GSC_PROPERTY` | `sc-domain:fatafalta.com` (propriété Domaine) ou `https://fatafalta.com/` | pour Google |
| `SEO_REBUILD_DELAY_MS` | Regroupement avant reconstruction (600000 par défaut) | non |
| `SEO_MAX_REBUILDS_PER_DAY` | Défaut 10 : Cloudflare Free autorise 500 builds/mois, `git push` compris | non |
| `SEO_BUILD_POLL_MS` | Lecture de la version en ligne sans build attendu (900000 par défaut) | non |
| `GSC_INSPECTIONS_PER_DAY` | Défaut 100 (quota API : 2 000) | non |
| `SEO_INDEXING_DISABLED` | `true` coupe le worker (urgence) | non |

Avancées, rarement utiles : `SEO_TICK_MS`, `SEO_REBUILD_TIMEOUT_MS`, `SEO_INDEXNOW_MAX_ATTEMPTS`,
`SEO_REMOVAL_GUARD_RATIO`, `GSC_INSPECTION_DELAY_MS`, `INDEXNOW_ENDPOINT` (tests).

Site (Cloudflare Pages → Settings → Variables) : `INDEXNOW_KEY`, avec la même valeur. Le build
publie `/<clé>.txt`. `GOOGLE_SITE_VERIFICATION` et `BING_SITE_VERIFICATION` sont inchangés.

## 7. Configurations manuelles

**Cloudflare Pages**
1. Créer un **Deploy hook** sur la branche `main`, puis copier son URL dans `FRONTEND_DEPLOY_HOOK_URL` (Render).
2. Vérifier que `INDEXNOW_KEY` est définie dans les variables de build du site.
3. Ne pas ajouter de règle de cache (Cache Rules) sur `fatafalta.com` pour les pages HTML, `/seo-*.json` ou `/sitemap*.xml`. Pages revalide déjà à chaque requête et les déploiements sont atomiques : aucune purge n'est nécessaire.

**Bing Webmaster Tools**
1. Vérifier que `https://fatafalta.com/sitemap.xml` est soumis. C'est désormais un index : Bing lit automatiquement les 4 fichiers.
2. Rapport IndexNow : les URL reçues y apparaissent après le premier envoi.

**Google Search Console**
1. Dans Google Cloud, créer un projet, activer **Google Search Console API**, créer un compte de service, puis créer une clé JSON et la placer dans `GSC_SERVICE_ACCOUNT_JSON`.
2. Dans Search Console, ajouter l'adresse e-mail du compte de service comme utilisateur **Propriétaire** de la propriété. Ce droit est nécessaire pour soumettre un sitemap ; « Complet » suffit pour l'inspection.
3. Mettre `GSC_PROPERTY` (`sc-domain:fatafalta.com` si la propriété est de type Domaine).
4. Le sitemap déjà soumis reste valable (même adresse, devenue un index).

**Déploiement** : backend d'abord, puis le site. Le premier build publie le manifeste. Le backend
l'enregistre comme **référence**, sans aucune notification. Les changements suivants sont signalés.

## 8. Tests et mesures (26 novembre 2026)

| Suite | Résultat |
|---|---|
| `backend npm test` (base locale `fatafalta-test`) | 402/402, dont les 20 tests d'indexation |
| `frontend npm run test:seo` | 13/13 |
| `frontend npm test` | 24/24 |
| `react-scripts build` | Compilé |

Scénarios couverts par `seoIndexing.integration.test.js` :

| Scénario | Comportement vérifié |
|---|---|
| Première version | Référence, aucune notification |
| Ajout | Fiche et pages parentes modifiées, envoyées une fois la version en ligne |
| Modification | Seule la page changée est signalée |
| Changement sans effet HTML | Rien n'est signalé |
| Suppression | URL vérifiée en 404, signalée |
| 1 000 sujets | 1 reconstruction, 1 requête IndexNow |
| Déploiement `git push` d'une page légale | Capté par la lecture périodique |
| IndexNow 503, délai dépassé, 429 + Retry-After | Réessais espacés, puis succès |
| IndexNow 403 | Échec visible, relançable |
| Redémarrage pendant un envoi | Envoi « sent » rejoué ; verrou d'une autre instance respecté |
| Soumissions répétées | Une URL par lot ; renvoi dans l'heure refusé |
| URL privée, étrangère, inconnue | Refusée, même glissée dans un manifeste |
| Page annoncée mais non servie | Envoi reporté |
| `seo-build.json` et manifeste de deux builds | Ignorés |
| Build incomplet, disparition massive | Aucun retrait sans confirmation |
| Hook en échec | Erreur journalisée sans fuite d'URL ; plafond quotidien appliqué |
| Routes d'administration | 401 sans jeton ; aucun secret dans les réponses ; 409 si un passage est en cours |
| Audit : passages simultanés | Un seul tient le verrou |
| Audit : build échoué chez Cloudflare | Redemandé |
| Audit : tentatives | Comptées par URL |
| Audit : URL de hook invalide | Jamais journalisée |

**Essai de bout en bout local** : vrai build (données de production, 1 880 URL), site servi comme
par Cloudflare, faux IndexNow.
- Référence : 3 006 pages suivies, dont les pages « matière » hors sitemap.
- Un sujet renommé : **5 URL** signalées (fiche, matière, organisme, `/sujets`, accueil).
- Un build incomplet : 17 retraits bloqués.
- Un sujet supprimé : fiche en 404 et 3 pages parentes vidées, signalées.

**Coût** :
- un événement prend 0,47 ms (deux écritures légères) ;
- un passage complet, différence et envoi de 1 000 URL compris, prend 170 ms ;
- 1 000 événements suivis de ce passage consomment 0,67 s de CPU au total ;
- le tas augmente temporairement d'environ 36 Mo pendant ce passage ;
- au repos, il y a une lecture de `seo-build.json` (quelques centaines d'octets) toutes les 15 min et une requête MongoDB légère par minute.

### Revues indépendantes (ChatGPT)

ChatGPT a relu l'architecture avant l'écriture du code, puis le code terminé (audit, lecture seule,
sans accès aux secrets). Tous les points vérifiés ont été corrigés et couverts par un test :
- verrou partagé par deux passages du même serveur ;
- bail du verrou non renouvelé ;
- build échoué jamais redemandé ;
- tentatives comptées par lot au lieu de par URL ;
- JSON-LD absent de l'empreinte (attribut `data-seo`) ;
- retraits possibles sur une nouvelle référence incomplète ;
- confirmation de retraits pour une autre version que celle affichée ;
- quota d'inspection non atomique ;
- inspection Google dépendante d'IndexNow ;
- erreurs Google bloquant les autres tâches ;
- `lastmod` de l'index régressant ;
- URL de hook invalide journalisée ;
- « vérification réussie » affichée alors que le verrou était occupé.

## 9. Maintenance

- **Tableau de bord** : Administration → « SEO et indexation ». À surveiller : les « Échecs » (relancer après correction), les erreurs de version (build en échec), et l'encart orange des retraits suspendus.
- **Changer l'algorithme d'empreinte** : modifier `contentFingerprint` dans `prerender.mjs` **et** incrémenter `FINGERPRINT_VERSION`. Le backend prend alors une nouvelle référence, sans notifier 3 000 pages.
- **Nouvelle page publique** : il suffit qu'elle soit écrite par `writePage` et ajoutée à `sitemap` (avec sa `category`) dans `prerender.mjs`. Une page sans empreinte fait échouer le build.
- **Nouvelle source de contenu côté API** : appeler `seo.notifyCatalogChange(ids, 'source')` après l'écriture. Un oubli n'est pas bloquant : la lecture périodique capte la version au prochain déploiement, mais aucune reconstruction n'est déclenchée.
- **Couper le système** : `SEO_INDEXING_DISABLED=true`. Les contrôleurs continuent sans rien consigner.

## 10. Limites réelles

- **Aucune indexation garantie.** IndexNow répond « reçu » ; Bing, Yandex et Seznam décident seuls. Google n'utilise pas IndexNow et ne propose aucune API d'indexation pour ce type de contenu : le système réduit le délai de découverte (sitemap exact, `lastmod` fiable, soumission), sans plus.
- **Délai minimal** entre une publication et la notification : regroupement (10 min) + build Cloudflare (quelques minutes) + au plus 1 min.
- **404 et non 410** pour un contenu supprimé : Cloudflare Pages ne sert pas de 410 sans Pages Functions. Google traite les deux de la même façon.
- **Cloudflare Free** : 500 builds par mois (d'où le plafond de 10 par jour) et **20 000 fichiers par déploiement**. Le site compte environ 3 000 pages : vers 15 000 sujets, il faudra passer à une offre payante ou servir les fiches par une Pages Function.
- **Render gratuit** : le worker tourne dans le service API. Si le service s'endort, le traitement reprend au réveil, sans perte puisque la file est en base. Le self-ping existant le garde éveillé.
- L'API d'inspection décrit la version connue de Google, pas un test en direct. Le quota (100 par jour par défaut) ne couvre qu'un échantillon des pages.
- Le contenu rendu uniquement par React (après le pré-rendu) n'entre pas dans l'empreinte : seul le HTML pré-rendu, celui que lisent les robots sans JavaScript, compte.
