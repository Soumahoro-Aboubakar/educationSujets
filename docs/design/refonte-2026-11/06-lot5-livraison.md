# Lot 5 — Compte

Implémentation du 9 novembre 2026. Rendu uniquement ; validation visuelle sur appareil encore nécessaire.

## Décisions

- Moi : un seul héros d’identité et d’essai. « S’abonner » reste la seule action principale, en or ; « Créer mon compte » devient une pastille compacte centrée. La seconde invitation à créer un compte est supprimée. Essai explicite : « N jours sur 7 utilisés », avec les sept repères conservés. Menus en lignes sur papier, double marge bordeaux et réserve sous la barre d’onglets.
- Connexion / inscription : en-tête nuit et bord de pile communs, feuille à double marge, champs indépendants avec libellé, icône, saisie et erreur annoncée sous le champ. Afficher / masquer le mot de passe reste dans le champ, cible 44 × 48. Bouton PrepButton dans le bas du formulaire, contenu entier défilable et marge de sécurité système. Tutoiement conservé.
- Abonnements : bénéfices et progression en lignes sur nuit ; panneau papier et action or inclus dans le défilement pour le grand texte. L’abonnement du compte garde ses statuts et conditions de paiement, avec détails et historique en lignes. Le bouton de paiement utilise la variante or.
- Portefeuille / retrait : solde héros sur papier, chiffres Playfair en lining et chiffres tabulaires, deux mesures secondaires en tableau, historique et récapitulatif à filets. Formulaire de retrait aligné avec l’authentification ; noms et opérateurs peuvent se répartir sur plusieurs lignes.
- Codes promo : copier reste une action secondaire de 44 pt dans l’en-tête ; « Partager mon code » devient l’action principale lisible dans la feuille. Dépliage immédiat, sans LayoutAnimation.
- Paramètres : en-tête commun sur encre, sections à filets, choix d’au moins 44 pt qui passent à la ligne, sélections bordeaux.
- Aucun mouvement décoratif ajouté. Les entrées décalées des bénéfices et le compteur animé du paywall sont remplacés par un rendu statique ; le succès de retrait est statique. Les boutons utilisent le mécanisme partagé qui respecte Réduire les animations. Aucun coin corné décoratif ajouté.

## Fichiers de ce lot

Dans `fatafalta/src/` :

- `components/account/AccountPresentation.js` (nouveau) : marge de papier, champs et styles des formulaires.
- `components/account/AccountLayout.js` : listes, métriques, défilement et réserve sous les onglets. Son consommateur admin hérite du traitement en lignes.
- `prep/components/MeCard.js`.
- `prep/screens/ExtraScreens.js` : uniquement la présentation de PrepSubscription et ses styles dédiés.
- `screens/LoginScreen.js`, `screens/RegisterScreen.js`, `screens/SettingsScreen.js`.
- `screens/account/AccountScreen.js`, `SubscriptionScreen.js`, `WalletScreen.js`, `WithdrawScreen.js`, `PromoCodeScreen.js`.

Les modifications déjà présentes avant ce lot sont conservées. Aucun changement de dépendance, API, route de navigation, état du store ou logique métier ; fichiers interdits non consultés et non modifiés. Aucun commit.

## Vérifications

- `node --test tests/*.cjs` : **26/26**.
- `EXPO_NO_DOTENV=1 EXPO_OFFLINE=1 npx expo export --platform android --output-dir /tmp/fatafalta-check` : **réussi**.
- Export web complémentaire : réussi ; il ne constitue pas une validation visuelle.
- Analyse JSX et références des 12 fichiers : réussie.
- Comparaison AST avec les instantanés pris au début du lot : 17 fonctions hors JSX identiques, hors retrait explicite de l’animation de dépliage Promo. Validations, authentification, retrait, déconnexion et préférences conservés.
- Contrastes calculés des traitements utilisés : texte secondaire sur papier **6,34:1**, bordeaux sur lavis **8,85:1**, goldInk sur papier **6,07:1**, erreur sur lavis **5,77:1**, texte encre sur bord sombre du bouton or **5,47:1**.
- `git diff --check` : réussi.

## À vérifier à l’écran

Chrome/Playwright s’arrête au lancement dans le sandbox (`Target page, context or browser has been closed`). Aucune capture après modification n’a pu être validée. Les captures fournies montrent seulement des indicateurs de chargement.

À contrôler sur Android / iOS : 390 × 844 et petit écran, texte système à 200 %, clavier ouvert, VoiceOver/TalkBack, Réduire les animations, profil visiteur et abonné, essai terminé, paiements actif / expiré / en attente / indisponible, portefeuille vide / erreur / seuil insuffisant, confirmation et succès de retrait. Vérifier le défilement intégral, les libellés longs, les montants et la fluidité native ; 60 fps non mesurés ici.
