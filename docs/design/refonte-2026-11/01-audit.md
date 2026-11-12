# Audit UI/UX — app mobile Fatafalta (8 novembre 2026)

Périmètre : `fatafalta/` (Expo SDK 56). Méthode : rendu réel Android (Pixel, 1080 × 2424, Expo Go) sur
8 écrans représentatifs + lecture des jetons (`src/theme/`, `src/prep/theme.js`), des primitives
(`src/prep/ui/primitives.js`, `src/components/ui/`) et du skill projet `fatafalta-premium-mobile`.
Référence prioritaire : `docs/maquettes-ecrans-preparation.md` (« La copie d'excellence »).
Note : la pastille ⚙ « Tools » visible en haut à droite des captures est le menu d'Expo Go, pas l'app.

## Verdict

L'identité existe et elle est forte : encre + papier ivoire + pile de copies, Playfair/Inter, or rare,
bordeaux pour l'action, barre d'onglets en capsule. Ce n'est **pas** une app générique. Ce qui la sépare
du top 1 % n'est plus le style mais la **hiérarchie** (trop de blocs de même poids par écran), la
**répétition** (cartes et coins cornés partout, ce qui leur retire leur sens), quelques **incohérences**
entre l'univers Prépa et l'univers Sujets/Compte, et des **finitions** (ordinaux, sur-titres, états).

| Dimension (audit natif Impeccable) | Note /4 | Constat clé |
|---|---|---|
| Accessibilité | 2 | Libellés présents ; grandes polices et contraste des états désactivés non maîtrisés |
| Performance | 3 | Listes virtualisées, Reanimated ; cache d'images ajouté ; quelques re-rendus larges |
| Apparence & thème | 2 | Jetons riches mais 105 couleurs codées en dur ; aucun mode sombre |
| Conformité plateforme | 3 | Gestes et encarts respectés ; deux systèmes de boutons ; sur-titres contraires à la règle |
| Adaptativité | 2 | Grille 3 colonnes tablette côté Sujets ; Prépa non vérifiée en tablette / paysage / grand texte |
| **Total** | **12/20** | **Acceptable** : fondations solides, travail de hiérarchie et de cohérence à faire |

## Écran par écran

**Accueil Prépa** (`src/prep/screens/PrepHomeScreen.js`) — 6,5/10
- P1 Hiérarchie : la seule chose à faire (« Continuer ») arrive en 4ᵉ position, après la carte
  progression et trois tuiles de stats. Les stats doublonnent « Mon bilan ».
- P1 Parcours : 10 modules en cartes identiques, dont 7 « À venir » répétant chacun « Contenu à venir.
  Choisis un autre module en attendant. » → bruit, défilement inutile.
- P1 Sens du coin corné : `CornerFold` (= maîtrisé / recommandé selon le skill) apparaît sur presque
  toutes les lignes, y compris « À venir » → le signe ne veut plus rien dire.
- P2 Ordinal faux : « 1ᵉ sur 3 au classement » (l.295, `${rang}ᵉ`) → « 1ᵉʳ ».
- P2 « Révisions à jour » : texte flottant sans contenant, ligne orpheline.

**Leçon** (`ModuleLessonScreens.js`) — 7,5/10
- Lecture confortable, vidéo bien intégrée, encadré « Piège fréquent » réussi.
- P2 Tableau des règles collé au bord gauche de la feuille (marge incohérente avec le texte).
- P2 Bouton « Vérifier » désactivé beige sur beige : contraste trop faible, on ne lit pas l'état.

**Sujets / organismes** (`src/screens/*`, `src/components/catalog/*`) — 7/10
- Grille d'organismes propre, logos désormais affichés.
- P2 Sur-titre « Anciens sujets » au-dessus du titre (interdit par la règle § 3 du skill).
- P2 Large bandeau d'encre vide sous le titre : la feuille commence trop bas, perte d'un tiers d'écran.

**Mon bilan** (`ProgressScreens.js`) — 7/10
- P2 « 1ᵉ sur 3 candidats » (même bug d'ordinal), sur-titre programme au-dessus du titre.
- P2 Quatre tuiles + tableau « Résultats » répètent les mêmes chiffres ; aucune lecture de tendance.

**Profil / Moi** — 6/10
- P1 Deux grandes actions concurrentes (« S'abonner » or + « Créer mon compte ») dans la même carte.
- P2 Pastilles « 1 / 7 utilisés » : on ne sait pas de quoi (jours d'essai ?).
- P2 Sur-titre « Moi » ; bloc « Explore librement… » coupé par la barre d'onglets.

**Classement / Profil candidat** (lot récent) — 7,5/10 : carte « Toi » réussie ; le podium et la liste
gagneraient à partager un même rythme vertical.

Écrans non capturés (à vérifier au lot concerné) : onboarding (`OnboardingScreens.js`), choix du concours,
session d'exercices / bilan de session (`SessionScreen.js`), révisions (`ReviewsScreen.js`), concours
blanc, abonnement, documents (détail, téléchargements, lecteur PDF), connexion / inscription, portefeuille,
retrait, codes promo, écrans d'administration (`AdminDraftsScreen`, `CatalogManagementScreen`…).

## Problèmes systémiques

1. **Tout est carte.** Modules, stats, réglages, organismes : même boîte, même filet. Le top 1 % alterne
   cartes, listes nues sur papier, et un seul élément « héros » par écran.
2. **Deux systèmes d'interface** : `src/components/ui/` (Button, Card, ListRow… — 7 fichiers utilisent
   `Button`) et `src/prep/ui/primitives.js` (`PrepButton`, 14 fichiers). Mêmes rôles, rendus voisins mais
   pas identiques → incohérences fines entre Prépa et Sujets.
3. **105 couleurs codées en dur** hors thème (les plus gros : `utils/fileIcons.js` 28,
   `TrainingSessionScreen.js` 8, `RegisterScreen.js` 6, `LoginScreen.js` 5).
4. **Sur-titres** au-dessus des titres d'écran (Sujets, Bilan, Moi) alors que le skill les interdit.
5. **Ordinaux** : « 1ᵉ » au lieu de « 1ᵉʳ » à plusieurs endroits.
6. **Pas de mode sombre**, alors que l'univers « encre » s'y prête idéalement.
7. **Grandes polices / petits écrans / tablette** jamais vérifiés côté Prépa.

## Points forts à conserver

Identité « copie d'examen » et `PaperStack` ; typographie Playfair (chiffres en lining) + Inter ; or rare ;
barre d'onglets capsule avec pastille glissante et haptique ; illustrations raster cohérentes ;
`useReduceMotion` respecté ; listes virtualisées ; messages d'erreur désormais professionnels.
