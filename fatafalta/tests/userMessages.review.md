# Relecture des messages utilisateur Fatafalta

L’utilitaire `src/utils/userMessages.js` choisit un `{ title, message }` selon l’erreur, le contexte et le registre (`tu` ou `vous`). Ses adaptateurs servent aux alertes et aux messages affichés sur une seule zone. `billing.getErrorMessage` réexporte l’adaptateur central ; les deux fonctions locales qui affichaient des réponses brutes ont été supprimées.

Cas couverts : connexion internet indisponible, délai dépassé, connexion au compte nécessaire, accès réservé, ressource introuvable, erreur temporaire, saisie invalide, conflit, tentatives rapprochées et paiement refusé. Une liste fermée reformule les messages de validation approuvés ; toute autre réponse reçoit un texte maîtrisé. Les erreurs PDF créées localement conservent des consignes spécifiques et les délais dépassés restent identifiables après une nouvelle levée de l’erreur.

Les états de présentation ajoutés servent uniquement à choisir le texte : distinguer une liste vide d’un chargement échoué et conserver les détails nécessaires au choix du message. Les règles métier, requêtes, droits, quotas, paiements, pagination et styles ne sont pas modifiés par cette intervention.

## Fichiers de cette intervention

Cette liste décrit les fichiers édités pendant cette intervention, indépendamment des modifications déjà présentes dans le dépôt.

- `src/utils/userMessages.js`
- `src/services/billing.js`
- `src/services/pdfService.js`
- `src/context/AuthContext.js`
- `src/hooks/useDownload.js`
- `src/hooks/useDrafts.js`
- `src/hooks/useMetadataOptions.js`
- `src/hooks/useWebCheckout.js`
- `src/components/catalog/DynamicMetadataFields.js`
- `src/components/documents/ImageEditorModal.js`
- `src/components/filters/FilterBottomSheet.js`
- `src/components/ui/EmptyState.js`
- `src/components/ui/MetadataSelect.js`
- `src/components/ui/StatusPill.js`
- `src/prep/components/ContestAccordion.js`
- `src/prep/components/RankingScreens.js`
- `src/prep/components/Sheets.js`
- `src/prep/components/useRanking.js`
- `src/prep/screens/ModuleLessonScreens.js`
- `src/prep/screens/PrepHomeScreen.js`
- `src/prep/screens/ProgressScreens.js`
- `src/prep/video/VideoPanel.js`
- `src/screens/AdminDraftsScreen.js`
- `src/screens/AdminTrashScreen.js`
- `src/screens/BulkDownloadScreen.js`
- `src/screens/CatalogManagementScreen.js`
- `src/screens/ContestDocumentsScreen.js`
- `src/screens/ContestTypeSelectionScreen.js`
- `src/screens/CorrectionUploadScreen.js`
- `src/screens/DocumentDetailScreen.js`
- `src/screens/DownloadsScreen.js`
- `src/screens/DynamicCatalogScreen.js`
- `src/screens/EditDraftScreen.js`
- `src/screens/LoginScreen.js`
- `src/screens/ParcoursTypeSelectionScreen.js`
- `src/screens/RegisterScreen.js`
- `src/screens/SearchScreen.js`
- `src/screens/SelectionScreen.js`
- `src/screens/TrainingSessionScreen.js`
- `src/screens/UploadScreen.js`
- `src/screens/account/PromoCodeScreen.js`
- `src/screens/account/SubscriptionScreen.js`
- `src/screens/account/WalletScreen.js`
- `src/screens/account/WithdrawScreen.js`
- `src/screens/admin/PaymentMethodsAdminScreen.js`
- `tests/userMessages.test.cjs`
- `tests/userMessages.review.md`

## Vingt messages avant → après

Les exemples d’échec générique supposent une erreur sans information plus précise ; les cas identifiés reçoivent les textes adaptés. Les libellés de chargement et de statut restent courts dans leurs emplacements existants.

| Avant | Après |
|---|---|
| Erreur de téléchargement + message reçu | Téléchargement interrompu. Réessaie dans quelques instants. |
| Erreur d’ouverture + consigne au vouvoiement | Ouverture du document interrompue. Vérifie qu’une application capable d’ouvrir ce document est installée, puis réessaie. |
| Erreur de partage | Partage du document interrompu. Réessaie dans quelques instants. |
| Erreur + exception pendant le traitement du PDF | Préparation du PDF interrompue. Réessayez dans quelques instants. |
| Erreur PDF décrivant Expo Go et une commande de développement | PDF inaccessible. Sélectionnez à nouveau le fichier depuis les documents de votre appareil. |
| Erreur + message brut lors de l’envoi | Envoi du document interrompu. Réessayez dans quelques instants. |
| Erreur inattendue. Veuillez réessayer. — connexion | Connexion au compte interrompue. Réessayez dans quelques instants. |
| Erreur lors de l’inscription | Création du compte interrompue. Réessayez dans quelques instants. |
| Network Error | Connexion internet indisponible. Vérifie ta connexion internet, puis réessaie. |
| timeout / délai technique reçu | L’attente a été trop longue. Réessaie dans quelques instants. |
| Recherche bientôt disponible / Le service de recherche n’est pas encore disponible sur ce serveur. | Recherche momentanément indisponible. Tu peux parcourir le classement en attendant. Réessaie un peu plus tard. |
| Classement bientôt disponible | Classement momentanément indisponible. Continue ta préparation et réessaie un peu plus tard. |
| Fin des résultats disponibles sur ce serveur. | Tu as atteint la fin du classement. |
| Ton rang se prépare… | Chargement de ton rang… |
| Rang non actualisé | Rang indisponible. Réessaie un peu plus tard. |
| Actualisation impossible · rang précédent | Rang précédent affiché. Réessaie pour l’actualiser. |
| Total non actualisé / Le total affiché provient du dernier classement consulté. | Nombre de participants indisponible. Le nombre affiché provient du dernier classement consulté. Réessaie pour l’actualiser. |
| Les sujets que tu télécharges apparaissent ici et restent consultables sans connexion. | Télécharge un sujet depuis la bibliothèque pour le retrouver ici et le consulter sans connexion. |
| Email invalide — formulaire | Adresse e-mail à vérifier. Corrigez la saisie pour continuer. |
| Code brut pour un statut de paiement inconnu | À vérifier |

## Vérifications réellement exécutées

Dans `fatafalta/` :

```sh
node --test tests/prepRanking.test.cjs
node --test tests/userMessages.test.cjs tests/prepRanking.test.cjs
```

- Classement seul : 10 tests réussis, aucun échec.
- Dernière exécution combinée : 23 tests réussis, aucun échec, aucune omission, environ 464 ms.
- Les 13 nouveaux tests couvrent les cas d’erreur, la non-divulgation des textes techniques, les deux registres, les erreurs PDF locales et la syntaxe des sources avec vérification des références des fonctions de message. Le fichier exclu `prepCore.js` n’est pas lu par cette vérification.
- `git diff --check -- fatafalta/src fatafalta/tests` : aucune erreur signalée.

## Points incertains et périmètre

- Aucun essai sur appareil Android/iOS : les retours à la ligne et les dialogues natifs restent à vérifier visuellement.
- Les messages de validation absents de la liste approuvée deviennent volontairement génériques. Une future extension doit approuver explicitement chaque formulation.
- Les contenus propres au lecteur vidéo tiers ne sont pas couverts par les tests unitaires ; les messages de remplacement de Fatafalta sont maîtrisés.
- Le dépôt comportait déjà des changements, dont `src/prep/shared/prepCore.js` et des fichiers de classement. Ces changements préexistants ont été conservés ; `prepCore.js` n’a pas été modifié par cette intervention.
- Aucune lecture ni modification de `.env` ou de `keys.text`, aucune dépendance ajoutée et aucun commit créé.
