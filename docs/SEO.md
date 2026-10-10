# Référencement de Fatafalta (SEO technique, recherche IA, suivi)

État au 9 octobre 2026. Site : https://fatafalta.onrender.com (site statique Render) · API : https://educationsujets.onrender.com (service web Render).
Le domaine `fatafalta.com` cité dans le README ne résout pas (aucun DNS) : le domaine canonique est donc `fatafalta.onrender.com`, réglable en une variable (`REACT_APP_SITE_URL` / `SITE_URL`) le jour d'une bascule.

---

## A. État initial (audit du 9 octobre 2026)

| Constat (vérifié en production) | Cause | Gravité |
|---|---|---|
| Toutes les adresses renvoient le même HTML de 687 octets, statut 200 : même titre, même description, `<div id="root"></div>` vide | Application React (Create React App, pas Vite) servie en fichiers statiques, rendu 100 % côté client | Critique |
| `/robots.txt` → 404 ; `/sitemap.xml` → page HTML de l'application | Aucun fichier SEO | Critique |
| Adresse inconnue, `/compte`, `/dashboard`, `/favicon.ico` → 200 avec la page d'accueil | Règle de réécriture `/* → /index.html` ; aucun favicon dans `public/` | Élevée (soft 404) |
| Catalogue en paramètres (`/sujets?o=inphb&pt=idsi&n=2025&m=…`) | Choix d'architecture : impossible de servir un fichier par position | Élevée |
| Aucune balise canonique, Open Graph, donnée structurée, ni `noindex` sur les pages privées | — | Élevée |
| Fiches de sujets : pas de lien vers leur matière / année / organisme (seul un bouton « Retour » en JavaScript) | — | Moyenne |
| `updatedAt` des documents modifié à chaque vue et téléchargement | `$inc` avec horodatage automatique de Mongoose | Moyenne (`lastmod` faux) |
| Organisme INP-HB enregistré sous le nom `inphb` (affiché « INPHB ») | Donnée de catalogue | Moyenne (mot-clé « INP-HB » absent) |
| Aucune mesure d'audience | — | Moyenne |
| API lente au réveil (6 à 10 s lors des premiers appels) | Offre gratuite Render | Moyenne (rendu JavaScript des robots) |

Volume réel publié : 6 organismes (EAMAC 62 sujets, ENA 14, ENSEA 139, ERNAM 4, ESATIC 11, INP-HB 30), soit 260 sujets.

Hors SEO, signalés pour décision :
- **`keys.text` est versionné dans Git** alors qu'il figure dans `.gitignore` (fichier non ouvert). S'il contient des secrets : les révoquer, puis `git rm --cached keys.text`.
- `GET /api/documents` (public) renvoie le nom et le rôle de l'administrateur qui a déposé ou validé chaque document, ainsi que la clé de stockage. Ce n'est pas exploitable seul (les liens de téléchargement restent signés et contrôlés), mais ces champs n'ont pas à être publics.
- Un test existant échoue aussi sans ces modifications : `tests/geniusPayProvider.test.js` « production requires live keys », car il lit `FRONTEND_URL=http://localhost:3000` dans le `.env` local.

## B. Modifications réalisées

### Architecture retenue : pré-rendu au build, sans changer de framework
Les pages publiques sont générées en HTML statique après `react-scripts build`, à partir d'un seul appel à l'API. Render sert un fichier existant **avant** d'appliquer ses règles de réécriture ([documentation Render](https://render.com/docs/redirects-rewrites)) : chaque page pré-rendue est donc servie telle quelle, et React prend le relais. Pas de migration vers Next.js, pas de serveur supplémentaire, pas de nouvelle dépendance.

| Fichier | Changement | Problème résolu |
|---|---|---|
| `backend/services/seoCatalogService.js`, `backend/routes/seo.js`, `backend/server.js` | `GET /api/seo/catalog` : arbre publié (organismes, parcours, niveaux, matières, fiches) en une requête, cache de 5 minutes. Uniquement les sujets approuvés et non supprimés ; aucun fichier, clé de stockage, auteur ni lien | Donnée unique et sûre pour le pré-rendu |
| `backend/services/seoNotifier.js`, `backend/controllers/documentController.js` | Après validation, modification, suppression, restauration, remplacement de fichier ou ajout de corrigé : cache invalidé, reconstruction du site regroupée (10 min), puis notification IndexNow des adresses concernées | Site et sitemap à jour après chaque publication |
| `backend/services/documentService.js` | Compteurs de vues et de téléchargements sans modifier `updatedAt` | `lastmod` fiable |
| `frontend/scripts/prerender.mjs` | Génère une page par position du catalogue et par fiche (titre, description, canonique, Open Graph, JSON-LD, H1, fil d'Ariane, liens), `sitemap.xml`, `robots.txt`, `404.html`, `app.html`, fichier de clé IndexNow, balises de vérification Google/Bing | Contenu lisible sans JavaScript |
| `frontend/src/lib/seo.js`, `catalogSeo.js`, `pagesSeo.js`, `hooks/useSeo.js` | Métadonnées partagées entre le site et le pré-rendu (mêmes textes) | Cohérence robot / visiteur |
| `frontend/src/pages/ExplorePage.js`, `App.js` | Catalogue en chemins : `/sujets/ensea/2024/mathematiques`. Les anciens liens `?o=…` sont réécrits (paramètres UTM conservés). H1 et descriptions explicites calculés depuis les compteurs réels, intertitre H2. Position introuvable → `noindex` | URL stables, pré-rendables ; titres uniques |
| `frontend/src/pages/DocumentPage.js` | Fil d'Ariane cliquable (organisme → parcours → année → matière), lien « Tous les sujets : … », métadonnées et `LearningResource` | Maillage interne, pages non orphelines |
| `frontend/src/index.js` | Le contenu pré-rendu reste affiché jusqu'à ce que la page React ait ses données | Pas d'écran de chargement intermédiaire (CLS mesuré à 0) |
| `frontend/src/App.js`, `lib/pagesSeo.js` | `noindex, follow` : recherche interne, connexion, inscription, compte, page introuvable ; `noindex, nofollow` : administration | Pages sans valeur hors de l'index |
| `frontend/src/lib/analytics.js` + `App.js`, `Register.js`, `SearchPage.js`, `DocumentPage.js` | GA4 facultatif (inactif sans `REACT_APP_GA_MEASUREMENT_ID`) : `page_view`, `search`, `view_item`, `download_click`, `sign_up` ; aucune donnée personnelle, signaux Google désactivés | Mesure des conversions |
| `frontend/public/index.html`, `public/favicon.svg` | Favicon réel (le logo), `preconnect` vers l'API, description par défaut | `/favicon.ico` renvoyait une page HTML |
| `frontend/package.json` | `build` = build + pré-rendu ; `build:spa`, `prerender`, `test:seo` ; `engines.node >= 22.12` | — |
| `backend/scripts/catalogAudit.js` | Affiche les nouvelles adresses `/sujets/<alias>` | — |

Choix délibérément **non** faits :
- **Pas de `llms.txt`** : aucun moteur (Google, Bing, OpenAI) ne déclare l'utiliser pour la recherche ; il ferait doublon avec le sitemap.
- **Pas de `SearchAction`** : Google n'affiche plus la zone de recherche des liens annexes depuis novembre 2024, et la page de recherche est en `noindex`.
- **Pas de `meta keywords`**, pas de `priority`/`changefreq` (ignorés par Google).
- **Pas de blocage de GPTBot** : décision commerciale qui vous revient (voir E).
- **Pas de pages « matière » à un seul sujet dans le sitemap** : elles doublent la fiche du sujet. Elles restent servies et indexables.
- **Pas d'`og:image`** : aucune image de partage n'existe ; à créer (1200 × 630) plutôt qu'inventer.
- **`isAccessibleForFree` non renseigné** : l'accès dépend de `DOWNLOAD_PROTECTION` (tous les documents ou seulement les premium).

## C. État du référencement technique

| Élément | Statut |
|---|---|
| Sitemap XML (396 adresses avec les données actuelles, `lastmod` réels) | Réalisé mais non vérifié en production |
| robots.txt | Réalisé mais non vérifié en production |
| Balises canoniques (pré-rendu + navigation) | Réalisé mais non vérifié en production |
| Titres, descriptions, Open Graph uniques | Réalisé mais non vérifié en production |
| Données structurées (WebSite, Organization, BreadcrumbList, LearningResource) | Réalisé ; JSON valide vérifié localement ; validation Google en attente de déploiement |
| Pages publiques indexables (accueil, catalogue, 260 fiches, abonnement) | Réalisé mais non vérifié en production |
| Gestion des erreurs HTTP (vrai statut 404) | **En attente d'accès externe** (règles Render, voir E3) ; `noindex` côté client déjà en place |
| Rendu JavaScript | Réalisé et vérifié localement (Chrome headless sur les données de production) |
| Maillage interne (fil d'Ariane, liens matière, accueil → organismes) | Réalisé mais non vérifié en production |
| Performances | Mesuré en laboratoire (ci-dessous) ; données réelles en attente de trafic |
| Préparation recherche IA (OAI-SearchBot, Bingbot autorisés ; contenu textuel ; IndexNow) | Réalisé mais non vérifié en production |
| Google Search Console / Bing Webmaster Tools | En attente d'accès externe |
| Mesure d'audience GA4 | Réalisé, inactif tant que l'identifiant n'est pas fourni |

## D. Tests exécutés

| Commande | Résultat |
|---|---|
| `TEST_MONGODB_URI=… node --test tests/seoCatalog.test.js` (backend, nouveau) | 3/3 : seuls les sujets publiés sortent ; aucun champ interne (clé de stockage, auteur, fichier, compteurs) ; cache invalidé ; IndexNow muet sans clé et refuse un autre domaine |
| `TEST_MONGODB_URI=… npm test` (backend, suite complète) | 122/123 ; le seul échec est préexistant (voir A) |
| `node tests/parcoursTypeFlow.test.js` | 3/3 |
| Appel HTTP de `/api/seo/catalog` sur l'application Express | 200, JSON, `Cache-Control: public, max-age=300` |
| `npm run test:seo` (frontend, nouveau) | 4/4 : sitemap valide sans doublon ni page privée, un fichier par adresse, un H1 / un titre / une description par page, canonique = adresse, JSON-LD valide, texte échappé, **chaque lien du catalogue résolu comme le fait ExplorePage**, robots.txt, 404 en `noindex`, coquille sans canonique |
| `react-scripts build` | Compilé ; avertissements ESLint uniquement dans des fichiers non modifiés (Dashboard, AdminCatalogPanel…) |
| Pré-rendu sur les données réelles (flux reconstitué depuis l'API publique) | 6 organismes, 377 pages de catalogue, 260 fiches, 396 adresses dans le sitemap |
| Chrome headless sur un serveur local qui imite Render | Titres, canoniques et H1 identiques pré-rendu / React ; `?o=ensea` → canonique `/sujets/ensea` ; `/n-importe-quoi` et `/sujets/ensea/xyz` → `noindex` ; `/compte` → redirige vers la connexion |

Lighthouse 12.8.2, mobile simulé (laboratoire ; le serveur local n'a pas le CDN de Render, comparaison indicative) :

| Page | Perf. | SEO | CLS | LCP | TBT |
|---|---|---|---|---|---|
| Production `/` (avant) | 0,62 | 1 | 0 | 3,6 s | 1 030 ms |
| Production `/sujets?o=ensea` (avant) | 0,90 | 1 | 0,133 | 2,2 s | 80 ms |
| Local `/` (après) | 0,77 | 1 | 0 | 3,9 s | 340 ms |
| Local `/sujets/ensea` (après) | 0,96 | 1 | **0** | 2,3 s | 120 ms |
| Local fiche ENA 2020 (après) | 0,72 | 1 | **0** | 2,6 s | 1 120 ms |

Le score SEO de Lighthouse était déjà à 1 : il ne contrôle que la présence de balises dans la page rendue, pas l'indexabilité réelle (contenu identique partout, absence de sitemap). Le TBT varie fortement d'une mesure à l'autre sur cette machine. Aucun seuil Core Web Vitals n'est affirmé : il faudra les données réelles (rapport Search Console « Signaux Web essentiels » ou PageSpeed Insights, une fois le trafic suffisant).

## E. Déploiement et actions manuelles

### E1. Ordre de déploiement (important)
1. **Backend d'abord** (service `educationsujets`) : il doit exposer `/api/seo/catalog` avant la construction du site. Vérifier : `curl https://educationsujets.onrender.com/api/seo/catalog`.
2. **Puis le site** : la commande de build du site statique doit être `npm run build` (elle l'est par défaut ; vérifier dans Render → service du site → Settings → Build Command). Si l'API ne répond pas après six essais, la construction échoue et Render garde la version en ligne.
3. Retour arrière : Render → service → Deploys → « Rollback » sur le déploiement précédent. Le pré-rendu peut aussi être désactivé en changeant la commande de build en `npm run build:spa`.

### E2. Variables d'environnement
Site statique (Render → service du site → Environment) :
| Variable | Valeur | Obligatoire |
|---|---|---|
| `REACT_APP_SITE_URL` | `https://fatafalta.onrender.com` (défaut) | non |
| `NODE_VERSION` | `22.12.0` ou plus récent, si Render n'utilise pas `engines` | si build en échec sur l'import ESM |
| `GOOGLE_SITE_VERIFICATION` | valeur `content` de la balise donnée par Search Console | pour E4 |
| `BING_SITE_VERIFICATION` | valeur `content` de la balise `msvalidate.01` | pour E5 |
| `INDEXNOW_KEY` | clé générée (voir E5), identique au backend | pour IndexNow |
| `REACT_APP_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | pour GA4 |

API (Render → service `educationsujets` → Environment) :
| Variable | Valeur |
|---|---|
| `SITE_URL` | `https://fatafalta.onrender.com` |
| `FRONTEND_DEPLOY_HOOK_URL` | **secret** : Render → service du site → Settings → Deploy Hook. Ne jamais le versionner |
| `INDEXNOW_KEY` | même clé que le site |
| `SEO_REBUILD_DELAY_MS`, `INDEXNOW_DELAY_MS` | facultatifs (10 min par défaut) |

### E3. Règles de réécriture Render (site statique → Redirects/Rewrites)
Aujourd'hui une règle `/*` → `/index.html` (Rewrite) sert la page d'accueil pour toute adresse inconnue. Remplacer sa destination par **`/app.html`** (coquille de l'application, sans canonique) : les adresses non pré-rendues (espace personnel, sujets publiés depuis la dernière construction) fonctionnent comme avant, sans hériter de la canonique de l'accueil.

Pour obtenir de vrais statuts 404, il faudrait limiter cette règle aux préfixes de l'application (`/compte/*`, `/recherche`, `/login`, `/register`, `/dashboard`, `/abonnement`, `/sujets/*`) et laisser Render servir `404.html` pour le reste. Le comportement de Render sur `404.html` n'est pas documenté de façon fiable ([forum Render](https://community.render.com/t/custom-404-error-page/746)) : à tester après coup avec `curl -I https://fatafalta.onrender.com/nexiste-pas`. En attendant, les pages inconnues portent `noindex` une fois rendues.

### E4. Google Search Console
Le domaine `onrender.com` n'est pas à vous : la propriété **Domaine** (DNS) est impossible ; utilisez une propriété **Préfixe d'URL**.
1. https://search.google.com/search-console → Ajouter une propriété → Préfixe d'URL → `https://fatafalta.onrender.com/`.
2. Méthode « Balise HTML » : copier la valeur `content="…"` dans `GOOGLE_SITE_VERIFICATION` (site statique), redéployer, puis cliquer « Valider ».
3. Sitemaps → saisir `sitemap.xml` → Envoyer.
4. Inspection d'URL → tester puis « Demander l'indexation » pour : `/`, `/sujets`, `/sujets/ensea`, `/sujets/eamac`, `/sujets/inphb`, `/sujets/ena`, `/sujets/esatic`, une fiche par organisme.
5. Vérifier dans « Afficher la page explorée » que le HTML contient le H1 et la liste.
Une bascule future vers `fatafalta.com` permettra une propriété Domaine (enregistrement TXT) et l'outil « Changement d'adresse ».

### E5. Bing Webmaster Tools et IndexNow
1. https://www.bing.com/webmasters → « Importer depuis Google Search Console » (le plus simple une fois E4 faite), ou ajout manuel + balise `msvalidate.01` dans `BING_SITE_VERIFICATION`.
2. Soumettre `https://fatafalta.onrender.com/sitemap.xml`.
3. IndexNow ([protocole](https://www.indexnow.org/documentation)) : générer une clé de 32 caractères hexadécimaux (`node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`), la mettre dans `INDEXNOW_KEY` des deux services. Le site publie `/<clé>.txt` ; l'API signale les fiches modifiées à `api.indexnow.org` après chaque reconstruction. IndexNow concerne Bing, Yandex, Seznam, Naver… **pas Google**. Bing alimente aussi Copilot et une partie des résultats web de ChatGPT.

### E6. Google Analytics 4 (facultatif)
1. https://analytics.google.com → Admin → Créer une propriété « Fatafalta » (fuseau Africa/Abidjan, devise XOF) → flux Web `https://fatafalta.onrender.com`.
2. Copier l'ID `G-…` dans `REACT_APP_GA_MEASUREMENT_ID`, redéployer.
3. Dans le flux : désactiver « Mesure améliorée → pages vues sur changement d'historique » (le site envoie déjà ses pages vues, sinon elles seraient comptées deux fois).
4. Marquer `sign_up` et `download_click` comme événements clés.
5. Associer Search Console (Admin → Associations).
6. Mentionner la mesure d'audience dans une page de confidentialité (loi ivoirienne n° 2013-450 sur les données personnelles, autorité : ARTCI). À valider avec un juriste.

### E7. Données du catalogue
- Renommer l'organisme `inphb` en **INP-HB** (l'alias `inphb` et les URL ne changent pas).
- Renseigner `description` de chaque organisme (texte vérifié : ce qu'il est, cycles et concours couverts) : elle n'est pas encore affichée, c'est la prochaine amélioration de contenu.
- Créer une image de partage 1200 × 630 pour `og:image`.

### E8. robots.txt et OpenAI
OAI-SearchBot (ChatGPT Search) est autorisé comme tous les robots. GPTBot (entraînement des modèles) l'est aussi, faute d'instruction contraire ; les deux sont indépendants ([documentation OpenAI](https://developers.openai.com/api/docs/bots)). Pour refuser l'entraînement sans perdre ChatGPT Search, ajouter au générateur `robotsTxt()` de `frontend/scripts/prerender.mjs` :
```
User-agent: GPTBot
Disallow: /
```

## F. Stratégie de mots-clés

Volumes de recherche **non mesurés** (aucun outil de volume disponible). Concurrence observée le 9 octobre 2026 sur les résultats de recherche : un seul acteur, kamerpower.com, sur presque toutes les requêtes « anciens sujets + organisme », avec des pages souvent pauvres ou sans le fichier ; aucun résultat ESATIC ; pas d'annales ENSEA ni ENA cycle moyen identifiées. Fatafalta a donc une vraie offre là où les résultats sont faibles.

| Famille | Intention | Page cible | Mot-clé principal | Secondaires |
|---|---|---|---|---|
| ENSEA | Trouver des sujets pour réviser | `/sujets/ensea` puis parcours | anciens sujets ENSEA | concours AS, ISE cycle long, option mathématiques / économie, par année |
| EAMAC | Idem | `/sujets/eamac` | sujets concours EAMAC | contrôleur de la circulation aérienne, technicien supérieur, ingénieur, ASECNA |
| INP-HB | Idem | `/sujets/inphb` | anciens sujets INP-HB | bacheliers, IDSI / Data Science Institute, A2GP, GCN, GIN, CAE |
| ENA | Idem | `/sujets/ena` | sujets concours ENA Côte d'Ivoire | cycle moyen, présélection, culture générale |
| ESATIC | Idem | `/sujets/esatic` | sujets concours ESATIC | bacheliers, par année |
| Matière × organisme | Réviser une épreuve | `/sujets/<org>/…/<matière>` | sujet mathématiques ENSEA 2024 | corrigé, PDF |
| Générique | S'orienter | `/sujets`, accueil | anciens sujets de concours Côte d'Ivoire | annales, corrigés, préparation |
| Préparation (éditorial) | Méthode | articles (plan ci-dessous) | comment préparer le concours … | — |

Chaque intention a une seule page cible : l'organisme porte le générique, l'année et la matière portent le précis, la fiche porte le sujet exact.

Plan éditorial (à rédiger et relire par une personne qui connaît les concours ; ne rien publier sans vérification) :

| Article | Public | Mot-clé principal | Structure | Liens | À vérifier |
|---|---|---|---|---|---|
| Comment utiliser les anciens sujets pour réviser un concours | Tous candidats | réviser avec les anciens sujets | méthode en 4 étapes, planning type, erreurs fréquentes | `/sujets` | — |
| Préparer le concours de l'ENSEA (AS, ISE) | Bacheliers, licenciés | préparer concours ENSEA | épreuves par cycle, programme, annales par année | `/sujets/ensea/*` | calendrier, épreuves, coefficients (site officiel ENSEA) |
| Concours EAMAC : épreuves et anciens sujets | Candidats ASECNA | concours EAMAC sujets | cycles, épreuves, annales | `/sujets/eamac/*` | modalités ASECNA de l'année |
| Concours INP-HB : filières et annales | Bacheliers, prépa | concours INP-HB anciens sujets | filières, épreuves, annales par filière | `/sujets/inphb/*` | filières ouvertes, dates |
| ENA cycle moyen : réussir la présélection | Fonctionnaires, diplômés | présélection ENA cycle moyen | format QCM, culture générale, entraînement | `/sujets/ena/*` | format officiel de l'année |
| Utiliser un corrigé pour progresser | Tous | comment utiliser un corrigé | avant / pendant / après, auto-évaluation | sujets avec corrigé | — |

Autorité (sans achat ni réseau de liens) : associations d'étudiants et de candidats (INP-HB, ENSEA), groupes de préparation, enseignants de classes préparatoires, médias éducatifs ivoiriens ; proposer un accès ou une sélection de sujets en échange d'une mention. Rien n'a été contacté.

## G. Feuille de route sur 90 jours

- **Jours 1 à 7** : déployer (E1), règle `/app.html` (E3), Search Console + sitemap + inspection des pages clés (E4), Bing + IndexNow (E5), renommer INP-HB (E7). Vérifier en production : `robots.txt`, `sitemap.xml`, `curl` d'une page organisme et d'une fiche (H1 présent), `/sujets/inphb` sans redirection.
- **Jours 8 à 30** : suivre « Pages » dans Search Console (exclues, « détectée, non indexée ») ; rédiger les descriptions d'organismes et les afficher en tête de page ; créer l'image de partage ; ajouter les sujets ESATIC et ENA manquants si vous les avez.
- **Jours 31 à 60** : publier 2 à 3 articles du plan, chacun relié à ses pages de catalogue ; premières démarches auprès d'associations étudiantes.
- **Jours 61 à 90** : analyser requêtes et pages (CTR faible → réécrire titres et descriptions ; position 8 à 20 → enrichir la page) ; décider du domaine propre (`fatafalta.com`) avant que l'autorité ne s'accumule sur `onrender.com`.

Aucun délai d'indexation n'est garanti : Google décide de l'exploration et de l'indexation.

## Tableau de suivi

| Indicateur | Source | Fréquence | Valeur actuelle |
|---|---|---|---|
| Pages publiques destinées à l'indexation | `npm run build` (journal du pré-rendu) | à chaque déploiement | 377 pages de catalogue + 260 fiches + accueil, catalogue, abonnement (données du 9 octobre 2026) |
| Adresses dans le sitemap | `/sitemap.xml` | à chaque déploiement | 396 |
| Adresses inspectées | Search Console, Inspection d'URL | hebdomadaire | 0 (non configuré) |
| Pages indexées / non indexées | Search Console, Pages | hebdomadaire | inconnu |
| Impressions, clics, CTR, position moyenne | Search Console, Performances | hebdomadaire | inconnu |
| Pages et requêtes principales | Search Console, Performances | mensuelle | inconnu |
| Inscriptions, clics de téléchargement depuis la recherche organique | GA4 (événements clés, canal « Organic Search ») | mensuelle | non mesuré (GA4 non configuré) |
| Signaux Web essentiels (données réelles) | Search Console / PageSpeed Insights | mensuelle | données insuffisantes |
| Problèmes techniques ouverts | ce document | à chaque revue | vrai statut 404 (E3), nom INP-HB (E7), `og:image`, `keys.text` versionné |
