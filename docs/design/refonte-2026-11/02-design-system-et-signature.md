# Design system cible et idées signature

Principe : **on garde le monde « La copie d'excellence »**, on le rend plus rigoureux. Pas de nouvelle
palette, pas de nouvelle typo. Le saut de qualité vient de la hiérarchie, du rythme et de la cohérence.

## 1. Règles de composition (nouvelles)

- **Un héros par écran.** Un seul bloc porte le poids (ex. accueil : la prochaine leçon). Le reste
  descend d'un cran : liste nue sur papier, filets, pas de carte.
- **Carte = objet manipulable** (une copie, un module ouvert, un document). Une statistique, un réglage ou
  une ligne d'information n'est pas une carte : ligne sur papier avec filet `brand.line`.
- **Le coin corné est une récompense** : uniquement sur ce qui est maîtrisé / validé. Jamais sur « à venir ».
- **Contenu à venir regroupé** : les modules non publiés se replient en une seule ligne
  « 7 modules en préparation » (dépliable), pas 7 cartes.
- **Pas de sur-titre** au-dessus d'un titre d'écran ; le contexte (programme, section) va dans l'en-tête
  sur l'encre, en petit, à côté du bouton retour, ou dans un sélecteur.
- **La feuille monte haut** : l'en-tête sur l'encre ne dépasse pas ~22 % de la hauteur d'écran, sauf
  écrans « moment ».

## 2. Jetons (existants, à faire respecter)

Palette, typographie, rayons, ombres et mouvement : inchangés, voir `.claude/skills/fatafalta-premium-mobile`.
Ajouts :
- **Mode sombre « Nuit d'étude »** (lot dédié) : papier → `#0F1A2C` (encre levée), cartes `#16233A`,
  texte `#F3EEE4`, filets `rgba(255,255,255,0.10)`, bordeaux éclairci `#C0566C` pour l'action (contraste
  ≥ 4,5:1 à vérifier), or inchangé. Les « moments » restent identiques.
- **États désactivés** : fond `brand.paperDim`, texte `brand.inkSoft` à 60 %, jamais beige sur beige ;
  le libellé dit pourquoi (« Choisis une réponse »).
- **Ordinal** : un seul utilitaire `ordinal(n)` → « 1ᵉʳ », « 2ᵉ »…, utilisé partout.
- **Un seul système de boutons** : `PrepButton` devient la référence ; `components/ui/Button` en devient
  un alias (même API), pour une migration sans risque.

## 3. Idées signature (sobres, propres à Fatafalta)

1. **La copie du jour** (accueil) : la prochaine leçon présentée comme une copie posée en haut de la pile,
  avec la marge rouge du correcteur où s'écrit la progression (« 2 / 5 exercices »). C'est le héros unique.
2. **Annotations du correcteur** : les retours d'exercice s'affichent comme une annotation manuscrite en
  marge (Playfair italique bordeaux + soulignement `GoldSwash`), pas comme un toast.
3. **Le tampon** : valider un module appose un tampon « Maîtrisé » (or, léger « pop » 220 ms + haptique
  succès), qui devient le coin corné dans la liste. Une seule fois par module.
4. **Le parcours en marge** : la liste des modules suit une ligne verticale de marge (filet bordeaux à
  gauche, comme une copie double), numéros posés dessus ; l'avancement remplit la ligne.
5. **Le cahier d'erreurs** comme un carnet à onglets de matière (onglets latéraux colorés `subjectTint`).
6. **Le classement en tableau d'affichage** : rangs en chiffres Playfair alignés, ligne « Toi » surlignée au
  surligneur or pâle (`goldWash`), comme une liste de résultats affichée au mur.
7. **Nuit d'étude** : le mode sombre n'est pas une inversion mais « la même copie sous une lampe de bureau »
  (léger halo chaud derrière la feuille active).

Chaque idée reste un seul moment par écran, respecte « Réduire les animations », et ne bloque jamais
l'action.
