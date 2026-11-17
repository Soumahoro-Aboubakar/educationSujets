# Audit des données serveur et politique de cache

Périmètre : `App.js` et tous les fichiers JavaScript de `src/`. Aucun changement du backend, des assets, des dépendances, de la file persistante ou du moteur de progression de préparation. Les préférences locales, téléchargements locaux et candidats suivis restent dans leurs stores existants.

Les requêtes personnelles incluent l'identité de session ; les classements incluent les identités de préparation et de compte. Une connexion, une inscription ou une déconnexion annule les lectures en vol puis vide le QueryClient. Une placeholder n'est jamais réutilisée entre deux identités. La navigation ne remonte pas pour effectuer ce nettoyage.

## Inventaire des lectures

« Oui, montage » signifie après démontage/remontage ; un écran conservé dans la pile ne remonte pas nécessairement. « Focus » signifie que le retour sur un écran encore monté suffisait à refaire l'appel.

| Donnée / endpoint | Déclencheur | Avant | Après |
|---|---|---|---|
| `/api/catalog/organismes` | SelectionScreen ; logos dans useCatalogue (onboarding, sélecteur, accueil préparation) | Selection : chaque focus ; logos : cache mémoire distinct, sans expiration | Une clé partagée, 1 h ; secours logos sur disque conservé |
| `/api/organismes/:id/parcours-types` | ParcoursTypeSelectionScreen ; DynamicMetadataFields (envoi/édition) | Montage / changement d'organisme, deux lecteurs distincts | Une réponse brute partagée, 1 h ; adaptation des libellés dans le formulaire |
| `/api/catalog/noeuds`, `/api/catalog/matieres` | DynamicCatalogScreen | Chaque focus/changement de profondeur ; cache des niveaux limité à l'instance | Pages globales par branche, 1 h ; retour à une branche connue immédiat |
| `/api/contest-types` | ContestTypeSelectionScreen | Oui, montage | Options partagées, 1 h |
| `/api/orientation/options` | SelectionScreen, useOrientationOptions | 10 min mais refetch forcé au montage de Selection ; hydratation disque écrasant potentiellement le serveur | 1 h ; query désactivée quand le catalogue est utilisé ; hydratation datée et conditionnelle |
| `/api/universities`, `/api/institutions`, `/api/departments`, `/api/levels`, `/api/semesters`, `/api/categories` | SearchScreen via useFilterOptions ; UploadScreen via useMetadataOptions ; CatalogManagementScreen pour institutions | Filtres : 1 h mais hydratation non datée ; métadonnées : chaque montage ; gestion : chaque remontage et sélection | Clé par endpoint partagée entre filtres/formulaires/gestion, 1 h ; secours disque des filtres conservé |
| `/api/organismes` | DynamicMetadataFields | Oui, montage | 1 h, clé distincte du catalogue publié car la réponse diffère |
| `/api/structures/:id` | DynamicMetadataFields | Chaque montage / organisme | 1 h par organisme |
| `/api/noeuds` | DynamicMetadataFields | À chaque changement de chemin et remontage | 1 h par organisme/parent/type |
| `/api/matieres` | DynamicMetadataFields | Chaque montage / organisme | 1 h par organisme |
| `/api/nodes` | TaxonomyPathFields dans CatalogManagementScreen | À chaque changement de chemin et remontage | 1 h par institution/parent/type ; validation du chemin conservée |
| `/api/documents` | SearchScreen, ContestDocumentsScreen, CorrectionUploadScreen | Search : 5 min ; concours : montage et focus en page 1 ; correction : chaque montage/recherche | 5 min, cache paginé ; concours et recherche utilisent le même hook infini ; correction utilise une liste de 100 éléments |
| `/api/documents/:id` | DocumentDetailScreen | 5 min dans le hook, mais refetch forcé à chaque focus | 5 min ; pas de refetch forcé au retour ; invalidation après édition/correction |
| `/api/documents/drafts` | AdminDraftsScreen, EditDraftScreen, UploadScreen via useDrafts | Chaque instance, plus focus AdminDrafts | Pages partagées, 5 min ; suppression dans toutes les pages en cache |
| `/api/documents/trash` | AdminTrashScreen | Chaque focus | 5 min ; retrait immédiat après restauration/suppression |
| `/api/downloads/scope` | BulkDownloadScreen | Chaque montage / cycle | 5 min par périmètre et session ; quota invalidé après attribution de téléchargement |
| `POST /api/downloads/preview` (lecture sans consommation) | BulkDownloadScreen, sélection après 300 ms | Chaque sélection | 15 s par ensemble d'identifiants trié et session ; debounce conservé |
| `/api/training/questions` | TrainingSessionScreen | 5 min, clé propre | 5 min ; clé centrale et session ; réponse marque la liste périmée sans réordonner la session en cours |
| `/api/auth/me` | AuthProvider au démarrage | Une validation au bootstrap, pas à chaque écran ; utilisateur lu depuis stockage | Validation initiale conservée, réponse injectée dans le cache profil ; profil partagé 30 s |
| `/api/me/entitlements` | PrepBridge ; Account, Subscription, PrepSubscription/ExtraScreens ; actions abonnement ; accès documents et téléchargement groupé | 30 s et refetch systématique au premier plan | 30 s ; premier plan seulement si périmé ; polling 5 s uniquement pendant paiement PENDING conservé |
| `/api/me/subscription` | SubscriptionScreen | 30 s et focus app forcé | 30 s, polling PENDING conservé |
| `/api/me/promo-code` | PromoCodeScreen | 30 s et focus app forcé | 30 s |
| `/api/me/wallet` | AccountScreen, WalletScreen, WithdrawScreen | 30 s et focus app forcé | 30 s, cache commun ; invalidation après retrait/annulation |
| `/api/downloads/quota` | useDocumentAccess : DocumentDetailScreen, BulkDownloadScreen | 15 s et focus app forcé | 15 s ; invalidé après réservation de quota |
| `/api/payments/plans` | AccessSheet | 10 min | 30 min |
| `/api/admin/payment-methods` | PaymentMethodsAdminScreen | Chaque focus | 30 s ; cache mis à jour avec retour serveur et rollback si refus |
| `/api/prep/catalogue?page=…` | useCatalogue : onboarding, accueil, sélecteur de concours | Toutes les pages à chaque instance | Un catalogue agrégé partagé, 1 h ; catalogue embarqué immédiatement disponible |
| `/api/prep/programmes/:code/classement` | PrepHomeScreen, ProgressScreen, résultats SessionScreen, RankingScreen, CandidateScreen | Accueil/Progrès/profil : focus ; résultats/classement : montage ; profil effectuait aussi une lecture séparée `limite:1` | Même ressource programme/période/identités, 90 s ; curseurs avant/après et pages accumulées conservés ; le total du profil utilise cette même ressource |
| `/api/prep/programmes/:code/candidats` | Recherche dans RankingScreen | Chaque saisie avec debounce 300 ms, annulée à la sortie | Résultats partagés 90 s par programme/période/recherche/identités ; seuil, debounce et protection des réponses tardives conservés |
| `/api/prep/programmes/:code/candidats/:id` | CandidateScreen, cartes des candidats suivis | Chaque focus du profil ; liste des suivis relue au montage/changement/réessai | Même profil en cache, 90 s ; quatre lectures simultanées maximum |

## Opérations volontairement conservées hors cache de navigation

| Opération | Déclencheur et raison |
|---|---|
| `/api/prep/appareils` | Déclaration de l'appareil au démarrage si aucun jeton ; identité et droits sont persistés par usePrep. Pas une lecture répétée à chaque écran. |
| `/api/prep/rattachement` | Connexion : rattache l'identité appareil au compte. Réponse ignorée si le compte change pendant la requête ; données de classement précédentes supprimées. |
| `/api/prep/progressions` | Bootstrap et AppState actif via pullProgress ; pagination incrémentale jusqu'à dix pages. Préserve les actions locales en attente. Cette synchronisation reste dans le store. |
| `/api/prep/manifest` | Bootstrap, retour app, sélection d'un programme, actualisation de contenu. Déduplication et intervalle existant de 60 s dans contentSync, inchangés. |
| `/api/prep/programmes/:code?revision=…` et `/api/prep/modules/:code?revision=…&version=…` | Téléchargements décidés par le manifeste ; versions et modules occupés par une session protégés. Cache persistant contentRepo inchangé. |
| `/api/prep/videos` | useVideosIndex (accueil, leçons, vidéos concours). Cache Zustand persistant, TTL existant de 5 min, déduplication, secours hors ligne conservés. |
| `POST /api/prep/sync` | Réponses, leçons, sessions, minutes, objectifs, reprises et notions fragiles. File/retry/acquittements inchangés ; un observateur externe invalide seulement les programmes acquittés non refusés. |
| `POST /api/prep/exercices/:code/raisonnement` | Appui explicite dans ReasoningSheet. Résultat de mutation local à la feuille, consommation IA existante conservée ; classement du programme invalidé après résultat disponible. |
| `POST /api/prep/signalements` | Appui explicite dans SessionScreen/ReasoningSheet ; aucun cache de signalements affiché à invalider. |
| `/api/documents/:id/download` | Appui téléchargement/aperçu dans DocumentDetail, Upload, EditDraft, CorrectionUpload. URL signée et contrôle serveur/quota toujours relus, jamais conservés comme un catalogue. |
| `/api/documents/trash/:id/preview` | Appui aperçu corbeille ; URL signée fraîche requise. |
| `POST /api/downloads/bundles` puis `GET filesUrl` | Appui téléchargement groupé ; réserve réellement le quota et délivre des liens signés, donc pas une requête de navigation à dédupliquer. |
| Téléchargement des PDF (FileSystem.createDownloadResumable) | Action explicite, fichiers gérés par useDownloadStore ; aucune modification. |
| `POST /api/auth/login`, `/register`, `/logout` | Actions explicites ; cache annulé/vidé lors du changement de session. |
| `/api/me/entitlements` après connexion dans openAccountPageAfterAuth | Lecture explicite pour ouvrir immédiatement le site d'abonnement après l'authentification. Conservée : contrôle actuel de disponibilité avant action externe, pas un montage d'écran. |
| `POST /api/auth/handoff` | Action explicite d'ouverture du site ; code à usage unique, jamais mis en cache. |
| Création/édition/publication/correction/suppression/restauration de documents | Services documents : invalident listes, brouillons, corbeille, branches/comptages, périmètres et détail concerné ; pas d'invalidation globale. |
| Création de métadonnées et de branches | Mise à jour ciblée du cache de la collection ; institution/structure/nœuds associés invalidés. |
| Retrait/annulation ; retour paiement web | Retrait/annulation : portefeuille uniquement. Retour paiement : ressources du compte et périmètres/aperçus dépendant des droits. Téléchargement : droits et quota uniquement. |
| Favoris, suivi/désuivi de candidats, préférences | Opérations locales et persistées ; aucun endpoint de favoris/suivi serveur trouvé. L'affichage réagit au store ; les profils suivent leurs clés partagées. |

Services exposés mais sans consommateur actif trouvé : `prepApi.rights`, `fetchInstitutionStructure`, `fetchInstitutions` (remplacé dans la gestion par la ressource options commune), `fetchAllFilterOptions`, `fetchFilterOption`, le lecteur `dynamicCatalog.fetchParcoursTypes` (remplacé par le lecteur commun), et les helpers `registerUser/loginUser/getCurrentUser/logoutUser/refreshToken` de `services/auth.js` (AuthContext utilise ses propres opérations). Ils ne provoquent pas de chargement d'écran supplémentaire.

## Durées et présentation

- Défaut : staleTime 5 min, gcTime 24 h, retry 2, refetchOnWindowFocus false.
- Catalogues/options : 1 h ; plans : 30 min ; documents et questions : 5 min ; gcTime 24 h.
- Classements/profils candidats : 90 s ; compte/profil/méthodes de paiement : 30 s ; quotas/aperçus : 15 s ; gcTime 30 min.
- Le cache est en mémoire pour la navigation. Redémarrer le processus peut nécessiter une nouvelle lecture ; les copies hors ligne déjà présentes sont conservées.
- Focus écran : requêtes actives et périmées uniquement, sans annuler une requête déjà partagée ; hooks utilisables aussi hors NavigationContainer (PrepBridge).
- AppState pilote focusManager sur natif ; le navigateur conserve son gestionnaire natif. Aucune lib réseau n'est déclarée : pas d'ajout de dépendance ni de signal online déduit d'une erreur API.
- `placeholderData: keepPreviousData` ou son équivalent protégé par identité est utilisé pour listes filtrées, périodes et périmètres. Les branches hiérarchiques inconnues chargent leurs propres entrées : on ne présente pas les nœuds du parent comme des matières.
- Les RefreshControl forcent une lecture ; leur indicateur est déclenché par l'action utilisateur, pas par le refetch en arrière-plan.

## Vérifications et limites

- Documentation lue avant les modifications : [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/), [React Query en React Native](https://tanstack.com/query/v5/docs/framework/react/react-native), [pagination React Query v5](https://tanstack.com/query/v5/docs/framework/react/guides/paginated-queries).
- Tests Node : suite complète, y compris storePolicy, prepQueue, contentRepo et tests du cache avec de vrais QueryClient/QueryObserver.
- Syntaxe : parseur Babel et transformations CommonJS/JSX, configuration externe désactivée. `babel-preset-expo` n'est pas résolvable dans l'installation actuelle ; aucune installation n'a été effectuée.
- Pas de validation sur simulateur/téléphone ni de mesure réseau avec un compte réel. À vérifier sur appareil : navigation aller-retour, expiration, tirage pour rafraîchir, passage entre comptes, retour de paiement, mode avion et reprise de file.
- Le moteur Zustand conserve volontairement son identité appareil, ses suivis, sa progression et ses documents locaux. Ce changement ne redéfinit pas leur politique de partage sur un appareil ; le cache React Query personnel est isolé et vidé.
