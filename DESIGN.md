# Design — Fatafalta web (`frontend/`)

Système visuel du site web et de la PWA (iPhone, mobile, ordinateur). L'application Android Expo a sa
propre identité (« La copie d'excellence », skill `fatafalta-premium-mobile`) : on ne transpose pas
l'une dans l'autre. Le web reprend l'ergonomie de l'app, jamais ses couleurs d'action ni sa typographie.

## Monde

Papier et encre d'une copie de concours, sans décor : surfaces plates, filets fins, une seule couleur
d'action (l'encre), l'or réservé à ce qui est acquis.

| Rôle | Jeton Tailwind | Valeur |
|---|---|---|
| Fond | `paper` / `paper-dim` | #FCFAF5 / #F4F0E6 |
| Surface | `white` | #FFFFFF |
| Texte, action principale | `ink` | #0D1B32 |
| Texte secondaire / discret | `ink-soft` / `ink-muted` | #4F5E72 / #7A8697 |
| Filets | `line` / `line-strong` | #E4DED2 / #CFC7B8 |
| Acquis, maîtrise, soulignement | `gold` (+ `gold-wash`, `gold-ink` pour le texte, `gold-light` sur encre) | #B48A48 |
| Erreur, attention | `burgundy` (+ `burgundy-wash`) | #6C2838 |

Règles : l'or n'est jamais une couleur d'action ni un aplat large ; un module validé, un niveau réussi,
une leçon terminée, un objectif atteint passent à l'or. Le bordeaux ne sert qu'aux erreurs et aux pièges.

## Typographie

Inter seule. Titres très gras et serrés (`text-title-lg`, `font-bold`, tracking -0.025 à -0.03 em),
corps 15–17 px, lecture des leçons en 17 px sur 1,7 d'interligne et 68 caractères de mesure. Chiffres
toujours `tabular-nums`. Pas de sur-titre au-dessus d'un titre.

## Composants

`Button` (primary encre, secondary filet, ghost, gold sur fond encre), `Card`, `EmptyState`,
`SkeletonRows` (`components/ui`). Espace de préparation (`prep/ui.js`) : `MasteryBar` (encre → or),
`LessonMark` (numéro / anneau encre proportionnel / coche or), `LessonVideo` (miniature seule tant
qu'on ne lance pas la vidéo, lecteur YouTube sans cookie au clic, chaîne créditée), `OrgMark`
(→ `OrganismeLogo`).

Cartes : objets manipulables seulement (tâche principale, module ouvert, vidéo, carte de session).
Listes, statistiques et réglages : lignes sur papier séparées par des filets.

## Mise en page

- Pages publiques : conteneur 1180 px (`max-w-site`), en-tête et pied de page du site.
- Espace d'étude (`/preparation/:programme…`) : 1400 px, sans pied de page. Ordinateur : rail 248 px
  (programme, Mon plan / Programme / Progrès, lien Sujets), contenu, colonne de contexte 300–340 px
  (≥ 1280 px). Mobile : barre d'onglets en bas (Mon plan, Programme, Progrès, Sujets) au-dessus de la
  zone sûre ; action principale d'une leçon fixée en bas.
- Session d'exercices : mode concentration, colonne de 760 px, progression segmentée.

## Mouvement

Courbe `cubic-bezier(0.16, 1, 0.3, 1)` (framer-motion `easeOut` / Tailwind `ease-emphasized`),
220–380 ms. Un mouvement signature par écran : l'indicateur d'onglet qui glisse (rail, barre basse),
l'ouverture d'un module, le changement de vue. `prefers-reduced-motion` : fondus de 150 ms seulement.

## PWA

`public/manifest.webmanifest` (thème papier, icônes 192/512 + maskable), `public/sw.js` (réseau
d'abord pour les pages, cache d'abord pour les fichiers versionnés, données publiques de préparation
en secours, jamais de données personnelles), écrans de lancement iPhone (`public/splash`), guide
d'installation Safari (`components/site/PwaHelper.js`).
