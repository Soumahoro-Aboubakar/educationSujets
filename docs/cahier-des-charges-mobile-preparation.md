# Cahier des charges — Fatafalta mobile : module « Préparation aux concours »

> **Statut** : brainstorming validé, cadrage en cours — **version 0.6 du 2026-11-05**.
> **Périmètre** : application mobile `fatafalta/` (Expo / React Native) et API `backend/` (Node / MongoDB).
> Ce document fait foi pour la conception. Toute évolution y est consignée (journal en fin de document).

---

## 0. Consignes impératives pour les assistants IA et les développeurs

1. **Concours pilotes — à demander avant de développer.** Les concours et cycles du lancement
   (programme pilote) ne sont **pas encore fixés**. Avant de commencer le développement d'une
   fonctionnalité qui dépend d'un programme (génération de contenu, données de démonstration,
   seuils, concours blanc, classement…), l'assistant IA **doit demander au propriétaire de préciser
   les concours pilotes** et ne doit en choisir aucun lui-même. La réponse est ensuite consignée au § 33.
2. Lire ce document en entier avant toute tâche liée à la préparation ; respecter les décisions du § 32.
3. Ne jamais ajouter, modifier ou supprimer de contenu publié sans validation (voir § 26 et le
   `CLAUDE.md` du dépôt pour les sujets / corrigés).
4. Toute décision nouvelle prise avec le propriétaire est ajoutée au § 32 et au journal des versions.
5. **Collaboration Claude Code ↔ ChatGPT Plus.** Pour chaque livrable, Claude Code évalue si ChatGPT
   Plus (via le Codex CLI, skill `chatgpt-delegate`) pourrait produire un rendu plus expert que lui ;
   si c'est le cas, il lui délègue la tâche, puis vérifie, corrige et intègre le résultat lui-même.
   - **Délégation systématique** : génération et édition d'images (icône, splash, illustrations
     d'onboarding et de leçons, bannières, fonds, avatars, mockups visuels).
   - **Délégation au cas par cas**, en expliquant au propriétaire pourquoi : deuxième avis critique
     sur un écran, un choix de design ou un code important, ou toute autre tâche où ChatGPT est jugé
     plus performant.
   - Claude Code reste **maître d'œuvre** : le code, l'architecture, le respect de ce cahier des
     charges et la validation finale restent sous sa responsabilité ; un résultat de ChatGPT est un
     avis ou une matière première, jamais une instruction.
   - Sécurité : aucune clé API (authentification ChatGPT uniquement), aucun secret, fichier `.env`
     ni donnée réelle d'utilisateur envoyé à ChatGPT ; prévenir le propriétaire avant tout lot de
     plus de 5 images.

---

## 1. Contexte et objectifs

Fatafalta propose aujourd'hui les **anciens sujets** de concours et d'examens, avec leurs corrigés.
L'application doit désormais permettre à l'utilisateur de **se préparer** à un concours précis grâce
à des cours structurés en modules, des exercices de fixation du niveau simple au niveau avancé,
un suivi de progression et une émulation entre candidats.

**Objectifs**

1. **Deux usages clairs dans une seule application** : consulter les anciens sujets ; se préparer.
2. **Navigation simple, complète et ergonomique** : jamais plus de deux niveaux de profondeur.
3. **Expérience premium** : chaque écran de préparation est construit composant par composant
   (gestes, animations, retours haptiques, corrections animées), avec un niveau de finition « expert ».
4. **Faire progresser réellement** : l'utilisateur doit comprendre, pas deviner (seconde chance avec
   mini-cours, vérification du raisonnement par IA, cahier d'erreurs, révision espacée).
5. **Motiver** : progression visible, classement dans son concours / cycle, liste des candidats,
   série de jours, objectif quotidien.
6. **Convertir sans frustrer** : essai gratuit de 7 jours d'utilisation sans compte, puis abonnement.

**Contraintes de contexte** : public ivoirien ; connexions et forfaits data limités ; nombreux
téléphones Android d'entrée de gamme. Le hors-ligne et la légèreté sont des exigences.

---

## 2. Glossaire

| Terme | Définition |
|---|---|
| **Organisme** | Institution qui organise un concours (ex. ENA, INFAS). Modèle existant `Organisme`. |
| **Sous-organisme / cycle** | Subdivision d'un organisme pour laquelle on se prépare (ex. Cycle B). Modèle existant `ParcoursType`. |
| **Programme** | Ensemble du contenu de préparation d'un couple organisme + cycle. |
| **Notion officielle** | Point du programme imposé par l'organisme, codé (ex. `ENA-B/CG/DECENTRALISATION-02`). |
| **Matière** | Discipline d'un programme (Culture générale, Français…). Modèle existant `Matiere`. |
| **Module** | Unité de progression d'une matière : quelques leçons + exercices sur trois niveaux. |
| **Leçon** | Cours interactif composé de blocs (texte, encadrés, schémas, mini-questions). |
| **Exercice** | Question interactive d'un type donné (§ 11), rattachée à un module, une leçon éventuelle, un niveau et des notions. |
| **Niveau** | 1 Application · 2 Entraînement · 3 Approfondissement (compréhension avancée). |
| **Session** | Suite d'exercices jouée d'affilée (niveau d'un module, révision, concours blanc, test). |
| **Tentative** | Une réponse vérifiée à un exercice (1re tentative ou seconde chance). |
| **Seconde chance** | Nouvel essai proposé après une erreur, précédé d'un mini-cours. |
| **Mini-cours** | Rappel bref de la notion, affiché en fenêtre modale après une mauvaise réponse. |
| **Cahier d'erreurs** | Liste personnelle des questions ratées après la seconde chance. |
| **Révision espacée** | Retour planifié des notions fragiles (J+1, J+3, J+7, J+14). |
| **Jour d'interaction** | Jour calendaire au cours duquel l'utilisateur a effectué au moins une action de préparation (§ 25.3). |
| **Essai** | Droit gratuit de 7 jours d'interaction, sans IA hors 3 vérifications offertes. |
| **Identité appareil** | Identité attribuée automatiquement à l'utilisateur sans compte (§ 25.1). |
| **Score de classement** | Indicateur calculé par le serveur pour ordonner les candidats d'un cycle (§ 20.4). |

---

## 3. Constat sur l'existant (analyse du 2026-11-05)

| Point | Constat | Conséquence |
|---|---|---|
| Navigation | Stack racine + Drawer + Onglets (Explorer, Téléchargements, Compte, Admin) | Le drawer duplique les onglets : deux modèles mentaux. **Il est supprimé.** |
| Orientation | Toujours affichée au démarrage (logique `hasCompletedOrientation` commentée dans `RootNavigator.js`) | À rétablir : affichage à la première ouverture seulement |
| Parcours sujets | Organisme → Type de parcours → Catalogue → Documents → Fiche : 5 à 6 niveaux | On n'y greffe pas la préparation : onglet distinct |
| Entraînement | `TrainingSelection` / `TrainingSession` existent mais aucun écran n'y mène ; `TrainingQuestion` = QCM liés à `Category`, sans module ni niveau ; progression non enregistrée | Base réutilisable, à étendre |
| Abonnement | `Subscription` (un par utilisateur, accès jusqu'à `currentPeriodEnd`), hook `useEntitlements`, quota de téléchargements gratuits | **Même abonnement** pour la préparation (décision § 32) |

---

## 4. Profils et droits

| Capacité | Visiteur en essai (sans compte) | Essai épuisé (sans compte) | Abonné (compte) | Abonnement expiré | Administrateur |
|---|---|---|---|---|---|
| Anciens sujets | Règles existantes **inchangées** (§ 8.1) | Idem | Tous les sujets (§ 8.1) | Idem gratuit | Illimité |
| Leçons, exercices des 3 niveaux | ✅ | 🔒 | ✅ | 🔒 | ✅ |
| Seconde chance, mini-cours, cahier d'erreurs, révisions | ✅ | Consultation seule | ✅ | Consultation seule | ✅ |
| Concours blanc, test de positionnement | ✅ | 🔒 | ✅ | 🔒 | ✅ |
| Vérification IA du raisonnement | **3 au total** | 🔒 | ✅ (quota abonné) | 🔒 | ✅ |
| Classement, liste des candidats | ✅ (sous identité automatique) | Consultation, stats figées | ✅ | Consultation, stats figées | ✅ |
| Modifier son identité (pseudonyme, avatar) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Packs hors ligne | ✅ | 🔒 | ✅ | 🔒 | ✅ |
| Production et relecture de contenu | ❌ | ❌ | ❌ | ❌ | ✅ |

« 🔒 » = l'élément reste visible, son appui ouvre l'écran d'abonnement (§ 25.7).
Aucune donnée n'est jamais supprimée lors d'un passage d'un profil à un autre.

---

## 4 bis. Parcours utilisateur de bout en bout

Ces scénarios décrivent l'expérience complète, écran par écran ; chaque étape renvoie à la section
qui la détaille.

### Scénario A — Awa, nouvelle candidate, découvre la préparation (essai)

1. Awa installe l'application. Animation d'intro de la marque, puis l'écran **« Que veux-tu faire ? »** (§ 6.1).
   En arrière-plan, l'application lui crée une identité automatique « Baobab-4821 » et l'enregistre
   sur le serveur (§ 25.1). Aucun formulaire, aucun compte.
2. Elle touche **« Me préparer à un concours »** → écran **« Quel concours ? »** : seuls les organismes
   s'affichent. Elle touche **ENA** : le menu se déplie avec animation et révèle *Cycle A, Cycle B…* (§ 6.2).
   Elle choisit **Cycle B** (coche animée, vibration légère).
3. Elle arrive sur l'onglet **Prépa** (§ 7.1). On lui propose le **test de positionnement** (§ 16) ; elle
   répond « Plus tard ». On lui demande son **objectif quotidien** : 10 minutes (§ 18).
4. Elle ouvre **Culture générale › Module 1 › Leçon 1** (§ 7.2, § 9). **C'est sa première action de
   préparation : son 1er jour d'essai est consommé** (§ 25.3). Bandeau : « Essai : 6 jours restants ».
5. En lisant, elle répond à une mini-question intégrée. En fin de leçon, elle touche **« Passer aux
   exercices »** → session de **niveau 1** (§ 10).
6. Question « Glisser pour compléter » : elle place les étiquettes, touche **Vérifier** → juste.
   La question est marquée « raisonnement » : elle choisit **« Expliquer mon raisonnement »**, écrit sa
   démarche ; l'IA répond « Bien raisonné » (§ 13). Compteur : « 2 vérifications offertes restantes ».
7. Question suivante, QCM : elle se trompe → fenêtre **Mini-cours** (§ 12) → **Réessayer** → propositions
   re-mélangées → juste en seconde chance (50 % des points).
8. Question « Remettre dans l'ordre » : faux, puis encore faux en seconde chance → correction détaillée →
   la question entre dans son **cahier d'erreurs** (§ 14) et en **révision espacée** (§ 15).
9. Bilan de session : 8 / 10, 1 erreur ajoutée au cahier. Elle consulte l'onglet **Progrès** :
   **« Tu es 40ᵉ sur 50 · ENA Cycle B »** (§ 20). Elle ouvre la liste des candidats et touche le
   1er : 1 240 questions, 14 modules validés, 86 erreurs, 94 % de réussite.
10. Elle ferme l'app et revient **trois semaines plus tard** : il lui reste toujours **6 jours d'essai**,
    car elle n'a pas étudié entre-temps. La carte « À réviser aujourd'hui » lui propose sa question ratée.

### Scénario B — Awa épuise son essai et s'abonne

1. Le 5ᵉ jour d'interaction, le bandeau passe en alerte : « Essai : 2 jours restants » + notification (§ 21).
2. Le 7ᵉ jour, elle peut finir sa journée. Le lendemain, les leçons et sessions affichent 🔒 ; sa
   progression, son cahier d'erreurs et son rang restent consultables (§ 25.7).
3. Elle touche un module verrouillé → **écran Abonnement** (§ 24) : « 3 modules validés · 38ᵉ sur 50 ·
   212 questions ». Elle choisit la formule (la même que pour les anciens sujets) et un moyen de paiement.
4. On lui demande alors de **créer son compte** ; son identité appareil et **toutes ses données déjà
   présentes sur le serveur** sont rattachées au compte (§ 25.5). Elle garde « Baobab-4821 », son rang,
   son historique.
5. Elle peut maintenant **modifier son pseudonyme et son avatar** (§ 25.6), utiliser l'IA sans limite
   d'essai (quota abonné), et **accéder à tous les anciens sujets** selon les règles abonné (§ 8.1).

### Scénario C — Tentative de contournement par réinstallation

1. Koffi a utilisé 7 jours d'essai et ses 3 vérifications IA. Il désinstalle puis réinstalle l'application.
2. Au lancement, l'application retrouve son identifiant (Trousseau iOS / identifiant Android), interroge
   le registre d'essais du serveur et l'attestation de la plateforme (§ 25.4).
3. Message : « Bon retour ! Ton essai gratuit est terminé. » Ses données et son rang sont restaurés ;
   la préparation reste verrouillée jusqu'à l'abonnement.
4. Variante : il lui restait 3 jours → « Bon retour ! Il te reste 3 jours d'essai et 1 vérification IA. »

### Scénario D — Mariam ne veut que les anciens sujets

1. Au premier lancement, elle choisit **« Consulter les anciens sujets »** → onglet **Sujets** (§ 8).
2. Les règles d'accès actuelles s'appliquent sans changement (§ 8.1). Aucun jour d'essai n'est consommé
   tant qu'elle ne fait pas d'action de préparation.
3. L'onglet Prépa reste disponible : si elle l'ouvre, il l'invite à choisir un concours (§ 6.2).

### Scénario E — Abonné qui révise hors connexion

1. Jean télécharge le pack du Module 4 en Wi-Fi (§ 22).
2. Dans un car sans réseau, il lit les leçons et fait les sessions ; seconde chance et mini-cours
   fonctionnent ; le bouton IA indique « Disponible avec une connexion » et affiche le raisonnement
   de référence (non décompté).
3. Au retour du réseau, ses tentatives sont envoyées ; le serveur recalcule ses scores et son rang.

---

## 5. Architecture de navigation

### 5.1 Principe

**4 onglets, aucun drawer. Profondeur maximale : Onglet → Écran intermédiaire → Écran plein (lecteur).**

```
┌──────────┬──────────┬──────────┬──────────┐
│  Prépa   │  Sujets  │ Progrès  │   Moi    │
└──────────┴──────────┴──────────┴──────────┘
```

| Onglet | Rôle | Contenu |
|---|---|---|
| **Prépa** | Se préparer | Parcours du concours / cycle suivi : modules, leçons, exercices, révisions, concours blanc |
| **Sujets** | Anciens sujets | L'actuel « Explorer », inchangé, + filtres reçus depuis un module |
| **Progrès** | Se situer | Statistiques personnelles, rang, classement, liste des candidats |
| **Moi** | Compte et réglages | Identité, essai / abonnement, téléchargements, paramètres (dont réglages PDF de l'ancien drawer), administration |

L'onglet d'ouverture par défaut dépend du choix fait au premier lancement (§ 6.1).
Une pastille discrète sur l'onglet Prépa signale les révisions du jour.

### 5.2 Arborescence cible

```
Premier lancement
 ├─ « Que veux-tu faire ? »
 └─ « Quel concours ? » (accordéon organismes → cycles)

Onglets
 ├─ Prépa ─┬─ Module ─┬─ Leçon (plein écran)
 │         │          └─ Session d'exercices (plein écran)
 │         ├─ Révisions du jour / Cahier d'erreurs ── Session de révision
 │         ├─ Concours blanc ── Session chronométrée ── Bilan
 │         └─ Test de positionnement ── Bilan
 ├─ Sujets ── parcours existant
 ├─ Progrès ─┬─ Classement du cycle
 │           └─ Profil de statistiques d'un candidat
 └─ Moi ──── Identité · Essai / Abonnement · Téléchargements · Paramètres · Admin

Écrans transverses (modaux) : Abonnement · Changer de concours (feuille du bas) · Mini-cours · Raisonnement IA
```

### 5.3 Règles de navigation

- Tout retour se fait en **un seul geste « Retour »** vers l'écran parent.
- Les lecteurs plein écran (leçon, session) masquent la barre d'onglets ; les quitter en cours
  demande confirmation et **sauvegarde** l'état (reprise exacte).
- Les liens profonds existants (`sujets/document/:documentId`) restent valides.
- Changer d'onglet conserve la position de chaque onglet.

---

## 6. Premier lancement

### 6.1 Écran 1 — « Que veux-tu faire ? »

Deux grandes cartes illustrées, plein écran, sans défilement :

- **Me préparer à un concours** — « Cours, exercices et suivi de ta progression » → écran 2.
- **Consulter les anciens sujets** — « Sujets et corrigés des concours passés » → onglet Sujets.

Règles :
- Le choix **ne verrouille rien** : il définit l'onglet d'ouverture et, pour la préparation, le concours suivi.
- Il est enregistré localement (`hasCompletedOrientation`, `selectedContentType`) ; l'écran ne
  réapparaît plus ensuite (réactivable dans Moi › Paramètres).
- L'**identité automatique** (§ 25.1) est créée silencieusement à ce moment.

### 6.2 Écran 2 — « Quel concours ? » (accordéon animé)

**Affichage initial** : uniquement la liste des **organismes** (logo, nom, nombre de cycles
disponibles en préparation). Aucune sous-option visible.

**Dépliage** — à l'appui sur un organisme, un menu déroulant animé révèle ses **sous-organismes (cycles)** :
- hauteur animée (Reanimated, ressort amorti, ~280 ms) ;
- chevron qui pivote de 0° à 90° ;
- apparition échelonnée des cycles (décalage 30–40 ms, fondu + légère translation verticale) ;
- léger retour haptique ;
- l'organisme ouvert est amené dans la zone visible par un défilement doux ;
- **un seul organisme ouvert à la fois** : en ouvrir un referme le précédent (animations simultanées).

**Sélection** : l'appui sur un cycle affiche une coche animée, déclenche un retour haptique de succès,
puis mène à l'onglet **Prépa** (avec proposition du test de positionnement, § 16).

**Cas particuliers** :
- Organisme sans cycle : il se sélectionne directement (chevron remplacé par une flèche).
- Cycle sans programme publié : affiché grisé avec « Bientôt disponible », non sélectionnable ;
  possibilité de « Me prévenir » (notification à la publication).
- Recherche affichée au-delà de 6 organismes ; elle porte aussi sur les cycles et ouvre
  automatiquement l'organisme correspondant en surlignant le cycle trouvé.
- États : chargement (squelettes), erreur réseau (réessayer ; liste en cache affichée si disponible),
  liste vide.
- Accessibilité : chaque organisme expose l'état `expanded`/`collapsed` aux lecteurs d'écran.

**Changer de concours plus tard** : depuis l'en-tête de Prépa, une feuille du bas reprend le même
accordéon. La progression de chaque programme est conservée séparément ; le classement affiché
est celui du programme actif.

---

## 7. Onglet Prépa

### 7.1 Écran principal (tout sur un écran)

```
┌───────────────────────────────┐
│ ENA · Cycle B  ▾        🔥 6  │ ← changer de concours · série de jours
│ ████████░░░░  42 % du parcours│
│ Objectif du jour : 7 / 10 min │
│ Essai : 4 jours restants  ›   │ ← visiteur uniquement
├───────────────────────────────┤
│ ▶ CONTINUER                   │
│   Culture G. · Module 3       │
│   Leçon 2 : La décentralisation│
├───────────────────────────────┤
│ 🔁 À réviser aujourd'hui (12) │
├───────────────────────────────┤
│ 40ᵉ sur 50 · ▲3 cette semaine │ ← lien vers Progrès
├───────────────────────────────┤
│ [Culture G.] [Français] [Maths]│ ← puces de matières (filtre, pas d'écran)
├───────────────────────────────┤
│ ✅ Module 1 · Institutions 100%│
│ ◐  Module 3 · Décentral.   40%│
│ ○  Module 4 · Économie        │  « conseillé après M3 »
├───────────────────────────────┤
│ ⏱ Concours blanc              │
│ 🎯 Test de positionnement      │ ← tant qu'il n'est pas fait
└───────────────────────────────┘
```

Détail des éléments :
- **En-tête** : programme actif (appui → feuille « Changer de concours »), série de jours,
  progression globale (part des modules validés), objectif du jour (minutes étudiées / objectif).
- **Bandeau d'essai** (visiteur) : jours d'interaction restants et vérifications IA restantes ;
  appui → écran Abonnement. Passe en couleur d'alerte à 2 jours restants.
- **Continuer** : reprend exactement la dernière activité (leçon à la position de lecture ou
  session à la question en cours). Masqué si rien n'a commencé ; remplacé par « Commencer le module 1 ».
- **À réviser aujourd'hui** : nombre de révisions espacées dues + éléments du cahier d'erreurs
  (§ 14, § 15). Appui → session de révision. Masqué si zéro (« Tout est à jour ✓ »).
- **Rang** : rappel compact du classement (§ 20). Appui → onglet Progrès.
- **Puces de matières** : filtrent la liste des modules sans changer d'écran ; « Toutes » par défaut ;
  la dernière puce choisie est mémorisée.
- **Liste des modules** : statut (non commencé ○, en cours ◐, validé ✅), pourcentage, mention
  « conseillé après Mx » pour les modules en avance sur l'ordre conseillé.
- **Concours blanc** et **test de positionnement** : accès directs (§ 16, § 17).

### 7.2 Écran Module

```
┌───────────────────────────────┐
│ ← Module 3 · Décentralisation │
│ ██████░░░░ 40 %   ⬇ Hors ligne│
├─ LEÇONS ──────────────────────┤
│ ✅ 1. Définitions       6 min  │
│ ◐  2. Les collectivités 8 min  │
│ ○  3. Les finances      7 min  │
├─ EXERCICES DE FIXATION ───────┤
│ ● Niveau 1 · Application  8/10 │
│ ● Niveau 2 · Entraînement  —   │
│ 🔒 Niveau 3 · Approfondi       │ « 70 % au niveau 2 requis »
├─ POUR ALLER PLUS LOIN ────────┤
│ 📄 3 anciens sujets liés       │
└───────────────────────────────┘
```

- **Leçons** : numéro, titre, durée estimée, statut. Appui → leçon (§ 9).
- **Exercices par niveau** :
  - **Niveau 1 — Application** : questions directes sur une leçon, une notion à la fois.
  - **Niveau 2 — Entraînement** : plusieurs notions du module mélangées.
  - **Niveau 3 — Approfondissement** : compréhension avancée, cas pratiques, pièges, format concours.
  - Chaque niveau affiche son meilleur score et le nombre de questions.
- **Pour aller plus loin** : anciens sujets liés aux notions du module ; ouvre l'onglet Sujets déjà filtré.
- **Hors ligne** : télécharge le pack du module (§ 22).

### 7.3 Règles de progression

- Les modules sont **conseillés** dans l'ordre mais **restent ouverts** (déverrouillage souple).
- Le **niveau 3** est verrouillé tant que le niveau 2 n'atteint pas **70 %**.
- Un **module est validé** quand toutes ses leçons sont terminées et que le niveau 2 atteint 70 %.
- Une **leçon est terminée** quand l'utilisateur atteint la fin de la lecture.
- Seuils paramétrables par l'administrateur, par programme.
- Le score d'un niveau retenu est le **meilleur** obtenu ; chaque session est néanmoins enregistrée.

---

## 8. Onglet Sujets (existant)

- Reprend le parcours actuel : organisme → type de parcours → catalogue → documents → fiche.

### 8.1 Règles d'accès aux anciens sujets — **inchangées** (décision du 2026-11-05)

Le module de préparation **ne modifie aucune règle** d'accès aux anciens sujets. Règles en vigueur
(source : `backend/services/billing/downloadGuard.js` et `backend/config/billing.js`) :

| Profil | Sujets ≤ 2009 | Sujets 2010 – 2020 | Sujets ≥ 2021 (2021 … 2026 et plus) ou année inconnue |
|---|---|---|---|
| Visiteur sans compte | Gratuit | Quota gratuit : 3 téléchargements au total (à vie) | **Abonnement obligatoire** |
| Compte sans abonnement / expiré | Gratuit | Quota gratuit : 3 au total (à vie) | **Abonnement obligatoire** |
| **Abonné (premium)** | Gratuit | Accès à tous les sujets — quota abonné de 20 téléchargements par 24 h glissantes | |
| Administration | Gratuit | Illimité | |

En résumé : **l'abonné a accès à tous les sujets** ; **l'utilisateur gratuit n'a pas accès aux sujets
récents** (à partir de 2021, ainsi que ceux d'année inconnue) et dispose de 3 téléchargements au total
pour 2010-2020. Les visiteurs anonymes sont en plus plafonnés par adresse IP. Les seuils sont des
paramètres d'environnement existants ; ils ne sont pas modifiés par ce projet.

- **L'essai de préparation (§ 25) ne donne aucun droit supplémentaire sur les anciens sujets.**
- L'abonnement acheté pour la préparation est le **même** que celui des anciens sujets : il ouvre les deux.

### 8.2 Évolution liée à la préparation
- Nouveauté : peut être ouvert **déjà filtré** depuis un module (« anciens sujets liés »), avec un
  bandeau « Filtré : Décentralisation ✕ ».
- Le procédé anti-doublons du dépôt (`docs/referentiel-sujets/`) reste obligatoire pour toute publication de sujet.

---

## 9. Leçon (plein écran)

### 9.1 Composition en blocs

| Bloc | Rendu |
|---|---|
| Texte riche | Titres, gras, listes, citations ; typographie confortable (Inter, interligne généreux) |
| **À retenir** | Encadré or, synthèse mémorisable |
| **Piège fréquent** | Encadré bordeaux, erreur classique à éviter |
| **Exemple** | Encadré illustratif, peut se replier |
| Image / schéma | Zoom par pincement, légende |
| Formule | Rendu mathématique lisible |
| Tableau | Défilement horizontal si nécessaire |
| **Mini-question** | N'importe quel type d'exercice (§ 11), non notée, corrigée immédiatement |
| Récapitulatif | Liste des points clés en fin de leçon |

### 9.2 Comportement

- Barre de progression de lecture en haut ; **reprise à la position quittée**.
- Taille du texte réglable (A− / A+), mémorisée.
- Fin de leçon : écran « Leçon terminée » avec le récapitulatif et deux actions :
  **Passer aux exercices** (niveau 1 du module) · **Leçon suivante**.
- Les mini-questions ratées n'entrent pas dans le cahier d'erreurs (non notées), mais leur notion
  est signalée comme fragile pour la révision espacée.
- Temps de lecture comptabilisé dans l'objectif du jour.

---

## 10. Session d'exercices (plein écran)

### 10.1 Déroulement

```
┌───────────────────────────────┐
│ ✕   ████████░░░░  7 / 12   💡 │ ← quitter · progression · indice
├───────────────────────────────┤
│ Consigne (courte, en gras)    │
│                               │
│   Zone d'interaction du type  │
│                               │
├───────────────────────────────┤
│        [   Vérifier   ]       │ ← actif dès qu'une réponse est complète
└───────────────────────────────┘
```

- Une session de niveau contient 10 à 15 questions tirées du niveau, dans un ordre mélangé.
- La correction n'est déclenchée que par **« Vérifier »** (aucune correction involontaire).
- Après correction, le bouton devient **« Continuer »**.
- **Quitter** : confirmation, sauvegarde, reprise exacte via « Continuer » sur Prépa.
- **Fin de session** : écran bilan — score, questions justes du premier coup, secondes chances
  réussies, erreurs ajoutées au cahier, temps passé, évolution du rang ; actions **Recommencer**,
  **Revoir mes erreurs**, **Retour au module**. Animation de célébration sobre si un seuil est franchi
  (niveau 3 débloqué, module validé).

### 10.2 Barème

| Situation | Points de la question |
|---|---|
| Juste du premier coup | 100 % |
| Juste en seconde chance | 50 % |
| Indice utilisé | −20 % (cumulable) |
| Score partiel (types qui le permettent) | Proportionnel aux éléments justes |
| Raisonnement validé par l'IA | Pas de points supplémentaires ; la notion est marquée « maîtrisée » |

---

## 11. Moteur d'exercices et types

### 11.1 Architecture

Un moteur unique **`ExerciseEngine`** gère la session : ordre, mélange, minuterie, sauvegarde,
correction, seconde chance, mini-cours, raisonnement IA, envoi des tentatives. Chaque type est un
**module enfichable** :

```
components/exercises/<type>/
  Renderer    composant d'interaction (gestes, animations, états)
  validator   correction pure : réponse → { correct, partiel, détail par élément }
  schema      format JSON du contenu (validé par l'API, le générateur IA et l'outil admin)
  Preview     aperçu dans l'outil d'administration
```

- Ajouter un type ne modifie ni le moteur ni les autres types.
- Les **validateurs sont partagés** entre mobile et serveur ; le serveur fait foi (score, classement).
- Bibliothèques : `react-native-gesture-handler`, `react-native-reanimated`, `react-native-svg`, `expo-haptics`.
- Chaque Renderer gère les états : *vierge*, *en cours*, *complet* (Vérifier actif), *corrigé juste*,
  *corrigé faux*, *seconde chance*, *lecture seule* (révision du cahier d'erreurs).

### 11.2 Glisser pour compléter (texte ou liste à trous)

- **Consigne type** : « Complète la phrase avec les bons mots. »
- **Affichage** : texte ou liste avec emplacements vides ; en dessous, une **réserve d'étiquettes**
  incluant des **distracteurs** (mauvaises réponses plausibles).
- **Geste** : glisser une étiquette vers un emplacement ; l'emplacement survolé s'illumine et
  « aimante » l'étiquette ; relâcher hors d'un emplacement la renvoie dans la réserve avec un ressort.
  Une étiquette placée peut être reprise et déplacée.
- **Alternative** : toucher une étiquette (elle se soulève), puis toucher l'emplacement.
- **Correction** : par emplacement ; étiquette juste en vert ; étiquette fausse en rouge, qui revient
  avec un rebond dans la réserve pendant que la bonne se place. Score partiel.
- **Variantes** : une étiquette utilisable plusieurs fois ; plusieurs réponses acceptées par emplacement.

### 11.3 Entourer les bonnes réponses

- **Consigne type** : « Entoure les institutions créées par la Constitution de 2016. »
- **Affichage** : mots ou propositions disposés librement (nuage, texte ou grille).
- **Geste** : toucher un élément trace autour de lui un **cercle façon stylo** (tracé SVG animé,
  légèrement irrégulier, ~350 ms) ; toucher à nouveau l'efface.
- **Correction** : plusieurs réponses justes possibles ; bonne sélection en vert ; mauvaise sélection
  barrée en rouge ; bonne réponse oubliée entourée en pointillés. Pénalité par mauvaise sélection.
- Le nombre de réponses attendues peut être affiché ou caché (paramètre de l'exercice).

### 11.4 Remettre dans l'ordre

- **Consigne type** : « Classe ces événements du plus ancien au plus récent. »
- **Geste** : appui long pour soulever un élément (ombre, léger agrandissement), puis glisser ; les
  autres éléments s'écartent en douceur.
- **Alternative** : flèches monter / descendre sur chaque élément.
- **Correction** : ordre exact (tout ou rien) ou score selon les éléments bien placés (paramètre) ;
  les éléments mal placés glissent vers leur position correcte, numérotés.

### 11.5 Relier (deux colonnes)

- **Consigne type** : « Relie chaque auteur à son œuvre. »
- **Geste** : glisser d'un point d'ancrage à gauche vers un point à droite ; un trait courbe suit le doigt.
  Appui sur un trait existant pour le supprimer.
- **Alternative** : toucher un élément de gauche puis un élément de droite.
- **Correction** : par paire ; trait juste en vert, faux en rouge pointillé, trait correct dessiné ensuite.
- Colonnes mélangées ; nombre d'éléments possiblement différent (intrus).

### 11.6 Classer dans des catégories

- **Consigne type** : « Range chaque compétence dans la bonne collectivité. »
- **Affichage** : 2 à 4 bacs nommés ; pile de cartes à classer.
- **Geste** : glisser une carte dans un bac ; le bac s'ouvre légèrement au survol ; compteur par bac.
- **Correction** : carte par carte ; les cartes mal rangées volent vers le bon bac.

### 11.7 Vrai / Faux rapide

- **Consigne type** : affirmations successives.
- **Geste** : balayer la carte à droite (Vrai) ou à gauche (Faux) ; la carte s'incline et se teinte
  selon la direction ; boutons Vrai / Faux en alternative.
- **Mode chronométré** facultatif (barre de temps par carte).
- **Correction** : immédiate après chaque carte ou en fin de série (paramètre) ; explication courte.

### 11.8 QCM (réponse unique ou multiple)

- **Affichage** : propositions sous forme de cartes larges (lettre + texte), mélangées.
- **Geste** : appui ; sélection animée (bordure, coche) ; en mode multiple, cases à cocher.
- **Correction** : bonne réponse en vert, choix faux en rouge ; score partiel en mode multiple.

### 11.9 Réponse numérique

- **Affichage** : énoncé + champ de réponse + **pavé numérique intégré** (virgule, signe, unités éventuelles).
- **Correction** : tolérance paramétrable (valeur exacte, ±x, ±x %) ; unité vérifiée si demandée ;
  la correction peut montrer le détail du calcul.

### 11.10 Surligner dans un texte

- **Consigne type** : « Surligne la phrase qui contient l'idée principale » / « Repère la faute ».
- **Geste** : glisser le doigt sur les mots ; surlignage façon feutre ; toucher un passage surligné l'efface.
- **Correction** : par segment attendu ; tolérance sur les mots de bordure ; segments oubliés en pointillés.

### 11.11 Règles communes à tous les types

- **Mélange déterministe** (graine par session) : propositions et ordre mélangés ; ordre stable si la
  session est reprise ; nouveau mélange à la session suivante et à la seconde chance.
- **Indice** (💡) : un indice par question, défini par l'exercice ; coûte 20 % des points.
- **Accessibilité** : alternative « toucher puis toucher » à chaque geste ; cibles ≥ 44 pt ; libellés
  pour lecteurs d'écran ; pas d'information portée par la couleur seule (icônes ✓ / ✕).
- **Haptique** distincte : élément posé, bonne réponse, erreur, fin de session.
- **Sauvegarde continue** de l'état de la question en cours.
- **Signaler** (menu ⋯) : « Erreur dans l'énoncé », « Réponse contestable », « Autre » → file de relecture (§ 26).
- Les réponses attendues ne sont jamais présentes en clair dans l'application avant la tentative
  (sauf packs hors ligne, chiffrés, § 22).

---

## 12. Flux d'une question : seconde chance, mini-cours et raisonnement

```
Réponse ──► Vérifier
   │
   ├─ JUSTE ──► Correction animée + explication courte
   │             │
   │             └─ Si la question est marquée « raisonnement » :
   │                  [Expliquer mon raisonnement]   [Question suivante]
   │                        │ (facultatif)
   │                        ▼
   │                  Saisie du raisonnement → Vérification IA (§ 13)
   │                   ├─ Logique exacte ──► « Bien raisonné » ──► Question suivante
   │                   └─ Logique fausse / incomplète ──► l'IA explique la bonne démarche
   │                                                     ──► Question suivante
   │                                                     (notion mise en révision espacée)
   │
   └─ FAUX (1re tentative) ──► Modal « Mini-cours »
                                  rappel bref de la notion (≤ 150 mots, schéma possible)
                                  [Réessayer]
                                     │
                                     ▼
                               SECONDE CHANCE (propositions re-mélangées)
                                  ├─ JUSTE ──► 50 % des points ──► suite comme « JUSTE »
                                  │                                (raisonnement possible)
                                  └─ FAUX ───► Correction détaillée + explication
                                               ──► ajout au CAHIER D'ERREURS
                                               ──► Question suivante
```

### 12.1 Fenêtre « Mini-cours »

- S'ouvre en **feuille modale** qui monte du bas (~320 ms), sur un fond assombri ; la question reste
  visible en arrière-plan, floutée.
- En-tête : pastille « Rappel » + nom de la notion ; corps : explication courte (≤ 150 mots), un bloc
  « À retenir », éventuellement un mini-schéma ou un exemple.
- Ne révèle **jamais** la bonne réponse : il redonne la règle qui permet de la trouver.
- Un seul bouton principal **« Réessayer »** ; lien secondaire « Voir la leçon complète » (ouvre la leçon
  à l'endroit de la notion, puis revient à la question).
- Ne se ferme pas par un geste accidentel : glisser vers le bas demande la confirmation « Passer la seconde chance ? »
  (si oui, la question est comptée fausse et entre au cahier d'erreurs).

### 12.2 Fenêtre « Raisonnement »

- Feuille modale avec champ de texte large, compteur de caractères, exemple de formulation (« J'ai
  d'abord… puis… donc… »), bouton **Vérifier mon raisonnement** et lien **Passer**.
- Pendant l'analyse : animation d'attente sobre et texte « Analyse de ton raisonnement… ».
- Résultat dans la même feuille (§ 13.2), puis bouton **Question suivante**.
- Visiteur sans vérification restante : la feuille montre le badge **Abonnés** et le bouton **S'abonner**.

### 12.3 Précisions

- **Le raisonnement est toujours facultatif** : l'utilisateur peut passer directement à la question suivante.
- Le **mini-cours** est un contenu propre à chaque exercice (ou à sa notion), rédigé à la production (§ 26).
  Il se ferme par « Réessayer » ; il reste consultable ensuite depuis le cahier d'erreurs.
- Pour le Vrai / Faux et le QCM à deux propositions, la seconde chance porte sur une **question
  jumelle** (même notion, formulation différente) quand elle existe, pour éviter la réponse par élimination.
- En **concours blanc**, il n'y a ni seconde chance ni mini-cours (conditions réelles) ; les erreurs
  vont directement au cahier d'erreurs à la fin.
- En **révision du cahier d'erreurs**, la seconde chance est proposée de la même façon.

---

## 13. Vérification du raisonnement par IA

### 13.1 Objectif

Distinguer la bonne réponse **trouvée par hasard** de la bonne réponse **comprise**, et expliquer la
démarche correcte quand le raisonnement est faux.

### 13.2 Fonctionnement

- Proposée uniquement sur les questions marquées **« raisonnement »** (choix fait à la production).
- L'utilisateur rédige son raisonnement (texte libre, 1 000 caractères max ; dictée vocale en option, § 33).
- Chaque question concernée contient un **raisonnement de référence** et des **étapes clés attendues**
  (grille de correction). L'IA compare le raisonnement de l'utilisateur à cette grille : elle
  n'invente pas la bonne réponse, ce qui garantit des verdicts fiables et cohérents.
- Réponse structurée de l'IA : `{ verdict: exact | partiel | faux, étapesValidées[], étapesManquantes[], explication }`.
- Rendu : verdict en tête (icône + couleur), étapes clés cochées / manquantes, explication en
  français simple, bienveillante, ≤ 120 mots.
- Un raisonnement **partiel** est traité comme faux pour la révision espacée, mais formulé positivement.
- L'utilisateur peut **contester** un verdict (« Je pense que mon raisonnement est juste ») → file de relecture.

### 13.3 Droits

- **Visiteur en essai : 3 vérifications gratuites au total** (pas par jour), comptées par le serveur
  sur l'identité appareil. Le compteur est affiché à côté du bouton (« 2 vérifications offertes restantes »).
- Au-delà, le bouton reste visible avec le badge **Abonnés** ; l'appui ouvre l'écran Abonnement.
- **Abonné** : quota mensuel confortable (valeur à fixer, § 33) ; message clair si atteint.

### 13.4 Exigences techniques

- Appels **uniquement via le backend** ; aucune clé dans l'application.
- Délai cible < 4 s ; indicateur d'attente soigné (« Analyse de ton raisonnement… »).
- Échec, délai dépassé ou hors ligne : affichage du raisonnement de référence, la vérification
  **n'est pas décomptée**.
- Journalisation des raisonnements et verdicts pour contrôle qualité ; filtrage des contenus hors
  sujet ou inappropriés ; limitation de débit.

---

## 14. Cahier d'erreurs

- **Alimentation automatique** : question ratée **après la seconde chance** ; erreur en concours
  blanc ; raisonnement jugé faux ou partiel (marqué « à comprendre »).
- **Accès** : carte « À réviser aujourd'hui » de Prépa, et Progrès › Cahier d'erreurs.
- **Organisation** : par matière puis module ; compteur par matière ; tri par date ou fréquence.
- **Fiche d'erreur** : énoncé, réponse donnée, bonne réponse, explication, mini-cours, raisonnement
  de référence, nombre de ratés, date de dernière tentative.
- **Session « Réviser mes erreurs »** : uniquement ces questions, re-mélangées, avec seconde chance.
- **Sortie du cahier** : après **2 réussites consécutives** espacées d'au moins un jour.
- Consultation possible même après la fin de l'essai (sessions verrouillées, fiches lisibles).

---

## 15. Révision espacée

- Toute notion ratée (ou jugée fragile : mini-question ratée, raisonnement faux) génère une carte de révision.
- Intervalles : **J+1, J+3, J+7, J+14** ; une réussite fait passer à l'intervalle suivant ; un échec ramène à J+1.
- Une carte réussie à J+14 est considérée comme **maîtrisée** (retirée des révisions).
- Les révisions dues du jour + le cahier d'erreurs alimentent la carte « À réviser aujourd'hui »
  (session de 20 questions maximum, priorité aux plus anciennes).
- Notification facultative du matin (§ 21).

---

## 16. Test de positionnement

- Proposé une fois après le choix du concours (facultatif, « Plus tard » possible), rejouable depuis Progrès.
- ~5 minutes, 15 à 20 questions de niveaux variés réparties sur les matières.
- Bilan : niveau estimé par matière (débutant / intermédiaire / avancé), points forts, points faibles,
  **module de départ conseillé** par matière ; les modules jugés acquis sont signalés « à survoler ».
- Ne modifie pas les scores des modules ; n'alimente pas le classement.

---

## 17. Concours blanc

- Reproduit les **conditions du concours** du programme : durée, matières, nombre de questions, barème
  (paramétrés par l'administrateur).
- Questions tirées de tout le programme (niveaux 2 et 3 majoritairement).
- Minuterie visible ; navigation libre entre les questions ; marquage « à revoir » ; aucune correction
  avant la fin ; remise automatique à la fin du temps.
- Peut être mis en pause une fois (sauf mode « strict »).
- **Bilan** : note sur le barème du concours, rang parmi les participants du cycle, temps par question,
  matières faibles, correction détaillée question par question ; erreurs ajoutées au cahier.
- La meilleure note alimente le score de classement (§ 20.4).

---

## 18. Série de jours et objectif quotidien

- **Objectif quotidien** réglable : 5, 10 ou 20 minutes d'étude (leçons + sessions), choisi au premier
  passage sur Prépa, modifiable dans Moi › Paramètres.
- **Série (🔥)** : nombre de jours consécutifs où l'objectif est atteint ; un **gel de série** par
  semaine protège un jour manqué.
- Rendu sobre et adulte : pas de mascotte, pas de gadgets ; une animation discrète quand l'objectif est atteint.
- Les jours de série sont indépendants des jours d'essai (§ 25.3).

---

## 19. Onglet Progrès — statistiques personnelles

- **En-tête** : rang dans le cycle (« 40ᵉ sur 50 · ENA Cycle B ») et variation hebdomadaire (▲ / ▼).
- **Progression par matière** : barres (modules validés / total), score moyen par niveau.
- **Notions maîtrisées** : nombre et part du programme.
- **Activité** : temps d'étude par jour sur 4 semaines, série actuelle et record.
- **Résultats** : questions répondues, taux de réussite du premier coup, secondes chances réussies,
  erreurs effectuées, erreurs corrigées, raisonnements validés.
- **Concours blancs** : courbe des notes.
- Raccourcis : Cahier d'erreurs, Test de positionnement, Classement.

---

## 20. Classement et liste des candidats

### 20.1 Rang

Visible en tête de Progrès et en rappel sur Prépa : **« Tu es 40ᵉ sur 50 · ENA Cycle B »**, avec la
variation depuis la semaine précédente. Le total compte les candidats actifs du programme sur la période.

### 20.2 Écran « Candidats du cycle »

```
 Période : [Cette semaine] [Ce mois] [Depuis le début]

 1  Aminata K.     ██████████  Score 92
    1 240 questions · 14 modules validés · 86 erreurs · 94 % · 🔥 41
 2  Yao B.         █████████░  Score 89
 …
40  Toi            ████░░░░░░  Score 54   ← ligne mise en évidence, épinglée en bas
```

- Liste triée par rang ; podium (3 premiers) mis en valeur ; défilement virtualisé.
- **Ma ligne** reste épinglée en bas de l'écran tant qu'elle n'est pas visible.
- Chaque ligne : rang, avatar, pseudonyme, score, questions répondues, modules validés, erreurs
  effectuées, taux de réussite, série. Le nombre d'erreurs est toujours accompagné du taux de réussite
  (beaucoup d'erreurs signifie aussi beaucoup d'entraînement).

### 20.3 Profil de statistiques d'un candidat

Appui sur une ligne → profil : questions répondues, modules validés (par matière), erreurs effectuées,
taux de réussite, raisonnements validés, série actuelle et record, meilleure note au concours blanc,
matières fortes. Comparaison « Toi / Lui » sur ces indicateurs pour orienter ses efforts.

### 20.4 Score de classement

Le rang ne récompense pas le volume brut (répondre au hasard à beaucoup de questions ne doit pas faire
monter). Score calculé **par le serveur** (pondérations paramétrables) :

```
score = 50 % maîtrise    (réussite du premier coup, pondérée par niveau : N1 ×1, N2 ×1,5, N3 ×2)
      + 25 % progression (modules validés / modules du programme)
      + 15 % concours blancs (meilleure note normalisée)
      + 10 % régularité  (jours actifs sur les 30 derniers jours)
```

Recalcul à chaque synchronisation et consolidation périodique (cache de classement).

### 20.5 Confidentialité

- Affichage par **pseudonyme** (attribué automatiquement, § 25.1) et avatar ; jamais d'e-mail ni de téléphone.
- Option **« Ne pas apparaître dans le classement »** (Moi › Paramètres) : l'utilisateur voit toujours son
  rang calculé mais n'est pas visible des autres. Visibilité par défaut : à trancher (§ 33).
- Signalement d'un pseudonyme inapproprié.

### 20.6 Participation des visiteurs en essai

Les visiteurs en essai sont classés **exactement comme les abonnés** : leurs données transitent par le
serveur (§ 25.5), qui calcule leur score et leur rang à partir de leurs tentatives. Ils voient leur rang
et celui des autres, et les autres les voient sous leur pseudonyme automatique. Un visiteur dont l'essai
est épuisé reste dans le classement avec des statistiques figées.

---

## 21. Notifications

| Notification | Déclencheur | Réglage |
|---|---|---|
| Objectif du jour | Objectif non atteint à l'heure choisie | Heure réglable |
| Révisions du jour | Révisions dues le matin | Activable |
| Série en danger | Fin de journée sans activité, série ≥ 3 | Activable |
| Rang | Gain ou perte de 3 places ou plus dans la semaine | Activable |
| Essai | J-2 et dernier jour d'interaction restant | Toujours |
| Nouveau contenu | Module publié dans le programme suivi / cycle « Me prévenir » | Activable |

Toutes désactivables dans Moi › Paramètres (sauf l'information d'essai, affichée de toute façon dans l'app).

---

## 22. Hors ligne

- **Pack de module** : leçons, médias compressés, exercices (réponses chiffrées) ; taille affichée avant
  téléchargement ; gestion dans Moi › Téléchargements (supprimer, mettre à jour).
- Utilisables sans réseau : leçons, sessions, seconde chance, mini-cours, cahier d'erreurs, révisions.
- Nécessitent le réseau : vérification IA (repli : raisonnement de référence, non décompté),
  classement à jour, concours blanc (téléchargement préalable possible).
- Les tentatives hors ligne sont mises en file et **synchronisées** au retour du réseau ; le serveur
  recalcule les scores.
- Pendant l'essai, un jour d'interaction hors ligne compte comme les autres (§ 25.3).

---

## 23. Onglet Moi

- **Identité** : avatar, pseudonyme ; visiteur : bouton « Créer mon compte » ; abonné : modification
  de l'identité (§ 25.6).
- **Essai / Abonnement** : visiteur → jours d'interaction restants (ex. « 3 / 7 utilisés »), vérifications
  IA restantes, bouton S'abonner ; abonné → échéance, renouvellement, codes promo, portefeuille (écrans existants).
- **Téléchargements** : PDF des anciens sujets + packs hors ligne.
- **Paramètres** : objectif quotidien, notifications, taille du texte, visibilité dans le classement,
  réglages PDF (filigrane, pied de page — issus de l'ancien drawer), revoir l'écran d'accueil.
- **Administration** (administrateurs) : tableau de bord, catalogue pédagogique, production de contenu
  (§ 26), méthodes de paiement.
- Se déconnecter (abonné).

---

## 24. Écran Abonnement (préparation)

- Accès depuis : bandeau d'essai, élément verrouillé, bouton IA « Abonnés », Moi.
- Contenu : rappel de ce qui a été accompli (« 3 modules validés · 40ᵉ sur 50 · 120 questions »),
  bénéfices de l'abonnement (préparation illimitée, vérification IA, concours blancs, anciens sujets),
  prix et durée de la formule existante, moyens de paiement existants.
- **C'est le même abonnement** que celui des anciens sujets : un seul achat donne accès aux deux.
- Le paiement passe par la création (ou la connexion) d'un compte, puis la synchronisation (§ 25.5).

---

## 25. Identité, essai gratuit et abonnement

### 25.1 Identité automatique

- Au premier lancement, sans aucune saisie, l'application crée une **identité appareil** :
  identifiant unique, **pseudonyme généré** (ex. « Baobab-4821 », liste de mots ivoiriens / neutres +
  nombre) et avatar (initiales sur couleur de la marque).
- Cette identité est utilisée dans le classement et pour toutes les données locales.
- Elle est **conservée** lors du passage à un compte (même pseudonyme, même historique).

### 25.2 Pas de compte obligatoire pendant l'essai

L'essai est utilisable sans inscription. Le compte n'est demandé qu'au **paiement** (ou si l'utilisateur
souhaite s'inscrire plus tôt, ce qui ne change rien à l'essai).

### 25.3 Essai = 7 jours d'interaction

- L'essai ne se compte **pas en jours calendaires** mais en **jours d'interaction distincts** :
  un utilisateur qui s'absente un mois conserve ses jours restants.
- **Jour d'interaction** : jour calendaire (fuseau de l'appareil, Abidjan par défaut) au cours duquel
  l'utilisateur effectue **au moins une action de préparation** : ouvrir une leçon, répondre à un
  exercice, lancer une session, une révision, un concours blanc ou le test de positionnement.
  La simple ouverture de l'app ou la consultation des anciens sujets ne consomme pas de jour
  (les anciens sujets gardent leurs propres règles de quota).
- Plusieurs actions le même jour = **un seul jour consommé**.
- Après le **7ᵉ jour d'interaction**, l'essai est épuisé (fin de la journée en cours incluse :
  l'utilisateur termine sa journée sans être interrompu).
- Affichage permanent : « Essai : 4 jours restants » (Prépa, Moi), alertes à 2 jours et au dernier jour.
- **3 vérifications IA offertes** pendant l'essai, comptées séparément (§ 13.3).

### 25.4 Détection d'une réinstallation (anti-contournement)

Objectif : qu'une désinstallation / réinstallation ne redonne pas un essai neuf, et que l'application
retrouve **combien de jours et de vérifications IA il reste**.

Mécanismes combinés :

1. **Identifiant persistant local**
   - iOS : identifiant stocké dans le **Trousseau** (Keychain via `expo-secure-store`), qui survit à la
     désinstallation ; complété par `identifierForVendor`.
   - Android : **`ANDROID_ID`** (via `expo-application`), stable pour une même application et un même
     appareil après réinstallation ; complété par la sauvegarde automatique Android.
2. **Attestation de l'appareil par la plateforme**
   - iOS : **DeviceCheck** (Apple conserve 2 bits par appareil, persistants même après réinstallation ou
     réinitialisation) → bit « essai commencé », bit « essai épuisé ».
   - Android : **Play Integrity** pour vérifier que l'application et l'appareil sont authentiques
     (contre les émulateurs et applications modifiées).
3. **Registre d'essais côté serveur**
   - L'application déclare son identité appareil au premier lancement ; le serveur tient le registre :
     jours d'interaction consommés (dates), vérifications IA utilisées, statut.
   - À chaque réinstallation, l'application retrouve son registre via les identifiants ci-dessus et
     **restaure le compteur** (« Bon retour ! Il te reste 3 jours d'essai »).
4. **Empreinte de secours** (modèle, version du système, langue, résolution…) utilisée uniquement
   comme indice de rapprochement, jamais seule.

Règles :
- En cas de doute (identifiants divergents mais empreinte identique), on applique **le compteur le
  plus consommé**.
- Interdits : IMEI, numéro de série, adresse MAC ou tout identifiant matériel prohibé par les règles
  d'Apple et Google.
- La politique de confidentialité informe de ce mécanisme.

### 25.5 Stockage et synchronisation (décision du 2026-11-05 : tout transite par le serveur)

Pour faire simple et permettre le classement, **les données de tous les utilisateurs — essai compris —
sont envoyées au serveur**, rattachées à l'identité appareil (visiteur) ou au compte (abonné).
Il n'y a qu'un seul mode de fonctionnement, quel que soit le profil.

| Donnée | Visiteur en essai | Abonné |
|---|---|---|
| Progression, tentatives, cahier d'erreurs, révisions, positions de lecture, concours blancs | Serveur (identité appareil) | Serveur (compte) |
| Registre d'essai (jours consommés, vérifications IA) | Serveur | — |
| Raisonnements soumis à l'IA | Serveur | Serveur |
| Copie locale | Cache pour la rapidité et le hors-ligne | Idem |

- **Le serveur est la référence** ; le téléphone garde une copie locale (cache) qui sert à l'affichage
  immédiat et au hors-ligne (§ 22). Les actions faites hors ligne sont mises en file et envoyées au
  retour du réseau.
- **On conserve toutes les informations des utilisateurs** : aucune donnée n'est effacée à la fin de
  l'essai, à l'expiration d'un abonnement ou lors du passage au compte.
- **Au paiement** : création ou connexion du compte → l'identité appareil et **toutes ses données déjà
  présentes sur le serveur** sont rattachées au compte (aucun transfert massif depuis le téléphone,
  pas de perte possible) → même pseudonyme, même rang.
- Réinstallation ou changement de téléphone : un visiteur retrouve ses données grâce à la détection de
  l'identité appareil (§ 25.4) ; un abonné les retrouve en se connectant.
- Un compte existant qui se connecte sur un appareil ayant un essai en cours : fusion des deux
  historiques (compteurs additionnés, meilleurs scores retenus).
- Réutilisation de l'existant : le backend gère déjà des visiteurs anonymes pour le quota de
  téléchargements (`services/access/visitorIdentity.js`) ; l'identité appareil s'appuie dessus plutôt
  que de créer un mécanisme parallèle.

### 25.6 Modification de l'identité

- Possible **uniquement après inscription** : pseudonyme (unicité et filtrage des mots inappropriés),
  avatar (photo ou initiales), visibilité dans le classement.
- Le nom réel et les coordonnées du compte ne sont jamais affichés publiquement.

### 25.7 Après l'essai

- Leçons, sessions, concours blancs, test et packs hors ligne : **verrouillés** (visibles, appui → Abonnement).
- Progression, statistiques, cahier d'erreurs (fiches), classement : **consultables**.
- Le paiement débloque l'accès immédiatement, sans perte de données.
- Abonnement expiré : même comportement ; le renouvellement rétablit tout.

### 25.8 Contrôles serveur et triche

- Les droits (`essai actif`, `jours restants`, `IA restantes`, `abonné`) sont **calculés par l'API** ;
  l'application ne fait qu'afficher.
- **Manipulation de l'horloge** : l'application conserve la dernière date connue et un horodatage
  monotone ; un retour en arrière de la date est détecté ; à chaque connexion, les dates sont
  recalées sur l'heure du serveur ; un jour d'interaction hors ligne est validé à la synchronisation.
- Hors ligne prolongé pendant l'essai : les jours sont comptés localement et réconciliés ensuite ; au-delà
  de 7 jours locaux, le verrou s'applique même sans réseau.
- Réutilisation de l'existant : `Subscription` (`currentPeriodEnd`), `useEntitlements` ; ajout d'un
  modèle `EssaiAppareil` (§ 28).

---

## 26. Production du contenu par IA

### 26.1 Principe (décision du 2026-11-05)

Les leçons et exercices sont rédigés par **deux modèles d'IA parmi les plus performants**, qui travaillent
ensemble pour garantir l'exactitude et l'efficacité pédagogique, en respectant les **notions imposées par
les organismes** organisateurs. La **relecture est assurée par le second modèle**. Le **propriétaire de la
plateforme intervient** quand il le souhaite et arbitre les cas litigieux.

Il est recommandé que les deux modèles soient de **familles différentes** (fournisseurs distincts), pour
que leurs erreurs ne se recoupent pas.

### 26.2 Chaîne de production

```
1. Référentiel officiel   Programme de l'organisme découpé en notions codées
                          (ex. ENA-B/CG/DECENTRALISATION-02), saisi ou importé par l'administrateur.

2. Rédaction (modèle A)   Leçons en blocs (§ 9) et exercices au format JSON du type visé (§ 11),
                          avec pour chaque exercice : niveau, notions, explication, mini-cours,
                          indice, question jumelle éventuelle, et — si « raisonnement » —
                          raisonnement de référence + étapes clés.
                          Les anciens sujets publiés servent de référence de style et de difficulté.

3. Contrôles automatiques Validation du schéma JSON, doublons, couverture des notions,
                          longueur des textes, cohérence du niveau.

4. Relecture (modèle B)   - résout chaque exercice SANS connaître la réponse ;
                          - vérifie l'exactitude des faits (lois, dates, chiffres, institutions),
                            l'absence d'ambiguïté, la clarté, le respect du programme ;
                          - contrôle la leçon (exactitude, progression, exemples) ;
                          - produit un rapport : validé / corrections demandées / rejeté.

5. Révision (modèle A)    Intègre les corrections demandées ; retour à l'étape 4.
                          Après 2 allers-retours sans accord → QUARANTAINE.

6. Intervention humaine   Le propriétaire consulte, modifie, valide ou rejette à tout moment ;
                          il tranche obligatoirement les éléments en quarantaine et les faits
                          datés signalés comme incertains.

7. Publication            Élément validé par A et B (et par le propriétaire s'il était en
                          quarantaine) → publié dans le programme.

8. Suivi                  Signalements des utilisateurs, taux d'échec anormal, verdicts IA
                          contestés → retour automatique en relecture (étape 4), puis 6 si besoin.
```

### 26.3 Traçabilité

Pour chaque élément : modèles et versions utilisés, date, notions couvertes, rapports de relecture,
décisions humaines, historique des versions. Une modification d'un élément publié crée une nouvelle
version ; les tentatives passées restent liées à la version jouée.

### 26.4 Tableau de bord de production

Couverture du programme (notions sans contenu), éléments par statut (brouillon, en relecture,
quarantaine, publié), signalements ouverts, taux d'accord A / B, coût de génération.

---

## 27. Outil d'administration

- **Éditeur de programme** : organisme + cycle → notions officielles → matières → modules
  (ordre par glisser-déposer) → leçons → exercices ; seuils de progression ; paramètres du concours blanc.
- **Éditeur de leçon** en blocs avec aperçu mobile en direct.
- **Éditeur d'exercice par type** avec **aperçu en direct** identique au rendu mobile (composant `Preview`).
- Champs : type, niveau, notions, contenu, explication, mini-cours, indice, question jumelle,
  drapeau « raisonnement » + référence + étapes clés, statut.
- **Lancement de la génération** (§ 26) par programme, matière, module ou notion ; suivi des lots.
- **File de relecture** : quarantaine, signalements, verdicts contestés, faits datés.
- Import / export en lot (JSON).
- Statistiques par question : taux de réussite, temps moyen, taux de seconde chance, signalements.
- Gestion des pseudonymes signalés et des comptes.

---

## 28. Modèle de données (cible)

```
Programme        { organisme, parcoursType, titre, seuils{validationModule, niveau3},
                   concoursBlanc{durée, composition, barème}, publié }
NotionOfficielle { programme, code, libellé, matiere, ordre }
Matiere          (existant, réutilisé)
Module           { programme, matiere, ordre, titre, duréeEstimée, notions[], publié }
Lecon            { module, ordre, titre, durée, blocs[], version, statut }
Exercice         (= TrainingQuestion étendu)
                 { module, lecon?, niveau 1-3, type, contenu (JSON selon schéma), notions[],
                   explication, miniCours, indice, jumelle?, raisonnement{actif, référence,
                   étapesClés[]}, statut, version, provenance{modèles, rapports, relecteur} }
Tentative        { identité (appareil|user), exercice, version, réponse, correct, partiel,
                   essai 1|2, indiceUtilisé, durée, contexte (niveau|révision|blanc|test), date }
Raisonnement     { identité, exercice, texte, verdict, étapes, explicationIA, contesté, date }
Progression      { identité, programme, leçons{id, position, terminée}, scores{module, niveau},
                   modulesValidés[], dernièreActivité, série, objectifQuotidien }
CarteRevision    { identité, exercice, notion, échéance, intervalle, origine }
ResultatBlanc    { identité, programme, note, détail, date }
IdentiteAppareil { id, pseudonyme, avatar, identifiants{keychain, androidId, vendorId},
                   empreinte, user?, créé le }
EssaiAppareil    { identitéAppareil, joursInteraction[dates], iaUtilisées, statut, attestation }
ProfilPublic     { identité, pseudonyme, avatar, visibleClassement }
StatsClassement  { identité, programme, période, score, compteurs }
Signalement      { identité, élément, motif, texte, statut }
LotGeneration    { programme, périmètre, modèles, statut, coûts, éléments[] }
```

Migration : `TrainingQuestion.category` conservé pour compatibilité ; les QCM existants deviennent
des exercices de type QCM, niveau 1, en statut « à relire ».

---

## 29. API (aperçu)

```
POST  /api/prep/appareils                         déclaration / restauration de l'identité appareil
GET   /api/prep/droits                            essai (jours restants, IA restantes), abonnement
POST  /api/prep/jours-interaction                 enregistrement d'un jour d'interaction
GET   /api/prep/catalogue                         organismes → cycles disposant d'un programme
GET   /api/prep/programmes/:id                    matières, modules, progression
GET   /api/prep/modules/:id                       leçons, niveaux, statut
GET   /api/prep/lecons/:id
GET   /api/prep/modules/:id/session?niveau=n      exercices (sans les réponses)
POST  /api/prep/exercices/:id/tentative           correction serveur, seconde chance, cahier d'erreurs
POST  /api/prep/exercices/:id/raisonnement        vérification IA (droits + quota)
GET   /api/prep/revisions                         révisions du jour + cahier d'erreurs
POST  /api/prep/sync                              envoi des actions faites hors ligne
POST  /api/prep/rattachement                      rattachement de l'identité appareil au compte (paiement / connexion)
GET   /api/prep/programmes/:id/classement?periode=
GET   /api/prep/programmes/:id/candidats/:identite
POST  /api/prep/signalements
PATCH /api/me/profil-public                       pseudonyme, avatar, visibilité (compte requis)
—     /api/admin/prep/...                         programmes, notions, contenus, génération, relecture
```

Les réponses attendues ne sont **jamais** envoyées avant la tentative, sauf dans les packs hors ligne
(chiffrés ; score recalculé par le serveur à la synchronisation).

---

## 29 bis. Système de composants premium et principes d'interaction

Exigence du propriétaire : les écrans de préparation **ne sont pas de simples écrans** ; ils sont
programmés **composant par composant**, avec un rendu et une ergonomie de niveau expert.

### Principes

1. **Une action principale par écran**, toujours en bas, à portée de pouce.
2. **Tout geste a une réponse immédiate** (< 100 ms) : visuelle, puis haptique.
3. **Le mouvement explique** : une étiquette fausse *retourne* dans la réserve, une bonne réponse
   *se met en place* ; jamais d'animation décorative gratuite.
4. **Rien n'est irréversible sans confirmation** (quitter une session, passer une seconde chance).
5. **Aucun écran vide** : chaque liste a un état de chargement (squelettes), vide, erreur et hors ligne.
6. **Sobriété premium** : identité de la marque (encre, papier, or, bordeaux ; police Inter), pas de mascotte.

### Mouvements de référence

| Usage | Durée | Courbe |
|---|---|---|
| Appui (enfoncement d'un bouton / d'une carte) | 100 ms | sortie rapide |
| Dépliage d'accordéon, feuille modale | 280–320 ms | ressort amorti (pas de rebond visible) |
| Retour d'une étiquette en place / dans la réserve | 350 ms | ressort avec léger rebond |
| Tracé du cercle « Entourer », surlignage | 350 ms | linéaire puis ralentie |
| Correction (coloration, déplacement des bonnes réponses) | 400 ms, éléments échelonnés de 40 ms | ressort amorti |
| Célébration (seuil franchi) | ≤ 1 200 ms | — |

Le réglage « Réduire les animations » du téléphone est respecté (fondus simples à la place).

### Retours haptiques

| Événement | Retour |
|---|---|
| Sélection, dépliage, élément posé | Léger (sélection) |
| Bonne réponse | Succès |
| Mauvaise réponse | Erreur |
| Fin de session, seuil franchi | Succès appuyé |

### Bibliothèque de composants à construire

| Famille | Composants |
|---|---|
| Navigation | Barre d'onglets à pastille, en-tête de programme avec sélecteur, feuille « Changer de concours » |
| Sélection | Accordéon organisme → cycles, ligne de cycle avec coche animée, champ de recherche filtrant |
| Progression | Barre de progression animée, anneau de module, pastille de statut (○ ◐ ✅ 🔒), compteur de série 🔥, jauge d'objectif quotidien |
| Prépa | Carte « Continuer », carte « À réviser », carte de rang, puces de matières, ligne de module, ligne de niveau verrouillable |
| Leçon | Rendu de chaque bloc (§ 9.1), barre de lecture, réglage de taille de texte, écran « Leçon terminée » |
| Session | En-tête de session (quitter, progression, indice), bouton Vérifier / Continuer à états, bandeau de correction, écran bilan |
| Exercices | Un Renderer par type (§ 11.2 à 11.10) + étiquette déplaçable, emplacement aimanté, cercle SVG, trait de liaison, bac de classement, carte balayable, pavé numérique, surligneur |
| Modales | Mini-cours, Raisonnement, verdict IA, confirmation de sortie, verrou Abonnés |
| Classement | Ligne de candidat, podium, ligne « Toi » épinglée, profil de statistiques, comparaison Toi / Lui |
| États | Squelettes, état vide, état erreur, bandeau hors ligne, bandeau d'essai |

Chaque composant est documenté (rôle, propriétés, états) et testé isolément avant d'être assemblé en écran.

---

## 30. Exigences non fonctionnelles

- **Qualité premium** : composants dédiés et réutilisables (`components/ui`, `components/exercises`),
  animations à 60 i/s, transitions cohérentes, retours haptiques, états vides / chargement / erreur
  soignés sur chaque écran.
- **Performance** : fluide sur Android d'entrée de gamme ; ouverture d'un exercice < 300 ms ; listes
  virtualisées ; préchargement de la question suivante seulement.
- **Légèreté data** : médias compressés, packs incrémentaux.
- **Hors ligne** : § 22.
- **Accessibilité** : alternatives aux gestes, contrastes, tailles de police dynamiques, lecteurs d'écran.
- **Design** : identité existante (encre, papier, or, bordeaux ; Inter).
- **Sécurité** : droits, scores et classement calculés par le serveur ; limitation de débit ; aucune clé
  côté application ; base locale chiffrée.
- **Confidentialité** : politique de confidentialité mise à jour (identité appareil, attestation,
  classement, IA) ; conformité aux règles des magasins Apple et Google.
- **Observabilité** : mesures d'usage (sessions, abandons, conversions essai → abonnement), coûts IA.

---

## 31. Plan de réalisation

| Phase | Contenu |
|---|---|
| **0. Cadrage** | **Demander au propriétaire les concours pilotes** (§ 0) ; fixer les points du § 33 |
| **1. Navigation** | Suppression du drawer, 4 onglets, premier lancement, accordéon « Quel concours ? » |
| **2. Identité et essai** | Identité appareil, registre d'essai, jours d'interaction, détection de réinstallation, droits |
| **3. Socle backend** | Programme, notions, modules, leçons, exercices étendus, tentatives, progression, API |
| **4. Production IA** | Chaîne à deux modèles, quarantaine, outil admin de relecture, aperçus |
| **5. Moteur d'exercices** | `ExerciseEngine` + QCM, Vrai/Faux, Glisser pour compléter, Remettre dans l'ordre, Entourer |
| **6. Écrans Prépa** | Prépa, Module, Leçon, session ; seconde chance + mini-cours ; cahier d'erreurs |
| **7. Types avancés** | Relier, Classer, Réponse numérique, Surligner |
| **8. IA raisonnement** | Vérification, 3 essais gratuits, quotas abonnés, contestations |
| **9. Progrès et classement** | Statistiques, rang, liste des candidats, profils, confidentialité |
| **10. Abonnement** | Écran Abonnement, compte au paiement, synchronisation et fusion |
| **11. Fidélisation** | Révision espacée, série, objectif, notifications, test de positionnement, concours blanc |
| **12. Hors ligne** | Packs de modules et synchronisation |

---

## 31 bis. Critères d'acceptation (une fonction est terminée quand…)

| Fonction | Critères |
|---|---|
| Navigation | 4 onglets ; plus de drawer ; aucun écran à plus de 2 niveaux d'un onglet ; « Que veux-tu faire ? » n'apparaît qu'au premier lancement |
| Accordéon « Quel concours ? » | Seuls les organismes au départ ; un seul ouvert à la fois ; animation fluide sur Android d'entrée de gamme ; recherche trouvant aussi les cycles ; cycles sans programme grisés |
| Identité et essai | Pseudonyme créé sans saisie ; un jour consommé seulement à la 1re action de préparation du jour ; aucune consommation pendant une absence ; verrou après le 7ᵉ jour d'interaction |
| Réinstallation | Après désinstallation / réinstallation, jours et vérifications IA restants retrouvés à l'identique (iOS et Android) |
| Exercices | Chaque type utilisable au geste **et** au toucher simple ; correction identique sur mobile et serveur ; mélange stable à la reprise, différent à la session suivante et en seconde chance |
| Flux d'une question | Erreur → mini-cours → seconde chance → cahier d'erreurs si nouvel échec ; raisonnement toujours facultatif |
| IA | 3 vérifications gratuites exactement, décomptées par le serveur, non décomptées en cas d'échec technique ; verdict en < 4 s dans 95 % des cas |
| Cahier d'erreurs / révisions | Une erreur sort après 2 réussites espacées ; révisions aux intervalles J+1, J+3, J+7, J+14 |
| Classement | Visiteurs et abonnés classés ensemble ; rang « Xᵉ sur N » cohérent avec la liste ; profil d'un candidat affichant questions, modules validés, erreurs, réussite ; option de masquage respectée |
| Abonnement | Paiement → compte créé → données rattachées sans perte ; même abonnement que les anciens sujets |
| Anciens sujets | Aucune règle d'accès modifiée (§ 8.1) : tests existants inchangés et au vert |
| Contenu | Aucun exercice publié sans validation des deux modèles (ou du propriétaire en cas de quarantaine) ; traçabilité complète |
| Hors ligne | Pack de module utilisable sans réseau ; tentatives envoyées au retour du réseau |

---

## 32. Décisions prises

| Date | Décision |
|---|---|
| 2026-11-05 | Navigation à 4 onglets (Prépa, Sujets, Progrès, Moi), drawer supprimé, profondeur ≤ 2 |
| 2026-11-05 | « Quel concours ? » : organismes seuls, accordéon animé révélant les sous-organismes |
| 2026-11-05 | Écrans de préparation construits composant par composant, niveau premium |
| 2026-11-05 | Types d'exercices : glisser pour compléter, entourer, remettre dans l'ordre, relier, classer, vrai/faux, QCM, numérique, surligner ; mélange |
| 2026-11-05 | Mauvaise réponse → mini-cours en modal → seconde chance → cahier d'erreurs si nouvel échec |
| 2026-11-05 | Bonne réponse → explication facultative du raisonnement, vérifiée par IA ; sinon explication de la bonne démarche |
| 2026-11-05 | Classement dans le concours/cycle + liste des candidats avec leurs statistiques |
| 2026-11-05 | Contenu rédigé par deux modèles d'IA de pointe ; relecture par le second ; intervention du propriétaire |
| 2026-11-05 | Essai : 7 **jours d'interaction** distincts, sans compte, identité appareil, détection de réinstallation |
| 2026-11-05 | Toutes les données (essai compris) transitent par le serveur pour le classement ; copie locale en cache ; toutes les données sont conservées |
| 2026-11-05 | Règles d'accès aux anciens sujets **inchangées** : abonné = tous les sujets ; gratuit = pas d'accès aux sujets ≥ 2021 (§ 8.1) |
| 2026-11-05 | Identité attribuée automatiquement, modifiable après inscription |
| 2026-11-05 | 3 vérifications IA gratuites pendant l'essai, puis abonnement |
| 2026-11-05 | Même abonnement que les anciens sujets |
| 2026-11-05 | Concours pilotes communiqués plus tard : l'IA doit les demander avant de développer |
| 2026-11-05 | Claude Code collabore avec ChatGPT Plus (Codex CLI) dès que ChatGPT peut produire un rendu plus expert, en priorité pour les images ; Claude reste maître d'œuvre (§ 0, règle 5) |

---

## 33. Questions ouvertes

1. **Concours pilotes** — à communiquer par le propriétaire ; **l'assistant IA doit les demander** avant
   tout développement dépendant d'un programme. *Réponse : —*
2. Quota mensuel de vérifications IA pour les abonnés.
3. Fournisseurs et modèles d'IA retenus (rédaction A, relecture B, vérification du raisonnement), budget mensuel.
4. Pondérations définitives du score de classement.
5. Visibilité dans le classement par défaut (opt-out) ou sur acceptation (opt-in).
6. Dictée vocale pour le raisonnement : dès la phase 8 ou plus tard.
7. Nombre de questions par session de niveau (10 à 15 proposé).
8. Anciens sujets de **2020** : le propriétaire a indiqué « pas d'accès gratuit de 2020 à 2026 et plus »,
   alors que le code actuel place 2020 dans le quota gratuit (accès abonné à partir de 2021). Consigne :
   ne rien changer ; si 2020 doit passer en accès abonné, c'est un simple réglage serveur
   (`DOWNLOAD_FREE_QUOTA_UNTIL_YEAR=2019`). *Réponse : —*

---

## Journal des versions

| Version | Date | Évolution |
|---|---|---|
| 0.6 | 2026-11-05 | Consigne de collaboration Claude Code ↔ ChatGPT Plus via Codex CLI (§ 0, règle 5) et décision correspondante (§ 32) |
| 0.5 | 2026-11-05 | Ajout des parcours utilisateur de bout en bout (§ 4 bis), des fenêtres Mini-cours et Raisonnement (§ 12.1-12.2), du système de composants premium et des principes d'interaction (§ 29 bis), des critères d'acceptation (§ 31 bis) ; question sur les sujets de 2020 |
| 0.4 | 2026-11-05 | Données de l'essai sur le serveur (classement des visiteurs identique aux abonnés) ; règles des anciens sujets explicitement inchangées et rappelées (§ 8.1) |
| 0.3 | 2026-11-05 | Réécriture détaillée de toutes les fonctionnalités ; consignes pour l'IA (concours pilotes à demander) ; essai en 7 jours d'interaction sans compte, identité appareil, détection de réinstallation, stockage local et synchronisation au paiement ; 3 vérifications IA gratuites ; même abonnement ; production par deux modèles d'IA avec relecture croisée et intervention du propriétaire ; profils et droits ; glossaire ; décisions consignées |
| 0.2 | 2026-11-05 | Production du contenu par IA avec chaîne de contrôle ; essai gratuit de 7 jours sans IA puis abonnement |
| 0.1 | 2026-11-05 | Brainstorming initial : navigation 4 onglets, accordéon organismes, moteur d'exercices, flux seconde chance / cahier d'erreurs, raisonnement vérifié par IA, classement et liste des candidats |
