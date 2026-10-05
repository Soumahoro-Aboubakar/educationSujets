# Paiements GeniusPay

Référence API : https://geniuspay.ci/docs/api

## Fonctionnement

```text
Web / Mobile ──(moyen, numéro)──▶ POST /api/payments
   Backend : utilisateur authentifié, moyen activé en base, montant calculé par le serveur,
             un seul paiement ouvert par utilisateur (index unique `openFor`)
   ──▶ GeniusPay POST /payments (payment_method = moyen choisi, metadata.payment_id)
   ◀── reference MTX-…, payment_url  →  le client est redirigé vers la page GeniusPay
GeniusPay ──▶ success_url / error_url (/abonnement?payment=…) : aucune valeur de preuve
GeniusPay ──▶ POST /api/payments/webhooks/geniuspay (signé)   ┐
Client    ──▶ GET  /api/payments/:id (interrogation)           ├─▶ GET /payments/{reference}
                                                                ┘   (statut faisant autorité)
   Contrôles : référence, environnement, montant, devise, payment_id
   ──▶ transition atomique ──▶ activation de l'abonnement (idempotente)
```

- Statuts internes : `INITIATED`, `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`.
  Le statut brut GeniusPay est conservé dans `providerStatus`.
- Webhook : signature `HMAC-SHA256(timestamp + "." + corps, GENIUSPAY_WEBHOOK_SECRET)`, horodatage de
  5 minutes au plus, environnement vérifié, événement dédoublonné (`PaymentWebhookEvent`).
- Réconciliation : chaque minute, le serveur interroge GeniusPay pour les paiements encore ouverts.
  Un abonné qui paie puis ferme la page est donc activé même sans webhook.
- Réseau : IPv4 privilégié (`config/network.js`) ; une lecture coupée est retentée une fois, une
  création seulement si la connexion n'a jamais abouti (jamais de double transaction).
- Un paiement confirmé par GeniusPay après une annulation ou une expiration locale (dans les 24 h)
  est honoré : l'argent a été encaissé.
- Moyens de paiement : collection `PaymentMethod`, gérée depuis l'administration web
  (Méthodes de paiement) et mobile (menu Administration). Les moyens désactivés ne sont plus
  proposés et sont refusés par l'API.
- Routage constaté en production (Côte d'Ivoire) :

  | Moyen | Envoyé à GeniusPay | Parcours abonné |
  | --- | --- | --- |
  | Wave | `payment_method: wave` | page Wave (QR code / app Wave) |
  | MTN | `payment_method: pawapay`, `mmo_provider: MTN_MOMO_CIV` | demande validée sur le téléphone |
  | Orange | `payment_method: pawapay`, `mmo_provider: ORANGE_CIV` | demande validée sur le téléphone |
  | Moov | `payment_method: pawapay`, `mmo_provider: MOOV_CIV` | idem, si GeniusPay l'ouvre |

  ⚠️ `payment_method: mtn_money` / `orange_money` sont silencieusement réorientés vers Wave par
  GeniusPay : ne pas les utiliser. Les opérateurs ouverts sont relus via `GET /pawapay/providers`
  (cache 10 min) : un opérateur fermé (Moov à ce jour) est masqué aux abonnés et refusé par l'API,
  et signalé « Fermé chez GeniusPay » dans l'administration.
- Journal : lignes JSON `"scope":"payments"`, filtrables par `paymentId` ou `reference`, sans aucun
  secret ni numéro de téléphone.

## Parcours mobile → web

L'application mobile n'intègre aucun paiement. « S'abonner » crée un code de passage à usage
unique (`POST /api/auth/handoff`, valable 2 min) et ouvre `/abonnement` dans un navigateur
sécurisé ; le site l'échange contre une session du **même compte**. Le paiement Wave se fait sur
le site, et son retour ramène vers l'application (`fatafalta://abonnement-retour`).

Synchronisation, entièrement côté serveur :
- `/api/me/entitlements` et `/api/me/subscription` revérifient un paiement ouvert auprès de
  GeniusPay avant de répondre : l'app voit l'accès dès qu'elle relit l'état ;
- l'app relit l'état à chaque retour au premier plan, et toutes les 5 s tant qu'un paiement
  est en attente ;
- la réconciliation serveur (1 min) et le webhook couvrent les autres cas.

## Moyens actifs

Seul Wave est activé pour l'instant. Les autres opérateurs restent configurés (routage, étapes
USSD) et se réactivent depuis l'administration, ou :

```bash
npm run payment-methods -- list
npm run payment-methods -- only wave        # Wave seul
npm run payment-methods -- enable mtn_money # réactiver un opérateur
```

## Variables d'environnement (backend uniquement)

| Variable | Rôle |
| --- | --- |
| `PAYMENT_MODE` | `geniuspay` (défaut si `GENIUSPAY_API_KEY` est défini) ou `mock` |
| `GENIUSPAY_ENV` | `sandbox` (défaut) ou `production` |
| `GENIUSPAY_API_KEY` | Clé API du tableau de bord (`sk_sandbox_…` / `sk_live_…`, ou `pk_…` selon la doc) |
| `GENIUSPAY_API_SECRET` | Clé secrète (`ss_sandbox_…` / `ss_live_…`, ou `sk_…` selon la doc) |
| `GENIUSPAY_WEBHOOK_SECRET` | `whsec_…`, fortement recommandé (sans lui, confirmation par interrogation de l'API) |
| `FRONTEND_URL` | Site web (pages de retour), en https en production (avertissement sinon) |
| `PAYMENT_PENDING_TTL_MINUTES` | Expiration d'un paiement non confirmé (30 par défaut) |
| `PAYMENT_RECONCILE_INTERVAL_SECONDS` | Réconciliation serveur des paiements ouverts (60 par défaut, 0 = désactivée) |
| `GENIUSPAY_BASE_URL`, `GENIUSPAY_TIMEOUT_MS`, `GENIUSPAY_WEBHOOK_TOLERANCE_SECONDS` | Facultatifs |

Le serveur refuse les paiements si le segment `_sandbox_` / `_live_` des clés ne correspond pas à `GENIUSPAY_ENV`.
Aucune de ces valeurs ne doit apparaître dans le web, le mobile ou une variable `EXPO_PUBLIC_*`.

## Mise en route (sandbox)

1. Créer le compte marchand GeniusPay, puis récupérer les clés sandbox (Paramètres → API).
2. Renseigner `GENIUSPAY_ENV=sandbox`, `GENIUSPAY_API_KEY` et `GENIUSPAY_API_SECRET`, puis lancer `npm run geniuspay -- check`.
3. Exposer l'API en https, puis lancer
   `npm run geniuspay -- create-webhook https://<api>/api/payments/webhooks/geniuspay`
   et copier le secret affiché dans `GENIUSPAY_WEBHOOK_SECRET`.
4. Redémarrer le backend.

## Passage en production

1. Remplacer **uniquement** les variables : `GENIUSPAY_ENV=production`, les clés live,
   et un webhook créé avec les clés live (`npm run geniuspay -- create-webhook …`) dont le secret va dans
   `GENIUSPAY_WEBHOOK_SECRET`. Vérifier que `FRONTEND_URL` est en https.
2. `npm run geniuspay -- check` doit afficher `environnement : live`.
3. Redémarrer le backend. Aucune modification de code ni de build mobile n'est nécessaire.

## Tests

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-billing-test npm test
```

`tests/geniusPayProvider.test.js` et `tests/geniusPayFlow.integration.test.js` utilisent un faux
serveur GeniusPay conforme à la documentation (`tests/helpers/fakeGeniusPay.js`).
