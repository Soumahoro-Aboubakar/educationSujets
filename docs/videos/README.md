# Vidéos explicatives — architecture et procédure

Vidéo d'explication d'un **module** (une par module et par version de langue, optionnelle) et vidéo
de présentation d'un **concours** (une par programme, optionnelle). Aucune durée imposée.
Décisions du 2026-11-07 (cahier des charges, § 9 bis et § 32).

## 1. Vue d'ensemble

```
Machine locale (jamais le serveur)                       Production
──────────────────────────────────                       ──────────
contenu du pack ──► npm run video:brief ──► dossier de génération (.md / .json)
                                              │  (a) générateur IA — pas encore branché
                                              ▼
                     fichier .mp4 ──► npm run video:publish
                                        │ (b) envoi public YouTube (OAuth 2.0, reprenable)
                                        │ (c) id / URL / durée relus sur YouTube
                                        │ (d) confirmation puis écriture ─────────────► MongoDB : prepvideos
                                                                                          │
                                       GET /api/prep/videos (+ champ video des réponses) ◄┘
                                                         │  index relu toutes les 5 min
                                                         ▼
                                       Application : lecteur YouTube intégré en tête du contenu
```

- **Données** : collection `prepvideos` (`backend/models/PrepVideo.js`), clé unique
  `{ cible: 'module' | 'concours', code, langue }`. Les modules et concours vivent dans le pack de
  contenu embarqué dans l'application : la vidéo y est rattachée par **code** (`MATH-LNEXP`,
  `ENSEA-AS`…), ce qui permet d'ajouter une vidéo sans nouvelle version de l'application.
  Aucun document existant n'est modifié ; pas de document = pas de vidéo.
- **API (lecture seule)** : champ `video` (`null` sans vidéo) dans `GET /api/prep/catalogue`
  (`cycles[].video`), `GET /api/prep/programmes/:code` (`programme.video`, `modules[code].video`),
  `GET /api/prep/modules/:code?version=en` ; index compact `GET /api/prep/videos`. Seules les vidéos
  au statut `published` sont exposées. **Aucune route d'écriture.**
- **Application** : `fatafalta/src/prep/video/` — sans vidéo, rien ne s'affiche (ni bouton, ni icône,
  ni message). Avec vidéo : indicateur « Vidéo » dans les listes, lecteur en tête de l'écran Module /
  de l'écran du concours, chargé d'office si connexion (pas de lecture automatique), barre « vidéo en
  cours » quand on fait défiler pour lire, pause automatique à l'ouverture d'une leçon.

## 2. Prérequis (une seule fois)

1. **Google Cloud** : projet, API « YouTube Data API v3 » activée, écran de consentement OAuth
   **en mode « En production »** (en mode test, le refresh token expire au bout de 7 jours), puis un
   identifiant OAuth de type **Application de bureau**.
2. **Audit de l'API YouTube** : les vidéos envoyées par un projet non audité restent **privées**, quelle
   que soit la visibilité demandée — l'application ne pourrait pas les lire. Demander l'audit
   (formulaire « YouTube API Services — Audit and Quota Extension »). Le script détecte ce cas et
   s'arrête avant d'écrire en base.
3. **Secrets locaux** (jamais commités : règle `.env.*.local` du `.gitignore`) :
   - `backend/.env.video.local` : copier `backend/scripts/video/video.env.exemple`, remplir
     `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID` ;
   - `npm run video:auth` (dans `backend/`) : ouvre le consentement Google, affiche le
     `YOUTUBE_REFRESH_TOKEN` à coller dans ce fichier ;
   - `backend/.env.production.local` : une ligne `MONGODB_URI=<URI de la base de production>`.
4. **Quota** : un envoi consomme une grande part du quota quotidien par défaut ; prévoir quelques
   vidéos par jour.

## 3. Publier une vidéo

Depuis `backend/` :

```bash
npm run video:brief   -- --type module --id MATH-LNEXP              # dossier de génération (aucune vidéo)
npm run video:publish -- --type module --id MATH-LNEXP --fichier ~/videos/math-lnexp.mp4 --dry-run
npm run video:publish -- --type module --id MATH-LNEXP --fichier ~/videos/math-lnexp.mp4
npm run video:publish -- --type module --id ANG-GRAM --langue en --fichier ~/videos/ang-gram-en.mp4
npm run video:publish -- --type concours --id ENSEA-AS --fichier ~/videos/ensea-as.mp4
npm run video:publish -- --etat                                       # qui a une vidéo ? contenu modifié depuis ?
npm run video:publish -- --type module --id MATH-LNEXP --masquer      # retirer de l'application
```

Étapes affichées : `[1/7] Cible` · `[2/7] Fichier` · `[3/7] Production` (lecture) · `[4/7] YouTube`
(envoi) · `[5/7] YouTube` (traitement, public, intégrable, durée) · `[6/7] Confirmation` (taper le
code de la cible) · `[7/7] Production` (écriture). La vidéo apparaît dans l'application **sous 5 minutes**.

Garanties :

- **Idempotent** : relancer la même commande ne renvoie jamais une vidéo déjà sur YouTube
  (journal local `backend/.video-state/`, sinon marqueur `fatafalta:<type>:<code>:<langue>:<sha>`
  retrouvé dans la description des envois de la chaîne). Même fichier déjà publié → « rien à faire ».
- **Reprise** : envoi coupé → reprise à l'octet près ; traitement YouTube trop long ou écriture en
  base échouée → relancer (avec ou sans `--fichier`) reprend à l'étape suivante.
- **Sécurité** : refus sur le serveur (Render / `NODE_ENV=production`), refus si un fichier de secrets
  est suivi par git, refus d'envoyer sur une autre chaîne que `YOUTUBE_CHANNEL_ID`, URI Mongo masquée
  dans les journaux, remplacement d'une vidéo existante seulement avec `--remplacer` (l'ancienne reste
  sur YouTube).
- **Journal** : `backend/.video-state/journal.jsonl` (local, ignoré par git).

## 4. Exigences de qualité (génération, plus tard)

`backend/scripts/video/generation/consignes-qualite.md` : simple, clair, détaillé ; toute notion
difficile ou terme technique **défini avant d'être utilisé** ; visuels représentatifs (schémas,
tableaux animés, formules construites pas à pas). La vidéo est d'abord écrite en **storyboard**
(scènes, termes définis / utilisés, visuel) contrôlé par `verifierStoryboard` avant tout rendu ;
`generation/index.js` est le point de branchement du futur générateur (aucun n'est branché).

## 5. Tester l'interface sans rien publier

```bash
cd fatafalta && npm run start:videos-demo     # EXPO_PUBLIC_VIDEOS_DEMO=1 expo start
```

Ajoute, en développement uniquement, de vraies vidéos YouTube publiques (`src/prep/video/demo.js`) :
module `MATH-LNEXP` (fr), cours `ANG-GRAM` (fr et en), concours `ENSEA-AS`. Jamais actif dans une
version publiée (`__DEV__` faux : vérifié, aucune trace dans les bundles de production).

## 6. Cours de langue étrangère (deux versions)

Un module dont la matière est une langue étrangère (`Anglais`…) déclare `langueCible` et une
`versionCible` : la version par défaut explique le cours **en français** ; la version cible est le
cours entièrement dans la langue étudiée. Les exercices sont communs (mêmes codes, phrases et clés) :
seules les consignes, explications et mini-cours changent. `npm run prep:pack` refuse un cours de
langue sans ses deux versions. Dans l'application, une bascule **FR / EN** dans l'en-tête de l'écran
Module et du lecteur de leçon change de version sans perdre le passage lu ; le choix est mémorisé par
module. Chaque version peut avoir sa propre vidéo (`--langue en`).
