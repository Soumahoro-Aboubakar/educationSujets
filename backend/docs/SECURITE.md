# Sécurité de l'API — protections anti-abus

Ce document décrit les protections du backend contre les abus, les rafales de requêtes, les bots et
la fraude au paiement. Il précise aussi **ce qui doit être configuré en amont** (CDN, WAF, proxy),
car aucun middleware Node.js ne peut arrêter un DDoS volumétrique.

Toutes les limites sont définies dans [`config/security.js`](../config/security.js) et peuvent être
modifiées par variable d'environnement `SEC_<NOM>`, sans toucher au code.

---

## 1. Chaîne de protection d'une requête

```
Client → [CDN/WAF : à configurer] → proxy de l'hébergeur → Node.js
  1. X-Request-Id            identifiant renvoyé au client et présent dans chaque log
  2. blockGuard              IP bloquée temporairement → 429 immédiat, sans aucun travail
  3. identify                jeton JWT vérifié (sans base de données) → limites par utilisateur
  4. ipFlood / general / burst   limites globales (IP, utilisateur ou visiteur, rafales de 10 s)
  5. parseurs de corps       JSON ≤ 200 ko, webhook ≤ 100 ko, ≤ 100 champs, query ≤ 60 paramètres, profondeur 3
  6. sanitizeInput           suppression des clés `$…`, `__proto__`, `constructor`, `prototype`
  7. timeout                 503 au-delà de 30 s (téléversements : 5 min)
  8. limites de la route     paiement, connexion, recherche… (tableau ci-dessous)
  9. protect / authorize     authentification et rôle (inchangés)
 10. validation              express-validator, puis contrôles métier du service
```

Un refus renvoie toujours :

```json
HTTP 429  Retry-After: 42
{ "success": false, "error": "…message lisible…", "code": "PAYMENT_RATE_LIMITED", "retryAfter": 42, "requestId": "…" }
```

Codes utiles côté client : `RATE_LIMITED`, `LOGIN_RATE_LIMITED`, `REGISTER_RATE_LIMITED`,
`PAYMENT_RATE_LIMITED`, `PAYMENT_HOURLY_LIMIT`, `PAYMENT_DAILY_LIMIT`, `IP_TEMPORARILY_BLOCKED`,
`ACCOUNT_TEMPORARILY_RESTRICTED`, `TOO_MANY_CONCURRENT_REQUESTS`, `IDEMPOTENCY_KEY_REUSED`,
`CAPTCHA_REQUIRED`, `PAYLOAD_TOO_LARGE`, `INVALID_JSON`, `REQUEST_TIMEOUT`, `NOT_FOUND`.

---

## 2. Limites appliquées

Clé « sujet » : l'utilisateur connecté, sinon l'IP. Les IPv6 sont regroupées par /56.

| Route / usage | Clé | Limite | Raison |
|---|---|---|---|
| Toute l'API (flood) | IP | 3 000 / 5 min | Coupe un flood même réparti sur plusieurs comptes ; large pour les IP partagées (CGNAT mobile, écoles). |
| Toute l'API | utilisateur | 600 / 5 min | ≈ 2 req/s en continu : très au-dessus d'un usage humain. |
| Toute l'API | visiteur (IP) | 1 500 / 5 min | Plusieurs visiteurs derrière une même IP. |
| Rafales | utilisateur / IP | 60 / 150 par 10 s | Un humain ne fait pas 6 appels/s ; un script, si. |
| `POST /api/auth/login` | IP + email | 8 **échecs** / 15 min | Brute force ciblé. Les connexions réussies ne comptent pas. |
| `POST /api/auth/login` | IP | 60 échecs / 15 min | IP partagée : quelques erreurs de saisie tolérées. |
| `POST /api/auth/login` | email | 25 échecs / h | Attaque distribuée sur un compte (sans pénaliser l'IP). |
| `POST /api/auth/register` | IP | 20 / h (3 / h pour curl, python…) | Création massive de comptes. |
| `POST /api/auth/refresh-token` | IP | 120 / 15 min | Renouvellements mobiles ; bloque le rejeu en boucle. |
| `POST /api/auth/handoff` | utilisateur | 10 / 10 min | Génération de codes de connexion. |
| `POST /api/auth/handoff/exchange` | IP | 30 / 15 min | Devinette de codes (déjà 192 bits d'entropie). |
| `PUT /api/me/password` | utilisateur | 5 / 15 min | Deviner l'ancien mot de passe avec une session volée. |
| `PUT /api/me/profile` | utilisateur | 20 / 15 min | |
| `POST /api/payments` | utilisateur | 3 / min **et** 8 / 15 min | Absorbe un double clic, pas un script. |
| `POST /api/payments` | IP | 40 / 15 min | Plusieurs comptes derrière une IP. |
| `POST /api/payments` | base de données | 10 / h, 25 / jour par utilisateur | Persistant et commun à toutes les instances ; un rejeu n'est pas compté. |
| `POST /api/payments/quote` | utilisateur | 30 / 15 min | Test de codes promo. |
| `GET /api/payments/:id` | utilisateur | 90 / min | Le web interroge toutes les 2,5 s (24/min). |
| `POST /api/payments/:id/cancel` | utilisateur | 10 / 5 min | |
| `POST /api/payments/webhooks/:provider` | IP | 300 / min | Jamais bloqué par les sanctions ; signature vérifiée. |
| `POST /api/me/withdrawals` | utilisateur | 5 / h | |
| Recherche (`/api/search`, `?search=` sur `/api/documents` et `/api/catalog`) | sujet | 60 / min, 3 en parallèle | Chaque mot déclenche plusieurs requêtes de catalogue. |
| Téléchargement (`/documents/:id/download`, `/uploads`) | sujet | 40 / min | Quota quotidien (15) déjà appliqué en base. |
| `POST /api/training/questions/:id/answer` | sujet | 120 / min | Seule écriture publique. |
| `/api/admin/*` | utilisateur | 400 / 5 min, écritures 150 / 5 min | Jeton administrateur volé (en plus de la limite générale de 600). |
| Téléversements | utilisateur | 60 / 10 min | |

### Sanctions progressives

* Chaque requête refusée par une limite = un avertissement pour l'IP et pour le compte.
* **30 avertissements en 10 min** → IP bloquée 15 min (toute l'API sauf webhooks).
* **20 avertissements en 10 min** → compte **restreint** 15 min : paiement, retrait et passage
  mobile → web suspendus ; la consultation reste possible.
* Récidive dans les 24 h → durée doublée (plafond : 4 h).
* **Échecs de connexion sur 15 emails distincts depuis une IP en 15 min** (credential stuffing) → IP bloquée.
* Un administrateur voit et lève les blocages :
  `GET /api/admin/security/overview`, `DELETE /api/admin/security/blocks/ip/<ip>` ou `/user/<id>`.

### Vérification humaine (CAPTCHA)

Uniquement après **3 échecs de connexion** sur un même couple IP + email, et seulement si
`TURNSTILE_SECRET_KEY` (Cloudflare Turnstile) est définie. Le client doit alors envoyer
`captchaToken`. **Ne pas activer** avant d'avoir intégré le widget au web et au mobile.

---

## 3. Paiements

* **Le client n'envoie jamais de montant** : le contrôleur ne lit que `method`, `phone`, `promoCode`,
  `channel`, `returnUrl`, `attemptId`. Montant, type, remise, utilisateur et statut sont calculés
  par le serveur. Un champ comme `amount`, `status` ou `userId` dans la requête est ignoré et
  journalisé (`payment.tampering_attempt`).
* **Idempotence** (`attemptId` dans le corps ou en-tête `Idempotency-Key`) :
  * mêmes requêtes simultanées (double clic) → un seul traitement, même réponse ;
  * même `attemptId` rejoué → même paiement s'il est ouvert **ou réussi** (jamais de double débit) ;
  * même `attemptId` avec un autre opérateur ou numéro → `422 IDEMPOTENCY_KEY_REUSED` ;
  * même `attemptId` après un échec → nouvelle tentative légitime (bouton « Réessayer ») ;
  * nouvel `attemptId` → nouvelle tentative ; la précédente, abandonnée, est annulée.
* Un seul paiement ouvert par utilisateur (index unique `openFor`), y compris entre instances.
* **Confirmation exclusivement côté serveur** : webhook signé (HMAC) **puis** statut reconfirmé
  auprès de l'API GeniusPay ; référence, environnement, montant, devise et identifiant interne
  doivent correspondre, sinon le paiement est refusé (`payment.verification_failed`).
* Accès à un paiement : toujours filtré par `user: req.user._id` (404 pour un autre utilisateur).
* **Coupe-circuit fournisseur** : 5 pannes consécutives (réseau, 5xx, 429) → appels suspendus
  30 s, réponse immédiate `503 PAYMENT_PROVIDER_UNAVAILABLE` avec `Retry-After`.
* Lectures simultanées d'un même paiement : un seul appel au fournisseur.

---

## 4. Base de données

* Pagination bornée partout : `limit` ≤ 100 (référentiels admin : 200), `page` ≤ 500.
* Recherche : texte échappé (pas de regex utilisateur), 5 mots maximum, ≤ 5 000 nœuds de
  catalogue parcourus par mot. Correction d'une **injection de regex** (ReDoS) dans
  `GET /api/referentials/:model?search=`.
* `GET /api/users` (ancienne liste admin) limitée à 500 résultats.
* Index ajoutés : `Payment {user, createdAt}`, `{user, attemptId, createdAt}`, `{status, createdAt}` ;
  `Commission {referrer, createdAt}` ; `Withdrawal {user, createdAt}` ; `DownloadLog {user, createdAt}`.
  Mongoose les crée au démarrage (`autoIndex`). En production, si `autoIndex` est désactivé :
  `Model.syncIndexes()` pour ces quatre modèles.
* Limite connue : la recherche plein texte sur `title`/`description` reste une regex non indexée.
  À fort volume, passer à un index texte MongoDB ou Atlas Search.

---

## 5. Authentification

* Même message et même coût (haché bcrypt factice) que l'email existe ou non : ni le texte ni
  le temps de réponse ne révèlent un compte.
* L'inscription indique encore qu'un email est pris (`409 EMAIL_UNAVAILABLE`, message neutre) :
  sans vérification d'email, impossible de faire autrement sans bloquer l'utilisateur. Le risque
  d'énumération est réduit par la limite de 20 inscriptions/h par IP. Supprimer complètement ce
  signal suppose un parcours « email de confirmation ».
* Jetons typés (`typ: access` / `refresh`) et algorithme imposé (`HS256`) : un jeton de
  renouvellement ne donne pas accès à l'API, un jeton d'accès ne renouvelle pas une session.
  Les jetons émis avant ce changement restent valides jusqu'à expiration.
* Mots de passe limités à 128 caractères (coût bcrypt borné).
* Il n'existe pas encore de réinitialisation de mot de passe ni de vérification d'email : quand
  elles seront ajoutées, réutiliser `limits.register` (par IP) et une limite par email, avec une
  réponse identique que le compte existe ou non.

---

## 6. Erreurs et journaux

* Erreur non prévue → `500 « Erreur serveur »` + `requestId` ; le détail reste dans les logs.
  La stack n'est renvoyée que si `NODE_ENV=development` (avant : dès que `NODE_ENV` n'était pas
  `production`, donc aussi sur un serveur mal configuré).
* Les erreurs de validation ne renvoient jamais la valeur d'un champ `password`, `token`, `code`…
* Journal JSON `scope: "security"` (liste blanche de champs, emails pseudonymisés) :

| Action | Signification |
|---|---|
| `rate_limit.blocked` | Limite atteinte (1ʳᵉ fois par fenêtre, puis 1 sur 100). |
| `abuse.ip_blocked`, `abuse.user_restricted` | Sanction automatique. |
| `auth.login_failed`, `auth.captcha_required`, `auth.handoff_invalid` | Authentification. |
| `payment.tampering_attempt`, `payment.idempotency_mismatch`, `payment.quota_reached` (scope payments) | Fraude / abus paiement. |
| `provider.circuit_open` (scope payments) | GeniusPay en panne. |
| `input.sanitized` | Tentative d'injection NoSQL. |
| `request.timeout`, `request.server_error`, `access.denied` | Santé de l'API. |
| `traffic.spike` | Seuil par minute dépassé (requêtes, 5xx, 429, échecs de connexion). |

Exemple : `grep '"scope":"security"' app.log | grep abuse.` ou filtrer par `requestId`.

---

## 7. Infrastructure — à configurer en dehors du code

**Le backend protège l'application (abus, rafales, endpoints coûteux). Il ne protège pas la bande
passante : une attaque volumétrique sature le réseau ou le processus Node avant que le moindre
middleware s'exécute.** Ces protections doivent être en amont :

1. **Mettre l'API derrière Cloudflare** (proxy activé, l'orange) — le projet utilise déjà
   Cloudflare R2. Le plan gratuit inclut l'absorption DDoS L3/L4/L7.
2. **Verrouiller l'origine** pour qu'elle ne soit joignable que via Cloudflare (Authenticated
   Origin Pulls, ou allowlist des IP Cloudflare si l'hébergeur le permet, ou Cloudflare Tunnel).
   Sans cela, un attaquant contourne le CDN en visant directement l'URL de l'hébergeur.
   Une fois fait : `TRUST_CF_CONNECTING_IP=true`. **Pas avant** (l'en-tête serait falsifiable).
3. **Régler `TRUST_PROXY`** sur le nombre réel de proxys (Render seul : `1`). Une valeur trop basse
   fait voir à Node l'IP du proxy pour tout le monde (tous les clients partagent alors une limite) ;
   trop haute, un client peut usurper son IP avec `X-Forwarded-For`.
4. **Règles WAF / Rate limiting Cloudflare** (premier filtre, avant même d'atteindre Node) :
   * `/api/auth/login`, `/api/auth/register` : ~30 req/min par IP → *Managed Challenge* ;
   * `/api/payments` (POST) : ~20 req/min par IP → *Block* ;
   * Bot Fight Mode activé ; *Managed Challenge* pour les scores bots élevés hors `/api/payments/webhooks/*`.
   * **Exclure** `/api/payments/webhooks/*` des challenges (GeniusPay ne peut pas résoudre un CAPTCHA),
     idéalement en n'autorisant que les IP de GeniusPay sur ce chemin.
   * Ne jamais mettre de challenge sur les routes appelées par l'application mobile (pas de navigateur).
5. **Taille des requêtes et timeouts au proxy** : corps ≤ 12 Mo (fichiers limités à 10 Mo par `MAX_FILE_SIZE`), délai
   d'inactivité ≤ 100 s.
6. **CORS** : définir `CORS_ORIGINS` avec les domaines du site web (le mobile n'est pas concerné).
7. **Plusieurs instances Node** : les compteurs de limites sont en mémoire, donc par instance.
   Avant de passer à plusieurs instances, brancher un store partagé (`rate-limit-redis` ou
   `rate-limit-mongo`) dans `middleware/rateLimit.js` (option `store`) et déplacer le traceur
   d'abus vers Redis. Les plafonds de paiement et l'unicité du paiement ouvert sont déjà en base.
8. **Hébergeur gratuit** (mise en veille, ping `SELF_URL`) : un redémarrage remet les compteurs
   en mémoire à zéro. Acceptable ; les protections critiques du paiement sont en base.
9. **Surveillance** : brancher les logs sur un outil d'alerte (Better Stack, Grafana Loki,
   Datadog…) avec une alerte sur `traffic.spike`, `abuse.ip_blocked`, `provider.circuit_open`
   et `payment.verification_failed`.

---

## 8. Tests

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-security-test node --test tests/security.integration.test.js
npm test   # suite complète (avec TEST_MONGODB_URI)
```
