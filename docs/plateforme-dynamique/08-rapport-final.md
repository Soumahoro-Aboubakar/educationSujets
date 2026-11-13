# Rapport final — Dynamisation des contenus, synchronisation Web/mobile et continuité de l'apprentissage

13 novembre 2026, branche `feat/mobile-design-premium`. Huit commits locaux (audit + 6 lots + ce rapport), **rien n'a été poussé ni déployé**. Tous les tests ont été exécutés sur MongoDB local (`fatafalta-test`, `fatafalta-dev`), jamais sur la base de production.

Répartition du travail :

- Codex (ChatGPT) : l'audit, la majeure partie du lot 1 et le lot 3, puis son quota s'est épuisé ;
- Claude : la reprise et la vérification du lot 1, les lots 2, 4, 5 et 6, et la vérification de chaque lot avant commit.

Détail par lot : `02-lot-1.md` à `07-lot-6.md` ; conception : `01-audit-conception.md`.

## ⚠️ Incident à connaître (lot 6)

Lors de la première vérification visuelle du site, le serveur de développement web a été lancé **sans** `REACT_APP_API_URL`. Or `frontend/src/index.js` prend alors l'API de **production** par défaut. Pendant quelques minutes, le navigateur headless a donc envoyé à la production :

- des lectures publiques (catalogue de préparation, programme, page d'accueil) ;
- quelques `GET /api/auth/me` refusés (401, jeton local inconnu là-bas) ;
- **un ou deux `POST /api/prep/appareils` sans compte**, qui ont probablement créé une ou deux **identités invitées de préparation vides**, sans progression.

Aucun compte, sujet, paiement ni progression existante n'a été lu en privé ni modifié. Je n'ai rien supprimé en production, car ce n'était pas autorisé.

Mesures prises :

- relance du site avec `REACT_APP_API_URL=http://localhost:5000` ;
- blocage des domaines de production dans l'outil de capture ;
- le site ne crée plus aucune identité pour un visiteur anonyme.

**À décider** : faire nettoyer ces identités invitées vides, identifiables par un `appareilId` commençant par `web-` et créées le 13 novembre vers 6 h (UTC).

## Les 10 scénarios

| # | Scénario | Résultat | Où c'est vérifié (tests exécutés) |
| --- | --- | --- | --- |
| 1 | Organisme ajouté en admin visible sur mobile sans mise à jour | ✅ Vérifié en local | `lot6.recette` (organisme créé par l'API admin et visible par `/api/organismes`), `lot3.integration` (découverte, cycle de vie), `lot4.contract` (nouveau programme publié présent dans le catalogue et utilisable par le dépôt mobile) |
| 2 | Leçon publiée disponible automatiquement | ✅ | `lot4.contract` (publication admin → manifeste → téléchargement → « Leçon toute neuve » résolue par le mobile), `contentRepo.test` |
| 3 | Exercice modifié affiché à jour | ✅ | `lot4.contract` (révision 2 servie ; une session en cours garde la révision 1 jusqu'à sa fin), `contentRepo.test` |
| 4 | Souscription Web → Premium sur mobile | ✅ avec faux fournisseur | `lot6.recette` (paiement HTTP sur la session Web → `entitlements` et droits PREP Premium sur la session mobile sans reconnexion). Mobile : relecture au premier plan (lot 2). |
| 5 | Expiration → droits actualisés | ✅ | `lot6.recette` (deux sessions), `lot1.integration` (expiration, suspension, révocation appliquées à PREP et aux téléchargements) |
| 6 | Fermeture d'une leçon → progression conservée | ✅ | `lot5.integration` (dernière position, plus loin atteint, terminée monotone), lecteur mobile et web (sauvegarde 5 s + arrière-plan), `prepQueue.test` |
| 7 | Autre appareil → parcours récupéré | ✅ | `lot5.integration` (lecture par un second client, conflits de reprise), `lot6.recette` (app → site → app, même identité canonique) |
| 8 | Perte de connexion → sauvegarde locale puis synchro | ✅ | `prepQueue.test` (2 600 actions conservées puis envoyées par paquets), `prep.test.js` (file web survivant au rechargement), `lot5.integration` (rejeu sans double comptage, crash à chaque étape), `lot4` (réponse « en attente » sans note inventée) |
| 9 | Paiement répété / webhook dupliqué → pas de double activation | ✅ avec faux fournisseur | `geniusPayFlow.integration` (« repeated webhook: processed once, subscription extended once », double clic), `lot6.recette` (relecture du paiement : une seule période), `lot1` (traitement interrompu repris) |
| 10 | Conformité du parcours d'abonnement avec Google Play | ✅ côté code | `storePolicy.test` (aucun parcours d'achat sur Android/iOS quelle que soit la réponse serveur ; chaque libellé d'achat sous garde). **Aucune validation Google Play réelle effectuée.** |

Aucun résultat de store ou de fournisseur réel n'est prétendu : les paiements sont simulés (`PAYMENT_MODE=mock`, faux client GeniusPay des tests).

## Fonctionnalités livrées

- **Lot 1 — Sessions et droits serveur.**
  - Sessions révocables par plateforme, rotation sûre des jetons, cookie HttpOnly.
  - Droits Premium calculés uniquement par le serveur, avec suspension et révocation administratives.
  - Identité PREP protégée, avec fusion rejouable.
  - Webhooks tracés et repris.
- **Lot 2 — Application en consultation seule.** Les builds stores n'affichent ni prix ni bouton d'achat et n'ouvrent aucun lien de paiement. Les droits payés sur le site sont reconnus automatiquement.
- **Lot 3 — Publication depuis l'administration.**
  - Contenus de préparation et catalogue publiés depuis l'administration, avec révisions et validation complète.
  - Publication atomique, rollback et retraits.
  - Statut de cycle de vie des organismes, nœuds, matières et parcours.
- **Lot 4 — Contenus dynamiques sur mobile.**
  - L'app télécharge les contenus publiés (manifeste, révisions épinglées), garde le pack embarqué quand l'empreinte est identique et fonctionne hors connexion.
  - Les exercices téléchargés sont corrigés par le serveur.
  - Aucun mélange de révisions dans une session.
- **Lot 5 — Progression durable entre appareils.**
  - Journal d'actions dédoublonné et écriture conditionnelle de la progression.
  - Reprise après crash, reprise partagée entre appareils avec conflits explicites.
  - Lecture des progressions, file mobile sans perte, sauvegarde automatique.
  - Jeton PREP dans SecureStore, écriture atomique de l'état local.
- **Lot 6 — Préparation sur le site.**
  - Programmes, lecteur, exercices corrigés par le serveur, reprise dans `/compte`.
  - Recette transverse.

## Changements de base de données (toutes additives)

| Lot | Changement |
| --- | --- |
| 1 | `authsessions` (nouvelle) ; champs ajoutés à `subscriptions` (`accessState`…), `users`, `prepidentites`, `paymentwebhookevents` |
| 3 | `prepcontents`, `preppublications`, `catalogrevisions` (nouvelles) ; `status` sur `organismes`, `noeuds`, `matieres`, `parcourstypes` ; `source.contentRevision` / `needsReview` sur `prepvideos` |
| 5 | `prepactions` (nouvelle) ; `revision`, `schemaVersion`, `appliquees` sur `prepprogressions` ; `etat.lecons.*.derniere`, `etat.derniereReprise`, `etat.sequencesReprise` |

**Migrations** : `scripts/migrations/lot1.js`, `lot3.js` (import du pack, rapprochements d'organismes à fournir) et `lot5.js`. Elles sont idempotentes, à blanc par défaut, et **refusent toute base non locale**. Une migration de production doit être préparée et autorisée séparément : sauvegarde, contrôle à blanc, rapprochements, puis application.

## Nouvelles API

- **Sessions** : `POST /api/auth/refresh` (rotation, cookie), déconnexion et révocation globale (lot 1).
- **Administration PREP** (`/api/admin/prep/…`, administrateur uniquement, lot 3) :
  - `GET/POST /contenus` ;
  - `GET/PATCH /contenus/:kind/:code` ;
  - `POST /contenus/:kind/:code/valider` ;
  - `POST /publications` (publication groupée ou rollback) ;
  - `POST /contenus/:kind/:code/archiver` ;
  - `DELETE /contenus/:kind/:code/brouillon`.
- **Catalogue** (lot 3) : `PATCH` et `POST …/archiver` sur organismes, nœuds, matières et parcours ; `meta.revision` dans les listes.
- **Public** :
  - `GET /api/prep/manifest` (lot 3) ;
  - paramètres `revision`, `page` et `limit` sur programme, module et catalogue (lot 3) ;
  - `GET /api/prep/progressions?depuis=&limit=` (lot 5).
- **`POST /api/prep/sync`** : statut par action (`applied`, `duplicate`, `rejected`, `retry`, `conflict`) et action `reprise` (lot 5). Les champs historiques restent présents.

## Configuration

- **Côté serveur**, aucun nouveau secret. Deux réglages existants à vérifier :
  - `AUTH_LEGACY_UNTIL` : fin d'acceptation des anciens jetons, 15 décembre 2026 par défaut ;
  - `MOBILE_WEB_CHECKOUT=false`, à poser **après** la sortie de la nouvelle app, pour couvrir les anciennes versions déjà installées.
- **Côté site**, en local : toujours lancer avec `REACT_APP_API_URL=http://localhost:5000`. Sinon le site appelle la production (voir l'incident).

## Limites connues

- **Sessions d'exercices** : les réponses en cours restent sur l'appareil qui les a saisies. Un autre appareil propose de rouvrir le module.
- **Position de lecture** : enregistrée en proportion de la page (pas par bloc). La position des vidéos n'est pas enregistrée.
- **Site** : pas de concours blanc, de test de positionnement ni de lecture hors ligne des contenus.
- **Modules téléchargés hors connexion** : leurs exercices ne peuvent pas être corrigés immédiatement (réponse « en attente »). Les modules identiques au pack embarqué restent corrigés localement.
- **Contrat GeniusPay réel** : identifiant de livraison, relivraison et remboursements ne sont pas vérifiés. Les tests utilisent un faux fournisseur.
- **Codes de contenu renumérotés** lors de la refonte pédagogique : les progressions associées aux anciens codes ne sont pas réattribuées (décision éditoriale).

## Points à valider avant publication sur Google Play

1. Faire une **nouvelle build Android** à partir de ce code, puis vérifier à la main :
   - aucun prix, aucun « S'abonner », aucun lien vers le paiement ;
   - les écrans « Mon accès » et « Accès Premium requis » ;
   - « Actualiser mes droits ».
2. **Fiche Play** et **formulaire Paiements** : déclarer l'app comme application de consultation (pas d'achat dans l'app). Ne mentionner nulle part dans l'app que l'achat se fait sur le site.
3. Après mise en ligne de la nouvelle version : `MOBILE_WEB_CHECKOUT=false` côté serveur, pour les anciennes versions encore installées.
4. **Migrations de production** des lots 1, 3 et 5, avec sauvegarde, contrôle à blanc, rapprochements des 8 programmes avec les organismes réels, puis activation de la publication dynamique (`prep:seed` / `lot3.js --apply`). Tant que l'import n'est pas fait, l'API sert le pack historique (génération 0) et tout fonctionne comme avant.
5. Confirmer `AUTH_LEGACY_UNTIL`.
6. **iOS** : la qualification « reader app » d'Apple n'est pas acquise pour une app d'exercices. Une validation App Review est nécessaire avant toute publication iOS.
7. **Production** : décider du nettoyage des identités invitées vides créées par l'incident ci-dessus.
8. **Relecture pédagogique humaine** des contenus avant de les publier comme définitifs (le pack est marqué « brouillon-pilote »).

## Tests exécutés en dernier (13 novembre 2026)

| Suite | Résultat |
| --- | --- |
| Backend `npm test` (MongoDB local `fatafalta-test`) | **336 / 336**, puis 3 parcours flow checks |
| Mobile `node --test tests/*.test.cjs` | **58 / 58** |
| Web Jest | **15 / 15** (3 suites) |
| Web SEO prerender | **4 / 4** |
| ESLint web (fichiers modifiés) | 0 erreur |
| Simulateur iOS (Expo Go, backend local) | démarrage, Prépa, manifeste et progressions OK |
| Site local (Chrome headless, backend local) | pages de préparation, correction serveur d'une réponse, reprise dans `/compte` |

## Évolution demandée après la mission (13 novembre 2026)

**Bouton « Voir mon abonnement » dans l'app (décision du propriétaire).**

- **Où** : écran « Mon accès », écran Premium de la préparation, et feuille d'accès aux téléchargements (compte connecté).
- **Ce qu'il fait** : il ouvre la page `/compte/abonnement` du site dans le navigateur intégré, déjà connecté grâce au code de passage à usage unique. Le jeton de session n'apparaît jamais dans l'adresse.
- **Sur le site** : sans abonnement actif ou à son terme, la page affiche l'offre avec son prix et « Prendre un abonnement » (ou « Renouveler mon abonnement »). Ce bouton mène au parcours de paiement existant ; l'adresse de retour vers l'app est conservée jusqu'à la confirmation.
- **Au retour** : l'app relit les droits du serveur.
- **Dans l'app elle-même** : aucun prix ni mot d'achat (vérifié par `storePolicy.test`).

⚠️ **Risque Google Play à connaître.** La règle Paiements interdit de mener l'utilisateur vers un autre moyen de paiement que Google Play Billing, notamment par un bouton ou un parcours de compte. Aucun programme d'exception ne couvre la Côte d'Ivoire. Ce parcours peut entraîner le rejet de la mise à jour, le retrait de l'app ou une sanction du compte développeur.

**Interrupteur serveur** : `MOBILE_ACCOUNT_LINK=false` retire le bouton de **toutes** les versions de l'app, sans republication. Un ancien serveur qui ne fournit pas `webAccountUrl` le masque aussi.

**Icônes d'état**, dans l'app (`StatusMark`) et sur le site :

| État | Rendu |
| --- | --- |
| Terminé / validé | disque vert, coche blanche et mention « Terminée », « Module maîtrisé » ou « Validé » |
| Commencé | anneau bordeaux proportionnel à l'avancement, avec « Commencée · N % » ou « En cours » |
| Suivant conseillé | disque bordeaux plein |
| Pas encore ouvert | cercle neutre |
| Accès requis | cadenas |

Elles s'appliquent aux leçons, aux modules et aux niveaux d'exercices (badge « Validé »).

**Tests** : backend 336/336, mobile 60/60, web 15/15. Les rendus ont été vérifiés en local (app via Expo web, site via Chrome headless). Le passage de session de l'app vers le site a été testé de bout en bout, jusqu'à la page de paiement.
