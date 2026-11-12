# Publier les cours Fatafalta sur YouTube, Facebook et TikTok

Ces outils fonctionnent sur votre ordinateur, avec Node.js 18 ou supérieur, les
dépendances déjà installées du backend et un navigateur. Ils n'ajoutent aucune
dépendance npm. Ils utilisent les API REST officielles et `fetch` de Node.

**Sans `--publier`, aucune vidéo n'est envoyée, aucune requête réseau n'est faite
et aucune base ni aucun journal n'est modifié.** Les commandes de connexion
contactent les plateformes pour obtenir les autorisations, sans publier de vidéo.

Le flux réel suit les plateformes actives : validation locale de tous les fichiers
→ contrôle des comptes et des limites TikTok → YouTube et traitement, miniature,
playlists → Facebook et traitement, miniature → TikTok Direct Post et interrogation
du statut → enregistrement du lien YouTube en base. Une plateforme en échec garde
les résultats précédents ; la relance reprend les journaux. YouTube et Facebook
sont actifs par défaut, **TikTok est désactivé par défaut**.
Sans YouTube, aucune connexion ni écriture MongoDB n'a lieu. Facebook publie une
vidéo native sur la Page ; « non répertoriée » sur YouTube ne rend pas Facebook
privé. TikTok possède sa propre visibilité, obligatoirement choisie explicitement.

## 1. Préparer Google et la chaîne YouTube

1. Connectez-vous au compte Google propriétaire de la chaîne Fatafalta. Créez la
   chaîne si nécessaire. Pour une chaîne de marque, sélectionnez bien cette chaîne
   lors du consentement. Notez son identifiant `UC…` dans YouTube Studio, paramètres
   de la chaîne / paramètres avancés du compte.
2. Ouvrez la [console Google Cloud](https://console.cloud.google.com/), choisissez
   **Créer un projet**, nommez-le par exemple « Fatafalta vidéos » et sélectionnez-le.
3. Dans **API et services → Bibliothèque**, cherchez **YouTube Data API v3**, puis
   cliquez sur **Activer**.
4. Ouvrez **Google Auth Platform** (ou **Écran de consentement OAuth**). Renseignez
   le nom Fatafalta, l'adresse d'assistance et votre adresse de contact. Choisissez
   l'audience externe si votre compte n'appartient pas à une organisation Workspace.
5. Pour commencer en mode **Test**, ajoutez votre compte Google aux utilisateurs
   test. Dans **Accès aux données**, autorisez la portée
   `https://www.googleapis.com/auth/youtube`. Elle permet l'envoi, la lecture de
   l'état, les miniatures et la gestion des playlists. Une portée limitée à
   `youtube.upload` ne couvre pas toutes ces opérations.
6. Dans **Clients → Créer un client**, choisissez **Application de bureau**.
   Recopiez l'identifiant client et le secret client dans le fichier externe décrit
   à l'étape 3. Si vous téléchargez le JSON Google, conservez-le également hors dépôt.
   N'utilisez pas un client « application Web » pour ce flux.

Le script ouvre le navigateur et reçoit le code sur
`http://127.0.0.1:PORT/callback`, avec un port libre choisi automatiquement. Le
serveur écoute uniquement sur l'interface locale, vérifie `state`, expire après
cinq minutes et utilise PKCE S256. Vous n'avez pas à copier de code Google.
Voir le [flux OAuth pour applications de bureau](https://developers.google.com/identity/protocols/oauth2/native-app).

Pour un usage durable, examinez le passage de l'écran de consentement **En
production** et la vérification OAuth exigée selon votre audience et vos portées.
En mode test externe, les jetons de rafraîchissement des portées YouTube expirent
généralement après sept jours ; il faut alors se reconnecter. Une révocation reste
possible même en production. Voir les [règles d'expiration des jetons Google](https://developers.google.com/identity/protocols/oauth2#expiration).

### Quotas et vidéos longues

Au **9 novembre 2026**, `videos.insert` coûte **1 unité dans le quota distinct
« Video Uploads »**, avec une limite par défaut de **100 appels par jour**. Les
autres opérations disposent ensemble de 10 000 unités quotidiennes ; créer une
playlist, y ajouter une vidéo ou définir une miniature coûte généralement 50 unités
par opération. Ce sont des unités de quota, pas un tarif en euros. Les anciens
chiffres de 1 600 puis 100 unités par upload correspondent à des versions antérieures.
Contrôlez les limites propres à votre projet dans **API et services → Quotas**.
Voir le [calculateur officiel](https://developers.google.com/youtube/data/determine_quota_cost).

Une demande d'augmentation de quota peut nécessiter un audit de conformité via le
[formulaire YouTube](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits).
Depuis le **2 novembre 2026**, Google indique que les projets API non vérifiés ne
subissent plus le blocage automatique des uploads en privé. Cela ne dispense pas
des exigences OAuth ni des restrictions propres à la chaîne. Le script relit
toujours la visibilité réelle avant d'enregistrer le lien. Voir
l'[historique officiel YouTube](https://developers.google.com/youtube/data/revision_history#november-2-2026).

Avant d'envoyer une vidéo de **plus de 15 minutes**, faites la vérification
téléphonique sur [YouTube Verify](https://www.youtube.com/verify). Vérifiez aussi
l'accès aux miniatures personnalisées dans YouTube Studio. Voir
l'[aide sur les vidéos longues](https://support.google.com/youtube/answer/71673) et
les [fonctionnalités de la chaîne](https://support.google.com/youtube/answer/171664).

## 2. Préparer Meta et la Page Facebook

Les intitulés de Meta dépendent du type d'app et de la version de Graph API. La
documentation Meta a renvoyé des erreurs 429 pendant cette préparation ; confirmez
les permissions et l'URI acceptées dans votre tableau de bord avant connexion.
Les trois phases et les offsets de reprise suivent le protocole également utilisé
dans le [code officiel Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/video_uploader.py).

1. Avec votre compte Facebook, créez ou choisissez la **Page Facebook Fatafalta**.
   Votre compte doit disposer des droits permettant de créer du contenu sur cette
   Page. Notez l'identifiant numérique de la Page, distinct de l'identifiant de l'app.
2. Ouvrez [Meta for Developers](https://developers.facebook.com/apps/), activez votre
   compte développeur si nécessaire et créez une app adaptée à la gestion d'actifs
   professionnels et de Pages. Associez le portefeuille Business si le parcours
   Meta l'exige. Relevez l'**App ID** et l'**App Secret** dans les paramètres de base.
3. Ajoutez le produit/cas d'usage **Facebook Login**, ou **Facebook Login for
   Business** selon votre app, pour autoriser votre compte et sélectionner la Page.
   Le script utilise le flux code classique avec une liste de permissions `scope`.
   Si votre parcours impose une configuration Business Login incompatible avec ce
   flux, faites adapter la configuration de l'app avant de poursuivre.
4. Configurez les permissions adaptées à la publication de vidéos de Page :

   | Permission | Utilisation |
   | --- | --- |
   | `pages_show_list` | Retrouver la Page et obtenir son jeton via `/me/accounts`. |
   | `pages_manage_posts` | Créer les publications de la Page. |
   | `pages_read_engagement` | Lire les informations nécessaires de la Page et des contenus. |
   | `publish_video` | À contrôler dans le cas d'usage Video/Live et la version retenue ; sa disponibilité et son exigence varient selon l'app. |

   La liste demandée par défaut comprend ces quatre permissions. Si Meta refuse
   `publish_video` comme permission indisponible pour votre app et confirme que
   l'upload de Page est couvert par les permissions Pages, renseignez explicitement
   `FACEBOOK_SCOPES` avec les trois permissions Pages. Ne retirez pas une permission
   requise pour contourner un examen. Reconnectez-vous après toute modification.
5. Dans les réglages Login, ajoutez l'URI de retour exacte. Pour un test local,
   commencez par `http://localhost:53683/callback` si votre app accepte cette
   exception de développement. Le script écoute alors sur `127.0.0.1:53683`.
   Si Meta impose HTTPS, choisissez une URL HTTPS que vous contrôlez, inscrivez-la
   chez Meta et dans `FACEBOOK_REDIRECT_URI`. Après autorisation, copiez l'URL
   complète de retour depuis la barre d'adresse dans le terminal ; le script
   vérifie son adresse et son `state`. Cette page doit être sous votre contrôle,
   sans analytique ni journalisation des paramètres OAuth. N'utilisez pas un
   service public de collecte de callbacks. Le script ne crée pas de tunnel.
6. Choisissez une version Graph API prise en charge dans le tableau de bord et
   copiez sa valeur exacte, par exemple sous la forme `vXX.0`, dans
   `FACEBOOK_API_VERSION`. `vXX.0` est un modèle à remplacer, pas une valeur valide.
7. En développement, ajoutez votre compte aux rôles de l'app et acceptez l'invitation.
   Pour des utilisateurs ou des Pages hors des rôles autorisés, Meta peut exiger
   **Advanced Access**, examen de l'app, vérification de l'entreprise, politique
   de confidentialité, procédure de suppression des données et démonstration du
   cas d'usage. Consultez **App Review → Permissions and Features** et passez l'app
   en mode Live uniquement quand les prérequis affichés sont satisfaits.

Le script échange le code contre un jeton utilisateur, l'échange ensuite contre
un jeton utilisateur longue durée (habituellement environ 60 jours), puis obtient
le **jeton de Page** via `/me/accounts`. Il conserve le jeton de Page et renouvelle
son obtention avec le jeton utilisateur encore valable. Facebook ne fournit pas
de `refresh_token` équivalent à Google : si les autorisations sont révoquées ou
si le renouvellement devient impossible, une connexion interactive est nécessaire.
Un jeton de Page dérivé d'un jeton utilisateur longue durée peut ne pas avoir de
date d'expiration fixe ; cela ne garantit pas qu'il restera valide indéfiniment.

Références à vérifier dans votre espace Meta :
[accès aux Pages](https://developers.facebook.com/docs/pages-api/getting-started/),
[jetons longue durée](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/),
[publication vidéo](https://developers.facebook.com/docs/video-api/guides/publishing/),
[permissions](https://developers.facebook.com/docs/permissions/),
[examen de l'app](https://developers.facebook.com/docs/app-review/).


## 2 bis. Préparer TikTok for Developers

1. Connectez-vous à [TikTok for Developers](https://developers.tiktok.com/) et ouvrez
   **Manage apps → Create app**. Renseignez Fatafalta, l'icône, la description du
   service, le site, les conditions d'utilisation et la politique de confidentialité.
   Vérifiez la propriété des URL demandées dans le portail. Voir
   [création d'une app](https://developers.tiktok.com/docs/en/getting-started-create-an-app).
2. Configurez la plateforme **Desktop** pour ce flux local. Ajoutez **Login Kit**,
   puis **Content Posting API** avec **Direct Post**. Demandez les scopes
   `video.publish` et `video.upload` ; configurez les comptes de test du Sandbox
   selon votre tableau de bord. Direct Post utilise `video.publish` ; `video.upload`
   concerne l'envoi en boîte de réception/brouillon, qui n'est pas le mode de ce
   script. Les deux portées sont demandées et vérifiées à la connexion.
3. Dans Login Kit Desktop, enregistrez exactement
   `http://127.0.0.1:53684/callback/` (barre finale comprise). Le navigateur revient
   sur un serveur éphémère qui écoute uniquement sur `127.0.0.1` ; `state` est
   vérifié et l'attente expire après cinq minutes. Pour changer le port, modifiez
   aussi `TIKTOK_REDIRECT_URI`. Aucun tunnel ni serveur public n'est nécessaire.
   Le PKCE Desktop TikTok emploie **SHA-256 encodé en hexadécimal**, avec `S256`.
   Voir [Login Kit Desktop](https://developers.tiktok.com/docs/en/login-kit-desktop).
4. Copiez **Client key** et **Client secret** uniquement dans le fichier externe
   protégé décrit ci-dessous. Ne les placez pas dans les sources, `.env`, les
   métadonnées, un ticket ou le chat. Après connexion, renseignez localement
   `TIKTOK_OPEN_ID` avec l'identifiant affiché, pour verrouiller le compte cible.

### Audit et restrictions

**Publier en public nécessite l'audit du client Content Posting API**, distinct de
l'ajout du produit ou de l'autorisation OAuth. Avant audit : `SELF_ONLY`, compte
cible privé, au plus cinq utilisateurs publiants sur 24 heures. D'autres plafonds
par créateur et par app restent applicables après audit.

TikTok exclut de l'usage admissible les simples outils internes servant à publier
sur les comptes de sa propre équipe. **Ce CLI Fatafalta seul ne garantit donc pas
l'admissibilité à l'audit.** Pour viser le public via API, il faut un produit éligible
et une expérience de partage conforme (aperçu, compte affiché, choix de visibilité,
interactions, divulgation commerciale, consentement) acceptée par TikTok. Sinon,
conservez `--sans-tiktok` et publiez manuellement dans l'application TikTok.
Voir les [règles de partage et d'audit](https://developers.tiktok.com/docs/en/content-sharing-guidelines).
Le script ne contourne aucune restriction d'audit et ne transforme jamais
silencieusement une demande publique en publication privée.

### Préparer une vidéo compatible

La sonde locale lit réellement le conteneur MP4 en Node, sans `ffprobe`, paquet
npm ni binaire ajouté. Par choix conservateur, ce flux accepte seulement un **MP4
standard non fragmenté**, une piste vidéo H.264/H.265, des dimensions de 360 à
4096 pixels sur chaque axe, 23–60 images/s et au maximum 4 milliards d'octets.
Les rotations de 90° sont prises en compte. Une structure inconnue ou des
métadonnées incohérentes sont refusées ; cette sonde ne décode pas chaque image.
TikTok accepte également d'autres conteneurs, mais ce CLI exige un réexport MP4.
Voir le [guide des médias](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide).

**Le profil Fatafalta impose une vidéo verticale (hauteur > largeur)** ; le 9:16,
par exemple 1080×1920, est conseillé. C'est une politique locale prudente, pas une
obligation universelle de l'API TikTok. Avant tout envoi, le script contrôle la
durée avec `TIKTOK_MAX_DURATION_SEC` (180 secondes par défaut, plafond local
configurable jusqu'à 600). En publication réelle il relit également
`max_video_post_duration_sec` et `privacy_level_options` du compte, avant tout
upload et à nouveau juste avant TikTok. La plus petite limite de durée s'applique.
L'essai à blanc reste sans réseau : il ne peut pas connaître la limite du compte.
Voir [informations créateur](https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info).

Pour un cours horizontal ou trop long, montez **un extrait pédagogique vertical**
avec une seule notion, des textes lisibles et une durée inférieure à la limite.
Réexportez-le depuis votre outil de montage en MP4 H.264, 1080×1920, 30 images/s
et utilisez `--tiktok-fichier /chemin/extrait.mp4`. `--fichier` reste le cours complet
pour YouTube/Facebook et l'empreinte de référence. Aucun recadrage, découpage ou
raccourcissement automatique n'est effectué. Si aucun extrait n'est prêt,
utilisez `--sans-tiktok` ; ne forcez pas une durée fictive dans les métadonnées.

## 3. Enregistrer la configuration une seule fois, hors dépôt

Ne modifiez pas `.env` ni `keys.text`. Le nouveau flux ne les charge pas et ne lit
pas les anciens fichiers d'environnement vidéo. Ne placez aucun secret dans les
métadonnées ou dans une commande enregistrée dans l'historique du terminal.

Dans un terminal macOS/Linux :

```bash
umask 077
mkdir -p "$HOME/.config/fatafalta"
chmod 700 "$HOME/.config/fatafalta"
touch "$HOME/.config/fatafalta/config.json"
chmod 600 "$HOME/.config/fatafalta/config.json"
nano "$HOME/.config/fatafalta/config.json"
```

Collez ce modèle dans l'éditeur et remplacez chaque valeur indicative. Il s'agit
d'un objet JSON, avec des virgules entre les lignes et sans commentaire :

```json
{
  "YOUTUBE_CLIENT_ID": "REMPLACER.apps.googleusercontent.com",
  "YOUTUBE_CLIENT_SECRET": "REMPLACER_LOCALEMENT",
  "YOUTUBE_CHANNEL_ID": "UC_REMPLACER",
  "YOUTUBE_PRIVACY": "unlisted",
  "FACEBOOK_APP_ID": "REMPLACER",
  "FACEBOOK_APP_SECRET": "REMPLACER_LOCALEMENT",
  "FACEBOOK_PAGE_ID": "REMPLACER",
  "FACEBOOK_API_VERSION": "vXX.0",
  "FACEBOOK_REDIRECT_URI": "http://localhost:53683/callback",
  "FACEBOOK_SCOPES": "pages_show_list,pages_manage_posts,pages_read_engagement,publish_video",
  "YOUTUBE_ENABLED": true,
  "FACEBOOK_ENABLED": true,
  "TIKTOK_ENABLED": false,
  "TIKTOK_CLIENT_KEY": "REMPLACER",
  "TIKTOK_CLIENT_SECRET": "REMPLACER_LOCALEMENT",
  "TIKTOK_REDIRECT_URI": "http://127.0.0.1:53684/callback/",
  "TIKTOK_OPEN_ID": "",
  "TIKTOK_MAX_DURATION_SEC": 180,
  "MONGODB_URI": "REMPLACER_PAR_L_URI_DE_LA_BASE_CIBLE"
}
```

| Nom exact | Valeur et caractère obligatoire |
| --- | --- |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | Client OAuth bureau Google ; requis pour la connexion et la publication. |
| `YOUTUBE_CHANNEL_ID` | Identifiant `UC…` de la chaîne attendue ; requis. |
| `YOUTUBE_PRIVACY` | `unlisted` par défaut, ou `public`. `private` est prévisualisable mais refusé en publication car le lecteur des élèves ne pourrait pas fonctionner. |
| `YOUTUBE_PLAYLISTS` | Facultatif : objet associant `CODE-CONCOURS/Matière` à un identifiant de playlist existante. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Identifiants de l'app Meta ; requis. |
| `FACEBOOK_PAGE_ID` | Identifiant numérique de la Page ; requis. |
| `FACEBOOK_API_VERSION` | Version Graph API prise en charge ; requise et sans valeur implicite. |
| `FACEBOOK_REDIRECT_URI` | URI exacte autorisée chez Meta ; défaut local indiqué ci-dessus. |
| `FACEBOOK_SCOPES` | Liste de permissions séparées par des virgules ; défaut indiqué ci-dessus. |
| `YOUTUBE_ENABLED`, `FACEBOOK_ENABLED`, `TIKTOK_ENABLED` | Booléens JSON ou chaînes `true`/`false` du processus. Défauts : `true`, `true`, `false`. |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Identifiants de l'app Desktop ; requis pour connexion/rafraîchissement et publication TikTok. |
| `TIKTOK_REDIRECT_URI` | Retour loopback HTTP avec port explicite, sans paramètres/fragment ; défaut `http://127.0.0.1:53684/callback/`. |
| `TIKTOK_OPEN_ID` | Laisser vide pour la première connexion puis renseigner l'identifiant affiché ; obligatoire en publication TikTok réelle. |
| `TIKTOK_MAX_DURATION_SEC` | Limite locale positive en secondes, 180 par défaut, au plus 600 ; la limite du compte reste prioritaire si inférieure. |
| `MONGODB_URI` | URI de la base à alimenter, avec accès à `prepvideos` ; requise uniquement en publication réelle avec YouTube actif. |
| `FATAFALTA_SOCIAL_HOME` | Variable du processus, facultative, pour changer le dossier externe complet. |

Les clés de configuration peuvent aussi être fournies comme variables déjà
injectées dans le processus ; elles prennent priorité sur `config.json`. Préférez
le fichier protégé pour éviter de taper des secrets dans une commande. Les jetons
ne sont pas des variables à recopier : les scripts créent automatiquement
`youtube.json`, `facebook.json` et `tiktok.json`, en permissions **600**. Les journaux de reprise
`video-<empreinte>.json` et `tiktok-<empreinte>.json` sont aussi protégés, car ils contiennent des URL de session.
Le dossier doit rester en **700**. Les fichiers illisibles ou corrompus provoquent
un arrêt ; ils ne sont pas remplacés par un état vide.

Cette configuration est commune aux copies du projet sur cette machine. Un chemin
de configuration situé dans un dépôt Git est refusé, même via un lien symbolique.
Sauvegardez ce dossier de façon privée ; ne le joignez pas à un ticket ou au chat.

## 4. Se connecter sans publier

Depuis le dossier `backend` du projet :

```bash
npm run video:login-youtube
npm run video:login-facebook
npm run video:login-tiktok
```

Exécutez seulement les connexions des plateformes souhaitées.
Le navigateur s'ouvre. Choisissez le compte/la chaîne Google, puis le compte
Facebook et la Page prévus, puis le compte TikTok souhaité. Accordez les autorisations demandées. Si le navigateur
ne s'ouvre pas, ouvrez vous-même l'URL affichée. Aucun jeton n'est affiché.

Pour contrôler ou renouveler les jetons déjà enregistrés, sans envoi de vidéo :

```bash
npm run video:login-youtube -- --refresh
npm run video:login-facebook -- --refresh
npm run video:login-tiktok -- --refresh
```

Si Google indique `invalid_grant` ou si Facebook indique un jeton invalide/code 190,
relancez la commande de connexion correspondante sans `--refresh`. En cas d'erreur
de permission, corrigez d'abord l'accès dans le tableau de bord de la plateforme.

TikTok renouvelle automatiquement le jeton d'accès proche de l'expiration et
remplace le refresh token à chaque rotation ; les échéances proviennent des
réponses OAuth, sans durée codée en dur. Après expiration/révocation du refresh
token ou `invalid_grant`, relancez `npm run video:login-tiktok` sans `--refresh`.
Ne recopiez jamais les jetons à la main. Voir la
[gestion des jetons TikTok](https://developers.tiktok.com/docs/en/oauth-user-access-token-management).

## 5. Faire un essai à blanc avec une vidéo générée

Vous pouvez effectuer cet essai avant les connexions, avec les seuls fichiers
locaux. Remplacez les chemins et choisissez un code de leçon présent dans le pack :

```bash
cd /chemin/vers/educationSujets/backend
npm run video:publish-social -- \
  --type lecon --id MATH-LNEXP-L1 \
  --fichier "$HOME/videos/math-lnexp-l1.mp4" \
  --titre "La fonction logarithme népérien" \
  --description "Cours de mathématiques Fatafalta." \
  --tags "mathématiques,logarithme,concours" \
  --miniature "$HOME/videos/math-lnexp-l1.jpg" \
  --concours ENSEA-AS --dry-run
```

`--dry-run` est facultatif : il s'applique par défaut. Le résultat affiche le SHA-256,
les métadonnées et les playlists prévues. Aucune connexion réseau ne vérifie les
identifiants, le quota ou les droits pendant cet essai.

Vous pouvez remplacer les options de métadonnées par `--metadonnees /chemin/cours.json` :

```json
{
  "titre": "La fonction logarithme népérien",
  "description": "Cours de mathématiques Fatafalta.",
  "tags": ["mathématiques", "logarithme", "concours"],
  "miniature": "/chemin/absolu/math-lnexp-l1.jpg",
  "visibilite": "unlisted",
  "concours": "ENSEA-AS",
  "matiere": "Mathématiques"
}
```

Les options explicites du terminal prennent priorité sur ce JSON. Utilisez des
chemins absolus pour les médias dans le JSON ; les chemins relatifs sont résolus
depuis le répertoire courant. La miniature JPEG/PNG est limitée volontairement à
2 Mio pour les envois YouTube/Facebook. Les tags s'appliquent à YouTube ;
le titre, la description et la miniature sont également envoyés à Facebook.
Un marqueur Fatafalta est ajouté à la description pour retrouver les envois.

Les playlists YouTube sont regroupées par concours et matière. Sans `--concours`,
une leçon rejoint les playlists de tous les concours associés dans le pack. Avec
`--concours`, seul ce concours est retenu. Une présentation de concours utilise la
matière « Présentation » par défaut. Les playlists absentes sont créées non
répertoriées ; une playlist configurée par identifiant garde sa visibilité actuelle.
Pour utiliser les vôtres, ajoutez par exemple dans `config.json` :

```json
"YOUTUBE_PLAYLISTS": {
  "ENSEA-AS/Mathématiques": "IDENTIFIANT_DE_VOTRE_PLAYLIST"
}
```

### Activer les plateformes et essayer TikTok sans envoyer

Les options `--youtube` / `--sans-youtube`, `--facebook` / `--sans-facebook` et
`--tiktok` / `--sans-tiktok` remplacent les booléens de configuration. Les deux
options opposées d'une même plateforme sont incompatibles. Au moins une plateforme
doit rester active. Une plateforme inactive ne demande aucun identifiant ni jeton.
Sans YouTube, le résultat ne modifie pas le lien de cours dans Fatafalta/MongoDB.

Exemple avec les trois plateformes, toujours **sans réseau et sans publication** :

```bash
npm run video:publish-social -- \
  --type lecon --id MATH-LNEXP-L1 \
  --fichier "$HOME/videos/math-lnexp-l1.mp4" \
  --youtube --facebook --tiktok \
  --tiktok-fichier "$HOME/videos/math-lnexp-l1-extrait.mp4" \
  --tiktok-visibilite SELF_ONLY \
  --tiktok-legende "Comprendre le logarithme : un exemple guidé #maths" \
  --dry-run
```

Ajoutez `--sans-youtube --sans-facebook` et retirez `--youtube --facebook` pour
prévisualiser seulement TikTok. Aucun accès MongoDB n'est alors nécessaire.
Les champs `tiktok-fichier`, `tiktok-visibilite`, `tiktok-legende` peuvent aussi
être placés dans le JSON de `--metadonnees`, les arguments explicites restant
prioritaires. Sans `--tiktok-fichier`, le cours original doit lui-même être compatible.

La visibilité TikTok n'a **aucun défaut** : choisissez `SELF_ONLY` pour les essais
autorisés avant audit ; les autres valeurs sont `PUBLIC_TO_EVERYONE`,
`MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, uniquement si le compte et l'app
les autorisent. La légende (2200 unités UTF-16 maximum) remplace le titre seul qui
est proposé par défaut ; description YouTube et marqueur ne sont pas ajoutés à TikTok.
Les commentaires, duos et collages restent désactivés sauf activation explicite
avec `--tiktok-commentaires`, `--tiktok-duos`, `--tiktok-collages`, et sous réserve
des réglages du compte. `--tiktok-marque` signale la promotion de sa propre marque,
`--tiktok-partenariat` un partenariat tiers (incompatible avec `SELF_ONLY`),
`--tiktok-ia` un contenu généré par IA. Vérifiez ces déclarations pour chaque vidéo.
La miniature JPEG/PNG reste réservée à YouTube/Facebook ; TikTok prend sa couverture
dans la vidéo. Consultez le [schéma Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post).

## 6. Plus tard : déclencher la publication et automatiser

**Les commandes de cette section publient réellement. Ne les lancez que lorsque
vous voulez envoyer la vidéo sur les plateformes actives et enregistrer son lien si YouTube est actif.**
Reprenez les mêmes options que pour l'essai à blanc, retirez `--dry-run`, puis
ajoutez `--publier`. Aucune confirmation supplémentaire n'est demandée.
Pour TikTok, vérifiez d'abord l'aperçu local dans votre lecteur et les options de
l'essai à blanc. En publiant, vous acceptez la
[Music Usage Confirmation](https://www.tiktok.com/legal/page/global/music-usage-confirmation/en)
et, pour un partenariat, la
[Branded Content Policy](https://www.tiktok.com/legal/page/global/bc-policy/en).

```bash
npm run video:publish-social -- \
  --type lecon --id MATH-LNEXP-L1 \
  --fichier "$HOME/videos/math-lnexp-l1.mp4" \
  --metadonnees "$HOME/videos/math-lnexp-l1.json" --publier
```

Pour une présentation : `--type concours --id ENSEA-AS`. Pour une leçon de langue :
`--type lecon --id ANG-GRAM-L1 --langue en`. `--visibilite public` remplace le défaut
non répertorié. `--remplacer` autorise le remplacement du lien d'une cible dont le
fichier est différent ; les anciennes vidéos restent sur les plateformes.

L'enregistrement réutilise les fonctions partagées de `publish.js` : même résolution
de cible, même connexion Mongo dédiée, même upsert de `prepvideos`, même clé
`{ cible, code, langue }`, même traçabilité. Il écrit `youtubeId`,
`url: https://www.youtube.com/watch?v=ID` et `status: published`. Le lien est ensuite
servi par `GET /api/prep/videos`, après expiration du cache de cinq minutes. Aucun
changement de schéma ni de route d'écriture n'est nécessaire.

Le dépôt expose actuellement un point de branchement de générateur dans
`backend/scripts/video/generation/index.js`, sans générateur enregistré. Pour
l'automatisation, faites appeler la commande ci-dessus par votre générateur local
**après** la fermeture complète du MP4 et la création des métadonnées. Utilisez
`child_process.spawn`/`execFile` avec un tableau d'arguments et attendez le code de
sortie avant la vidéo suivante. Une file locale doit conserver la tâche tant que
le code est non nul et relancer exactement les mêmes arguments. Les identifiants
et jetons déjà stockés seront réutilisés sans connexion interactive, tant qu'ils
restent valides. Il n'y a pas de surveillance automatique de dossier ni de tâche
planifiée installée par ces scripts.

Depuis un autre répertoire, la même configuration globale fonctionne avec
`npm --prefix /chemin/vers/educationSujets/backend run video:publish-social -- …`.
Les scripts refusent Render et `NODE_ENV=production` : cette automatisation reste
locale, sur votre poste. N'exécutez pas simultanément l'ancien `video:publish` et
le nouveau flux pour le même fichier ; l'ancien outil possède son propre journal.

## 7. Reprendre après une erreur

- **Coupure YouTube** : relancez la même commande, avec les mêmes métadonnées. Le
  script interroge l'URL de session puis reprend à l'octet confirmé par Google.
- **Coupure Facebook** : le journal conserve `video_id`, session et offsets. La
  relance reprend cette session ; si Meta renvoie un offset corrigé, il est utilisé.
- **Traitement en cours** : relancez plus tard, ou utilisez `--attente-minutes 40`
  (20 par défaut, jusqu'à 120 par plateforme). Aucun lien n'est écrit avant le
  succès de toutes les plateformes actives, y compris `PUBLISH_COMPLETE` pour TikTok.
- **Base indisponible** : relancez après correction réseau/droits. Les identifiants
  sociaux déjà obtenus sont conservés ; aucune nouvelle vidéo n'est créée.
- **Création incertaine ou session expirée** : le script cherche le marqueur sur la
  chaîne/Page, puis s'arrête si le résultat reste ambigu. Vérifiez les studios et
  attendez la propagation. Il n'existe pas de garantie transactionnelle commune à
  MongoDB, YouTube, Facebook et TikTok : l'arrêt protège contre un deuxième envoi aveugle.
  Si une vidéo complète existe sans être retrouvée, faites vérifier par un technicien
  son identité et son marqueur avant de renseigner `youtube.id` ou `facebook.id`
  dans le journal correspondant, hors dépôt. Si aucun envoi n'existe et qu'une
  session inutilisable est confirmée abandonnée, archivez ce seul journal hors du
  dossier actif avant de relancer. Ne réinitialisez jamais tout le dossier.
- **Verrou après interruption brutale** : `publication.lock` contient le PID.
  Vérifiez avec `ps -p PID` qu'aucun script n'est encore actif. Supprimez ensuite
  uniquement ce verrou ; conservez les fichiers `video-*.json` et `tiktok-*.json`.
- **Métadonnées modifiées** : reprenez avec les valeurs initiales. Après succès,
  modifiez le titre/description dans les studios. Cela évite qu'une reprise publie
  des versions incohérentes sur les plateformes.

Les erreurs HTTP sont filtrées pour ne pas afficher de réponses contenant des
secrets. Les lectures HTTP 429/5xx sont réessayées avec attente croissante ; les
créations ne sont pas répétées aveuglément. Conservez le journal et les marqueurs
des descriptions. Les journaux sont indexés par chaîne, Page, cible, langue et
empreinte complète du fichier. Le verrou est commun aux connexions et publications
utilisant le même dossier global. Deux ordinateurs ne partagent pas ce verrou :
utilisez un seul poste de publication pour un même compte.

### Reprise TikTok et limites de l'idempotence

Le script utilise `/v2/post/publish/video/init/` en **Direct Post**, puis une URL
signée `FILE_UPLOAD`. Les morceaux sont envoyés séquentiellement par `fetch` Node
avec `Content-Length` et `Content-Range`. Le dernier absorbe le reste conformément
au protocole ; un fichier court est envoyé en un seul morceau. La vidéo reste sur
votre ordinateur avant transfert, sans hébergement ni `PULL_FROM_URL`.

Le journal TikTok séparé associe app, compte `open_id`, cible, langue et empreinte
du cours original ; il vérifie aussi l'empreinte de l'extrait et ses options.
Il conserve `publish_id`, URL signée et progression en permissions 600. L'activation
différée de TikTok ne réenvoie pas YouTube/Facebook. Modifier l'extrait ou ses options
pendant une reprise est refusé. Ne supprimez pas le journal après réussite.

Après coupure, relancez avec les mêmes arguments :
`/v2/post/publish/status/fetch/` réconcilie `uploaded_bytes`, puis les morceaux
restants utilisent la même session. Le script interroge ensuite le statut toutes
les 15 secondes, jusqu'à `PUBLISH_COMPLETE`, échec ou délai. Le `publish_id` est un
identifiant de suivi, pas forcément un identifiant de vidéo publique ; un contenu
peut rester en modération. Voir [états de publication](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status).

Une progression serveur encore en retard provoque un arrêt : attendez puis
relancez. Un `FAILED`, une URL d'upload expirée (valable une heure après création)
ou une création dont la réponse a été perdue ne déclenchent **jamais** de nouvelle
initialisation automatique. TikTok n'offre pas ici de recherche fiable par marqueur
ni de clé d'idempotence cliente ; perdre le journal enlève cette protection.
Contrôlez le profil et l'abandon effectif de la session avec le support avant
qu'un technicien archive uniquement le journal TikTok concerné. Ne saisissez pas
un `publish_id` deviné et ne publiez pas une seconde copie pour « débloquer » la file.

## 8. Tests locaux sans réseau

```bash
cd backend
npm run test:video:social
npm run test:video
```

Les clients HTTP, OAuth et la base sont remplacés par des faux ; les fichiers de
test sont temporaires. Aucun compte, jeton réel, base réelle ou vidéo publiée
n'est nécessaire. Les tests couvrent les reprises, l'idempotence, les droits des
fichiers, les métadonnées, le contrat de lecture existant et l'absence d'effets du
mode à blanc. Ils couvrent aussi PKCE/rotation TikTok, le parsing MP4, les
morceaux FILE_UPLOAD, les statuts et les activations indépendantes. La connexion effective dépendra des comptes configurés par vous.

## Checklist : ce que vous devez me fournir

Renseignez seulement les éléments des plateformes actives.

- [ ] L'identifiant public `UC…` et le nom de la chaîne YouTube attendue.
- [ ] La confirmation que YouTube Data API v3 est activée et que la chaîne permet
      les vidéos de plus de 15 minutes et les miniatures personnalisées si nécessaires.
- [ ] L'identifiant public de l'app Meta, l'identifiant numérique et le nom de la Page,
      la version Graph API retenue et l'URI de retour autorisée.
- [ ] Les permissions effectivement disponibles/accordées, les rôles de votre compte
      et l'état de l'examen Meta s'il est requis.
- [ ] Les plateformes à activer, le Client key public de l'app TikTok, le compte
      cible et le retour loopback exact configuré en Desktop.
- [ ] Login Kit + Content Posting API activés, `video.publish` et `video.upload`
      accordés, comptes Sandbox autorisés, état de l'audit et restrictions comprises.
- [ ] Le chemin de l'extrait vertical TikTok, sa durée, sa légende, sa visibilité
      explicite et ses déclarations marque/partenariat/IA ; aperçu relu localement.
- [ ] Le `TIKTOK_OPEN_ID` recopié localement après connexion et les limites du compte
      vérifiées avant toute publication réelle.
- [ ] Le chemin local du MP4 final et de sa miniature, le code leçon/concours et sa
      langue, le titre, la description, les tags et la visibilité YouTube souhaitée.
- [ ] Les playlists souhaitées par concours/matière, ou l'accord pour leur création.
- [ ] La confirmation du choix de la base cible et du remplissage local de
      `~/.config/fatafalta/config.json`, protégé en 600.
- [ ] Le résultat sans secret des commandes de connexion utilisées et de l'essai à blanc.

**Les secrets client Google/Meta/TikTok et l'URI Mongo doivent être renseignés directement
sur votre machine dans ce fichier externe. Ne me transmettez aucun jeton, secret,
mot de passe ni fichier de configuration complet dans le chat ou le dépôt.**
