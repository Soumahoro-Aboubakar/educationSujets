# Fatafalta — audit et plan UI/UX

Date : 5 novembre 2026. Périmètre : application Expo `fatafalta/`.

## Références prioritaires

- [Cahier des charges](../cahier-des-charges-mobile-preparation.md), v0.6.
- [Direction artistique et maquettes](../maquettes-ecrans-preparation.md), v0.1, parties A à E.
- `src/theme/brand.js`, identité « La copie d’excellence » et F corné.
- Documentation [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/), lue avant développement conformément à `fatafalta/AGENTS.md`.
- Skill installé consulté : `~/.claude/skills/react-native-best-practices/SKILL.md` et références animations/gestures. Mobile Taste, Mobile Design, Expo Design System et Vercel React Native Skills n’ont pas été trouvés dans le projet ni les répertoires utilisateur de skills. Aucune installation distante implicite.

## État du projet avant intervention

Expo 56, React Native 0.85, React 19 ; React Navigation 7, Reanimated 4.3.1, Gesture Handler 2.31 et Expo Haptics présents. Inter et Lucide déjà embarqués. Le dépôt contient des changements en cours, dont le module Préparation et la suppression du drawer : ils sont conservés. Aucune modification du backend, des sujets publiés, des règles de score, des données de programme ou des droits dans cette intervention UI.

Le design n’est pas à inventer : palette, logo, illustrations vectorielles et typographie sont définis. Les écarts résident surtout dans l’application inégale des règles et dans les contraintes des petits écrans.

## Inventaire des parcours

| Famille | Écrans / composants examinés | Risques à préserver |
|---|---|---|
| Entrée | BrandIntro, Welcome, ContestPicker, reprise | Première ouverture, choix des deux usages, identité appareil |
| Préparation | PrepHome, Module, Lesson, Session et ses 9 renderers | Réponses, seconde chance, scoring, reprise, offline |
| Suivi | Reviews, Progress, Ranking, Candidate | Cahier d’erreurs, échéances et données réelles |
| Programme | MockIntro, ProgramInfo, PrepSubscription, feuilles | Programme actif, droits, abonnement partagé |
| Archives | Selection, ParcoursTypeSelection, DynamicCatalog, ContestDocuments | Taxonomie, retour matériel, cache et paramètres de route |
| Documents | DocumentDetail, BulkDownload, Downloads | Quotas, téléchargement, corrigés, PDF, partage |
| Identité | Login, Register, Account, Settings | Auth, returnTo, préférences et accès invité |
| Paiement | Subscription, Wallet, PromoCode, Withdraw | Montants, solde, redirection web et droits |
| Administration | AdminDrafts, AdminTrash, CatalogManagement, Upload, EditDraft, CorrectionUpload, PaymentMethodsAdmin | Publication, suppression, fichiers et formulaires métier |
| Héritage non monté | OrientationScreen, TrainingSessionScreen, SearchScreen, ContestTypeSelectionScreen, LockedFeatureScreen | Ne pas supprimer ni réintroduire des routes dans une refonte visuelle |

## Défauts établis par lecture du code

### P0 — accès au contenu et aux actions

- Welcome et compte invité utilisent une composition rigide : risque de contenu inaccessible sur petit écran ou avec grande police.
- Plusieurs CTA, lignes et puces imposent une seule ligne, des hauteurs fixes ou n’autorisent pas le rétrécissement du texte.
- Boutons retour/œil/puces souvent inférieurs à 44 points ; certains contrôles n’ont ni nom accessible ni état sélectionné.
- Champs de formulaire avec police `Inter` non chargée sous ce nom, focus peu visible et positionnement fragile du bouton mot de passe.
- Réduction du mouvement incomplète (pressions, squelettes, transitions) ; animations répétées sans nettoyage explicite.

### P1 — cohérence et hiérarchie

- Trois familles de boutons avec hauteurs, rayons et comportements différents.
- Listes d’archives déjà sobres et pertinentes, à conserver ; aligner chevrons, filets et rythme.
- Cartes et fonds Préparation trop systématiques à certains endroits ; réduire la densité en structurant par sections.
- Contraste du texte tertiaire : le jeton décoratif `inkMuted` ne convient pas aux petits textes essentiels sur papier.
- Feuilles modales sans fermeture explicite commune et sans limite de largeur sur tablette.
- États vides/erreur/chargement hétérogènes ; différencier absence de résultat et échec réseau.

### P2 — validation

- Pas de suite de validation visuelle dans le projet.
- Aucun Xcode Simulator ni SDK Android disponible dans cet environnement. Captures Expo web réelles possibles ; ne prouvent ni le rendu natif ni les performances/haptiques natives.
- Dépendances Expo 56/57 mélangées déjà présentes : contrôler la compatibilité sans migration globale non nécessaire.

## Design system retenu avant modification

- Préserver strictement encre `#0D1B32`, papier `#FCFAF5`, bordeaux `#6C2838`, or `#B48A48` et symbole F corné.
- Or réservé à valeur/progression ; texte or clair sur encre et `goldInk` sur papier. Texte tertiaire lisible via un rôle dédié, sans changer la palette historique.
- Inter 400/500/600/700/800 ; ajouter les rôles partagés display 40/44, hero 30/36, reading 17/28 et chiffres tabulaires, conformément aux maquettes.
- Gouttières 20, grille de 4 points, sections 24, contenu lisible centré et plafonné sur tablette.
- CTA primaire 56 minimum, secondaire 52, cibles 44 minimum ; hauteurs extensibles avec la police système. Rayon bouton 16, champ 12, carte 16, feuille 24.
- Séparateurs et contrastes de surface avant ombres. Illustrations SVG existantes, aucun asset bitmap décoratif ajouté.
- Pression 100 ms, faible échelle ; désactiver la transformation en mouvement réduit. Animer une conséquence ; ne pas multiplier les entrées de blocs.
- Focus bordeaux, nom et état accessibles, message d’erreur explicite, conservation du libellé d’action pendant chargement.

## Plan d’implémentation priorisé

1. Créer le skill `fatafalta-premium-mobile` et consolider jetons, mouvement, boutons, champs, états, en-têtes et feuilles partagés.
2. Corriger Welcome/choix concours puis accueil Prépa, leçon/session, révisions/progrès/classement et feuilles ; préserver les données et actions.
3. Corriger compte invité, connexion/inscription, paramètres et listes/fiche sujets ; appliquer la cohérence aux écrans financiers et administratifs via leurs primitives.
4. Exécuter le bundle, contrôles de syntaxe/compatibilité et parcours Expo réels ; capturer 360×800 Android et 390×844 iOS, puis 320×568 et tablette pour stress responsive.
5. Inspecter les images, corriger les défauts visibles, consigner les écrans réellement parcourus et les limites. Les gestes, VoiceOver/TalkBack, clavier natif, safe areas et 60 fps nécessitent encore des appareils natifs.

## Critères d’acceptation par écran

Identité respectée ; titre/action principale identifiables ; aucun débordement horizontal ; contenu/CTA accessible en défilement ; cibles ≥44 ; contrastes lisibles ; états chargement/vide/erreur explicites ; route et interaction préservées ; mouvement réduit respecté ; capture inspectée lorsque le parcours est accessible. Ne déclarer « production validée » qu’après contrôle iOS et Android natif et des états dépendant du serveur.
