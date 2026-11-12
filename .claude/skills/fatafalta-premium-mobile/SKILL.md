---
name: fatafalta-premium-mobile
description: Règles graphiques, composants, mouvement et critères de qualité de l'application mobile Fatafalta (Expo / React Native, dossier fatafalta/). À charger avant toute création ou modification d'écran, de composant, d'illustration ou d'animation de l'app mobile, en plus des skills globaux de design (impeccable, emil-design-eng, animate-expo, ui-ux-pro-max).
---

# Fatafalta premium mobile — « La copie d'excellence »

Référence : `docs/maquettes-ecrans-preparation.md` (direction artistique, v0.2), complétée par les
références visuelles validées par le propriétaire le 5 novembre 2026 (planche couleurs/composants + 10 écrans).
Ce skill en est la version opérationnelle : il dit **quoi utiliser dans le code**.

## 1. Identité

- Concept : la copie d'examen. Fond encre (nuit) pour les « moments », papier ivoire pour l'étude,
  or pour la valeur (rare), bordeaux pour l'action.
- **Chaque écran est une feuille posée sur une pile de copies** : composant `PaperStack`
  (`src/prep/ui/primitives.js`). Fond encre + trame, une feuille fantôme dépasse en haut, la feuille
  papier (rayon haut 28) porte le contenu. L'en-tête (retour, titre court, actions) vit sur l'encre,
  au-dessus de la feuille. Écrans à onglets (Prépa, Progrès) : même principe dans le `ScrollView`
  (`header` + `sheetWrap/ghost/sheet`).
- Moments (fin de leçon, bilan de session, abonnement, concours blanc) : fond `NightBackground` plein
  écran + panneau papier arrondi 28 en bas pour les actions.

## 2. Jetons (ne jamais coder une couleur en dur hors de cette liste)

| Rôle | Jeton | Valeur |
|---|---|---|
| Encre / texte | `brand.ink` / `inkDeep` / `inkGlow` | #0D1B32 / #081224 / #264069 |
| Texte secondaire | `brand.inkSoft` (≥ 4,5:1 sur papier) | #4F5E72 |
| Papier (fond) / carte | `brand.paper` / `brand.sheet` | #FCFAF5 / #FFFEFB |
| Filets | `brand.line` / `lineStrong` | #E4DED2 / #CFC7B8 |
| **Action principale** | `brand.burgundy` (+ `burgundyBright`, `burgundyDeep` pour le relief) | #6C2838 |
| Fond sélection | `brand.burgundyWash` | #F4E9EA |
| Or | `gold` / `goldLight` (sur encre) / `goldInk` (texte sur papier) / `goldWash` | #B48A48 / #E4C997 / #7A5A24 / #F6EEDF |
| Sémantique | `colors.success` / `error` / `warning` (+ `*Wash`) | #1F7A55 / #B42318 / #8F530F |
| Matières | `subjectTint(i)` → `{ tint, wash }` | 6 teintes (`src/prep/theme.js`) |

Or : jamais en aplat large, jamais en texte < 17 pt sur papier (utiliser `goldInk`).

## 3. Typographie

- **Playfair Display** (serif, `theme.fontFamily.serif`, `serifItalic`) : titres d'écran, titres de
  section, chiffres héros. Variantes `Text` : `display` 40, `title` 32, `h1` 28, `h2` 22 ; styles
  `type.display`, `type.hero`, `type.numeral` (prep).
- **Inter** : tout le reste (h3 17 SemiBold, body 15, caption 13, boutons 16 SemiBold).
- Chiffres Playfair : toujours `fontVariant: ['lining-nums']` (déjà dans les jetons ; sinon le « 0 »
  devient un « o »). Petits nombres dans des pastilles / formules longues : Inter Bold.
- Accent éditorial : un mot en Playfair italique bordeaux ou or clair (« *à ton rythme.* »,
  pseudonyme) + trait de pinceau `GoldSwash` sous le titre. Une fois par écran au maximum.
- **Pas de sur-titre (overline) au-dessus d'un titre** : le titre se suffit. L'overline n'est permise
  que dans un badge.

## 4. Composants (src/prep/ui/primitives.js)

| Composant | Usage |
|---|---|
| `PaperStack` | Cadre de tout écran poussé (header sur encre + feuille) |
| `PrepButton` | `primary` bordeaux plein (56) · `secondary` blanc filet bordeaux (52) · `link` = **tertiaire** : pastille bordeaux pâle (48) · `gold` (abonnement seulement) · `light` |
| `InlineAction` | Petite action en ligne (« Me prévenir »…) : pastille compacte bordeaux pâle (34) |
| `Card` | Carte ivoire rayon 18, filet hairline, ombre `shadows.soft` |
| `CornerFold` | Coin corné or en relief = « maîtrisé / validé / recommandé ». `cut` = couleur du fond derrière |
| `SubjectIcon` | Pastille de matière (plein ou `soft`), icône déduite du nom |
| `Segmented` | Onglets internes, pastille bordeaux glissante |
| `StatTile` | Statistique : icône dans un disque lavé, chiffre Playfair, libellé |
| `SectionTitle` | Titre de section Playfair + mention à droite |
| `ProgressRing` / `ProgressBar` / `AnimatedNumber` | Progression (anneau or par défaut) |
| `GoldSwash` | Soulignement pinceau or |
| `StepDots` (Onboarding) | Étapes : pastille longue or |

Section Sujets (composants partagés, `src/components/`) : `ScreenHeader` dessine l'en-tête nuit et le
bord de la pile de copies (feuille fantôme + bord papier arrondi) ; `ListRow` et `DocumentCard` sont des
cartes encadrées (une « copie » par élément, chevron bordeaux dans un disque) ; les organismes s'affichent
en grille de `OrganismCard` (2 colonnes, 3 sur tablette). Noms longs : sigle en Playfair + nom complet sur
2 lignes, sinon nom centré sur 3 lignes en césure équilibrée avec corps dégressif (15 → 14 → 13 pt) ;
jamais de troncature d'un nom court, lecteur d'écran = nom complet.

Barre d'onglets : `src/navigation/PremiumTabBar.js`, capsule d'encre flottante, pastille ivoire qui
glisse (ressort) et porte l'icône + le libellé de l'onglet actif, haptique, masquée clavier ouvert.
Barre système Android : masquée en mode immersif (`expo-navigation-bar` 56, plugin `hidden: true` +
`<NavigationBar hidden />` dans `App.js`).

Profondeur : **pas d'élévation Android sur les cartes**, ombres iOS quasi nulles (`shadows.soft/card/sm`).
La carte se distingue par le ton (blanc `brand.sheet` sur papier) et un filet. Seuls les éléments
réellement flottants (feuilles modales, menus, barre d'onglets, élément soulevé pendant un glisser)
portent une ombre visible.

**Un bouton se lit toujours comme un bouton** : jamais de texte nu cliquable. Toute action porte un
fond ou un contour (plein, contour, pastille pâle) ; toute ligne cliquable porte un chevron bordeaux
dans un disque `burgundyWash`.

Boutons ronds sur l'encre : 44 × 44, fond blanc 8 %, filet blanc 16 %. Bouton fixe en bas : sur un
dégradé papier transparent → `brand.paper` (`LinearGradient`), jamais sur un aplat opaque.

États de ligne : fait = disque `success` + coche + `CornerFold` ; en cours / conseillé = bordure
bordeaux 1,5 + numéro bordeaux ; à venir = cercle `lineStrong` ; verrouillé = disque `paperDim` + `Lock`.

## 5. Illustrations et images

- Rendus raster premium générés via `chatgpt-delegate` (journal : `fatafalta/assets/_generated/PROMPTS.md`),
  détourés (`rembg`), recadrés et déclinés par `python3 scripts/prep-illustration.py <src> <nom> <taille_pt>`
  dans `assets/illustrations/` (@1x/@2x/@3x), exposés par `src/prep/ui/art.js` (`ART.*`).
- Disponibles : `welcomeSheet` (copie 18/20), `medal` (médaille + lauriers), `emblem` (F corné 3D),
  `notebook` (carnet + parcours), `laurels[0..2]` (or, argent, bronze).
- Icônes d'interface : Lucide, trait 1,9–2,2. Jamais d'émoji comme icône (🔥 → `Flame`).
- Les SVG de `src/prep/ui/Illustrations.js` restent pour les petits pictos (boussole, chronomètre, nuage).

## 6. Mouvement et haptique

Jetons `motion` (`src/prep/theme.js`) : press 100 ms / 0,97 · enter 420 ms + 12 pt · stagger 40 ms ·
sheet (ressort 22/220) · snap (14/260) · count 600 ms. Reanimated uniquement (transform, opacity).
« Réduire les animations » → `useReduceMotion()` : fondus 150 ms, aucun flottement ni rebond.
Haptique via `src/prep/feedback.js` (`haptic.select/success/error/celebrate`), jamais pendant la lecture.
Un seul moment animé signature par écran (ex. copie qui flotte, médaille qui « pop »).

## 6 bis. Composition (refonte 2026-11, voir `docs/design/refonte-2026-11/`)

- Un seul héros par écran ; le reste en listes nues sur papier avec filets, pas en cartes.
- Carte = objet manipulable (copie, module, document). Stat, réglage, info = ligne, pas carte.
- `CornerFold` uniquement sur le maîtrisé / validé, jamais sur « à venir ».
- Modules non publiés regroupés en une ligne dépliable (« N modules en préparation »).
- Ordinaux via `ordinal(n)` : « 1ᵉʳ », jamais « 1ᵉ ».
- État désactivé lisible (`paperDim` + texte `inkSoft`), libellé qui dit pourquoi.
- En-tête sur encre ≤ ~22 % de la hauteur (hors écrans « moment ») ; contexte en petit dans l'en-tête.

## 7. Contrôle avant livraison

1. Rendu réel vérifié (Expo web 390 × 844 au minimum ; natif dès que possible), captures relues.
2. `npx expo export --platform android --platform ios` compile.
3. Une seule action principale, dans le tiers bas ; cibles ≥ 44 ; texte ≥ 4,5:1.
4. Aucun sur-titre décoratif, aucune couleur hors jetons, or rare, chiffres Playfair en lining.
5. États : chargement, vide, erreur / hors ligne, verrouillé (essai terminé).
6. Logique métier, routes et données inchangées (refonte = rendu uniquement).
