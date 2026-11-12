# Audit des chargements et retours d’action

Date : 11 novembre 2026. Comparaison de `src/` et `App.js` avec la copie `scratchpad/baseline` fournie. Le tableau décrit les changements déjà réalisés, complétés par les corrections minimales de cette reprise. Les autres modifications du dépôt ne servent pas de référence.

La documentation [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/) et [FileSystem legacy](https://docs.expo.dev/versions/v56.0.0/sdk/filesystem-legacy/) a été consultée avant modification. L’import `expo-file-system/legacy` est conservé. Une taille attendue de `-1` signifie que le serveur ne fournit pas la taille : aucun pourcentage n’est alors inventé.

## Actions asynchrones

Les chemins ci-dessous sont relatifs à la racine du projet. « Avant » désigne la copie de référence, et non le début de cette reprise.

| Fichier(s) | Action | Avant | Après |
| --- | --- | --- | --- |
| `App.js` | Hydratation et polices au démarrage | Aucun rendu pendant la préparation | Squelettes sur le web ; splash natif conservé. |
| `src/hooks/useAsyncAction.js` | Exécution d’une action | Pas de verrou commun | Verrou immédiat, état d’attente, alerte sur exception non traitée, libération en `finally`, garde au démontage. |
| `src/components/ui/FeedbackPressable.js` | Appui retournant une promesse | Contrôles natifs sans suivi automatique | Contrôle désactivé pendant la promesse, indicateur thématique, état accessible occupé. Les actions synchrones terminent immédiatement. |
| `src/prep/ui/primitives.js` | Actions des boutons et cartes | Animation d’appui ; attente surtout pilotée par chaque écran | Suivi des promesses et verrou ; le bouton garde ses dimensions pendant son spinner ; mouvement réduit respecté. |
| `src/components/account/AccountLayout.js`, `src/components/ui/ListRow.js`, `ScreenHeader.js`, `src/components/documents/DocumentCard.js` | Action d’une ligne, d’une carte ou d’une icône | Pas de suivi uniforme | Indicateur à la place du chevron ou sur le contrôle ; désactivation selon l’action. |
| `src/hooks/useDownload.js` | Demande d’URL puis téléchargement | État React, sans verrou synchrone | Verrou pendant toute l’opération ; refus d’accès toujours transmis à la feuille existante ; actualisation du quota conservée. |
| `src/store/useDownloadStore.js` | Transfert du fichier | Division directe des octets, URI acceptée sans vérifier le statut HTTP | Progression bornée entre 0 et 1 ; taille inconnue représentée par `null` ; seuls les statuts 2xx enregistrent un succès ; état actif retiré sur échec. |
| `src/screens/DocumentDetailScreen.js` | Télécharger sujet ou corrigé | Barre et libellé du sujet ; attente du corrigé peu explicite | Boutons désactivés, barre et pourcentage ; texte du sujet affiché hors du bouton pour rester visible sous spinner ; texte sans pourcentage si taille inconnue. |
| `src/components/documents/DocumentList.js`, `DocumentCard.js` | Suivi d’un téléchargement dans la liste | Transmission numérique par défaut | Taille inconnue conservée ; barre seulement si la progression est mesurable. |
| `src/hooks/useDownload.js`, `src/screens/DownloadsScreen.js` | Ouvrir ou partager un fichier local | Pas de verrou commun entre ouverture et partage | Actions coordonnées et boutons désactivés pendant l’ouverture du lecteur ou de la feuille de partage ; alertes existantes conservées. |
| `src/screens/DownloadsScreen.js` | Supprimer une copie locale | Suppression après confirmation sans attente visible | Verrou et indicateur sur le fichier concerné ; erreur capturée par le mécanisme commun. |
| `src/screens/BulkDownloadScreen.js` | Vérifier la sélection et télécharger un lot | Récapitulatif serveur et progression par nombre de fichiers déjà présents | Fonctionnement conservé ; retour d’appui commun ; vérification remise au repos quand la sélection devient vide. |
| `src/hooks/useDocumentAccess.js` | Exécuter une action autorisée | Promesse de l’action perdue | Promesse retournée pour permettre au bouton de suivre l’attente. |
| `src/hooks/useWebCheckout.js` | Ouvrir le paiement web | Drapeau React | Verrou immédiat et état d’ouverture ; actualisation du compte conservée en sortie. |
| `src/screens/LoginScreen.js`, `RegisterScreen.js` | Connexion et inscription | Texte du bouton changé pendant l’attente | Libellé stable, attente et désactivation dans le bouton commun ; validation et authentification conservées. |
| `src/screens/account/AccountScreen.js` | Chargement du compte, déconnexion | Pas de squelette spécifique à l’attente d’authentification ; sortie sans verrou local | Squelette puis contenu ; déconnexion verrouillée après confirmation. |
| `src/screens/account/PromoCodeScreen.js` | Copier et partager un code | Erreur de partage ignorée | Promesse suivie par les contrôles communs ; erreur de partage remontée. |
| `src/screens/account/WalletScreen.js` | Annuler un retrait | Confirmation puis requête sans verrou local | Verrou partagé entre annulations et attente sur la ligne concernée. |
| `src/screens/account/WithdrawScreen.js` | Charger les règles du portefeuille | Formulaire visible avant réception | Squelette ou erreur avec réessai avant le formulaire ; calcul et envoi du retrait conservés. |
| `src/screens/admin/PaymentMethodsAdminScreen.js` | Charger ou activer un moyen de paiement | Spinner initial et désactivation du seul interrupteur concerné | Squelette initial ; verrou entre mutations ; retour arrière existant en cas de refus conservé. |
| `src/screens/AdminDraftsScreen.js` | Charger et supprimer des brouillons | Liste initialement vide ; suppression sans verrou partagé | Squelettes et attente sur la suppression concernée après confirmation. |
| `src/screens/AdminTrashScreen.js` | Charger, restaurer ou supprimer définitivement | Liste initialement vide et actions sans verrou partagé | Squelettes ; verrou commun aux mutations ; indicateurs sur le document concerné. |
| `src/screens/EditDraftScreen.js` | Charger, prévisualiser, enregistrer ou publier un brouillon | Formulaire incomplet possible avant réception ; état local d’envoi | Squelette ou erreur avec réessai ; aperçu en squelette ; verrou partagé entre sauvegarde et publication. Le réessai appelle `loadDrafts()` sans événement tactile en argument. |
| `src/screens/CatalogManagementScreen.js`, `ContestTypeSelectionScreen.js` | Charger les options du catalogue | Spinners initiaux | Squelettes ; la gestion conserve les institutions déjà chargées lors d’une nouvelle lecture. |
| `src/components/catalog/DynamicMetadataFields.js`, `TaxonomyPathFields.js`, `src/components/ui/MetadataSelect.js` | Charger les organismes, structures et niveaux | Attente partiellement exposée | Sélecteurs occupés et désactivés durant leur chargement ; états libérés en sortie, y compris après retrait de l’organisme. |
| `src/screens/TrainingSessionScreen.js` | Préparer l’entraînement | Spinner | Squelettes avec le texte de préparation existant. |
| `src/screens/UploadScreen.js` | Choisir un fichier ou des images, créer un PDF | Choix concurrents possibles ; génération sans pourcentage visible | Verrou commun des tâches de fichiers ; attente du traitement différé Android ; progression de génération issue du service existant. |
| `src/screens/UploadScreen.js`, `src/services/documents.js` | Envoyer un PDF ou un lot, enregistrer et publier | États d’envoi et compteur de fichiers | Verrou commun sauvegarde/publication ; progression d’envoi si la taille est disponible ; finalisation distinguée ; progression par fichier du lot. |
| `src/screens/CorrectionUploadScreen.js`, `src/services/documents.js` | Choisir, créer puis associer un corrigé | États locaux de traitement et d’envoi | Verrou des tâches de fichiers ; progression PDF et transfert ; choix et association désactivés pendant les tâches incompatibles. |
| `src/components/documents/ImageEditorModal.js` | Pivoter, retourner et recadrer | État local occupé | Verrou synchrone commun aux transformations ; contrôles désactivés pendant l’opération. |
| `src/hooks/useCorrectionPromptPreference.js`, `src/services/cache.js` | Enregistrer la préférence de proposition du corrigé | Écriture optimiste, erreur de cache ignorée | Écriture suivie, contrôle occupé, retour arrière et alerte en cas d’échec ; les autres usages du cache restent tolérants. |
| `src/context/PreferencesContext.js` | Persister les préférences | Écritures potentiellement concurrentes | Écritures ordonnées et retour arrière par clé si l’écriture échoue. |
| `src/theme/ThemeProvider.js`, `src/screens/SettingsScreen.js` | Changer le thème et réessayer sa sauvegarde | Application immédiate avec message d’échec | Application immédiate et retour arrière sur échec ; le réessai conserve maintenant le thème demandé, même après ce retour arrière. |
| `src/screens/SettingsScreen.js` | Enregistrer les options PDF et rejouer l’accueil | Échecs d’écriture PDF ignorés | Options prêtes avant édition, verrou et retour arrière ; erreur visible ; bouton de reprise de l’accueil suivi par le contrôle commun. |
| `src/prep/screens/PrepHomeScreen.js` | Rafraîchir l’accueil | Fin d’attente uniquement après succès | Remise au repos en `finally`, y compris si une promesse échoue. |
| `src/prep/components/RankingScreens.js` | Charger le classement et chercher un candidat | Spinner et rafraîchissement de recherche toujours déclaré inactif | Squelettes ; état de rafraîchissement lié à la recherche en cours ; pagination et protection des réponses obsolètes conservées. |
| `src/prep/components/Sheets.js`, `src/prep/screens/SessionScreen.js` | Signaler un exercice ou contester un verdict | Envoi détaché, erreurs ignorées, fermeture immédiate | Promesse suivie ; alerte en cas d’erreur ; fermeture du signalement après succès. |
| `src/prep/video/VideoPanel.js` | Réessayer le chargement des vidéos | Promesse non retournée | Promesse retournée au contrôle ; état du lecteur existant conservé. |

## Corrections limitées à cette reprise

- Rendre le pourcentage du sujet visible malgré le spinner du bouton ; traiter honnêtement les tailles inconnues dans la fiche et les listes.
- Borner la progression du store et refuser de considérer un fichier de réponse HTTP en erreur comme un téléchargement réussi.
- Réinitialiser la vérification d’un lot devenu vide et l’attente de structure si l’organisme est retiré.
- Corriger l’argument du réessai des brouillons et conserver le thème demandé lors du réessai de sauvegarde.
- Actualiser uniquement le module simulé de `tests/adaptivity.test.cjs`, devenu nécessaire avec l’adaptateur d’appui déjà ajouté. Le test du contrat de tri est inchangé.

## Cas volontairement conservés

- Les navigations, filtres, accordéons, sélections d’exercice et commandes locales restent synchrones. Leur remplacement par l’adaptateur d’appui ne justifie pas de délai artificiel ni de spinner persistant.
- Le téléchargement groupé conserve sa progression par nombre de fichiers terminés, déjà déterminée. Pas de refonte en progression globale pondérée par octets.
- Les sélecteurs système, lecteurs de fichiers et feuilles de partage utilisent une attente indéterminée : ces API n’exposent pas de progression exploitable.
- Les échanges de quota, droits d’accès, abonnement, publication et paiement gardent leurs endpoints et décisions serveur. Les confirmations de suppression existantes restent en place.
- Le splash natif, les animations d’introduction, les gestes et les transitions existantes sont conservés. Les boutons de préparation et les barres utilisent déjà la préférence de mouvement réduit.
- Le cache reste facultatif sauf pour la préférence explicitement enregistrée ; aucune migration de stockage ni nouvelle dépendance.
- Les couleurs du retour d’action passent par `brand` ou `theme.colors`. Aucune nouvelle couleur littérale détectée dans le diff de chargement ; pas de refonte des palettes préexistantes.
- `.env`, `app.json`, `package.json`, `ios/` et `android/` ne sont pas modifiés par cette reprise.

## Vérifications et risques

- Les 35 tests existants passent avec `node --test tests/*.test.cjs`.
- Analyse Babel des 152 fichiers JavaScript de `src/` et `App.js` : syntaxe valide ; aucune nouvelle référence globale non résolue ni nouvelle liaison inutilisée au niveau module par rapport à la copie fournie. Revue des hooks ajoutés : aucun appel conditionnel identifié.
- Vérification ciblée en mémoire avec frontières natives simulées : double appui avant rendu, libération après succès et exceptions synchrones/asynchrones ; progression à 50 %, bornage à 100 %, taille inconnue ; remise au repos après erreur réseau et refus HTTP.
- Export web réussi : `EXPO_NO_DOTENV=1 npx expo export --platform web --output-dir /tmp/fatafalta-loading-audit`. Cet export valide le graphe d’imports web, sans prouver le comportement natif ni la connexion au serveur.
- Aucune session sur appareil Android/iOS ni requête réelle d’envoi ou de paiement effectuée. Restent à vérifier sur appareil : téléchargement interrompu, ouverture/partage, refus de permission, génération de gros PDF, contraste et lecteurs d’écran.
- Une promesse native qui ne se résout jamais peut maintenir son bouton occupé : les verrous se libèrent quand la promesse termine, sans délai artificiel qui autoriserait une seconde opération encore en cours. Le transfert FileSystem ne reçoit pas ici de mécanisme d’annulation supplémentaire.
- Le store de téléchargement conserve son architecture existante : métadonnées mises en mémoire avant leur écriture disque, écritures non transactionnelles, absence de reprise après fermeture forcée. Une erreur disque ou plusieurs téléchargements lancés depuis des instances distinctes restent des risques préexistants ; pas de refonte de concurrence dans cet audit.
- Les pourcentages d’envoi suivent les octets transmis, pas le traitement serveur. Le message de finalisation reste donc nécessaire après 100 %. Sans taille disponible, seul l’indicateur d’attente est pertinent.
