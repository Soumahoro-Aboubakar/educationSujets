# Vidéos explicatives — architecture et procédure

Pour le nouveau flux **YouTube + Page Facebook**, avec configuration globale hors dépôt
et essai à blanc par défaut, suivre [Publication des vidéos](../publication-videos.md).
La procédure ci-dessous décrit l'ancien outil YouTube seul et ses fichiers de configuration.

Vidéo d'explication d'une **leçon** (une par leçon et par version de langue, optionnelle), affichée en
tête de la leçon **dès son ouverture**, et vidéo de présentation d'un **concours** (une par programme,
optionnelle). Aucune durée imposée (viser court). Décisions du 2026-11-07 (cahier des charges,
§ 9 bis et § 32) : la vidéo par leçon remplace la vidéo par module (plus courte, placée au-dessus du
texte qu'elle explique, plus simple à tenir à jour).

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
                                       Application : lecteur YouTube intégré en tête de la leçon
```

- **Données** : collection `prepvideos` (`backend/models/PrepVideo.js`), clé unique
  `{ cible: 'lecon' | 'concours', code, langue }`. Les leçons et concours vivent dans le pack de
  contenu embarqué dans l'application : la vidéo y est rattachée par **code** (`MATH-LNEXP-L1`,
  `ENSEA-AS`…), ce qui permet d'ajouter une vidéo sans nouvelle version de l'application.
  Aucun document existant n'est modifié ; pas de document = pas de vidéo.
- **API (lecture seule)** : champ `video` (`null` sans vidéo) dans `GET /api/prep/catalogue`
  (`cycles[].video`), `GET /api/prep/programmes/:code` (`programme.video`,
  `modules[code].lecons[].video`), `GET /api/prep/modules/:code?version=en` (`lecons[].video`) ;
  index compact `GET /api/prep/videos` → `{ lecons: { CODE: { fr, en } }, concours: { CODE: { fr } } }`.
  Seules les vidéos au statut `published` sont exposées. **Aucune route d'écriture.**
- **Application** : `fatafalta/src/prep/video/` — sans vidéo, rien ne s'affiche (ni bouton, ni icône,
  ni message). Avec vidéo : indicateur « Vidéo » sur la leçon (écran Module) et sur le module (accueil
  Prépa) ; à l'ouverture de la leçon, lecteur en tête du texte, chargé d'office si connexion (pas de
  lecture automatique) ; « Lire la leçon » descend au texte ; barre « vidéo en cours » quand on fait
  défiler pour lire ; pause en quittant la leçon. Le concours garde sa vidéo de présentation en tête
  de sa page.

## 2. Prérequis (une seule fois)

1. **Google Cloud** : projet, API « YouTube Data API v3 » activée, écran de consentement OAuth
   **en mode « En production »** (en mode test, le refresh token expire au bout de 7 jours), puis un
   identifiant OAuth de type **Application de bureau**.
2. **Visibilité YouTube** : l'ancien outil exige une vidéo publique et intégrable avant d'écrire
   en base. Le blocage automatique en privé des projets non vérifiés a été levé le 2 novembre 2026
   ([historique Google](https://developers.google.com/youtube/data/revision_history#november-2-2026)).
   Un audit peut rester nécessaire pour une extension de quota.
3. **Secrets locaux** (jamais commités : règle `.env.*.local` du `.gitignore`) :
   - `backend/.env.video.local` : copier `backend/scripts/video/video.env.exemple`, remplir
     `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CHANNEL_ID` ;
   - `npm run video:auth` (dans `backend/`) : ouvre le consentement Google, affiche le
     `YOUTUBE_REFRESH_TOKEN` à coller dans ce fichier ;
   - `backend/.env.production.local` : une ligne `MONGODB_URI=<URI de la base de production>`.
4. **Quota** : consulter les quotas actuels dans le [nouveau guide](../publication-videos.md).
   Les uploads disposent désormais d'un quota distinct ; les anciens coûts de 1 600 unités
   par vidéo ne s'appliquent plus.

## 3. Publier une vidéo

Depuis `backend/` :

```bash
npm run video:brief   -- --type lecon --id MATH-LNEXP-L1              # dossier de génération (aucune vidéo)
npm run video:publish -- --type lecon --id MATH-LNEXP-L1 --fichier ~/videos/math-lnexp-l1.mp4 --dry-run
npm run video:publish -- --type lecon --id MATH-LNEXP-L1 --fichier ~/videos/math-lnexp-l1.mp4
npm run video:publish -- --type lecon --id ANG-GRAM-L1 --langue en --fichier ~/videos/ang-gram-l1-en.mp4
npm run video:publish -- --type concours --id ENSEA-AS --fichier ~/videos/ensea-as.mp4
npm run video:publish -- --etat                                         # chaque leçon / concours : vidéo ? contenu modifié ?
npm run video:publish -- --type lecon --id MATH-LNEXP-L1 --masquer      # retirer de l'application

# Codes des leçons : <MODULE>-L<n> (MATH-LNEXP-L1, ANG-GRAM-L2…) ; liste complète : --etat
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
leçons `MATH-LNEXP-L1` et `MATH-LNEXP-L2` (fr), leçon `ANG-GRAM-L1` (fr et en ; la leçon 2 n'en a pas),
concours `ENSEA-AS`. Ajouter `-- --clear` si Metro tournait déjà sans le mode démo. Jamais actif dans
une version publiée (`__DEV__` faux : vérifié, aucune trace dans les bundles de production).

## 6. Cours de langue étrangère (deux versions)

Un module dont la matière est une langue étrangère (`Anglais`…) déclare `langueCible` et une
`versionCible` : la version par défaut explique le cours **en français** ; la version cible est le
cours entièrement dans la langue étudiée. Les exercices sont communs (mêmes codes, phrases et clés) :
seules les consignes, explications et mini-cours changent. `npm run prep:pack` refuse un cours de
langue sans ses deux versions. Dans l'application, une bascule **FR / EN** dans l'en-tête de l'écran
Module et du lecteur de leçon change de version sans perdre le passage lu ; le choix est mémorisé par
module. Chaque version d'une leçon peut avoir sa propre vidéo (`--langue en`).
