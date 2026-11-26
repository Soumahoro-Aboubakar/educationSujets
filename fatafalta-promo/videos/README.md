# Vidéos promotionnelles Fatafalta — classement par jour

Les vidéos de promotion sont générées par IA au fil des jours. Chacune est rangée ici, **par mois, puis par jour, puis une vidéo par dossier**, avec une fiche qui dit ce qu'elle est, comment elle a été faite et où elle a été publiée.

## Organisation

```
videos/
├── README.md                     ← ce fichier
├── _modele-fiche.md              ← modèle de fiche (copié automatiquement)
└── 2026-11/                      ← un dossier par MOIS (AAAA-MM)
    ├── 2026-11-21/               ← un dossier par JOUR (AAAA-MM-JJ)
    │   ├── 01-publicite-web-86s/ ← une VIDÉO : numéro d'ordre du jour + thème
    │   │   ├── fiche.md
    │   │   ├── 2026-11-21_publicite-web-86s_horizontal-1920x1080.mp4
    │   │   ├── 2026-11-21_publicite-web-86s_vertical-1080x1920.mp4
    │   │   ├── 2026-11-21_publicite-web-86s_sous-titres.srt
    │   │   └── 2026-11-21_publicite-web-86s_voix-off.wav
    │   └── 02-autre-theme/       ← deuxième vidéo du même jour
    └── 2026-11-22/
        └── 01-…
```

### Pourquoi ce découpage

| Niveau | Format | Rôle |
|---|---|---|
| Mois | `AAAA-MM` | Garde la liste courte : environ 30 dossiers par mois au lieu de centaines à la racine. |
| Jour | `AAAA-MM-JJ` | La date en tête trie les dossiers dans l'ordre chronologique, partout (Finder, Drive, Git). |
| Vidéo | `NN-theme` | `NN` = ordre de création dans la journée (`01`, `02`…). Le thème dit le sujet sans ouvrir le fichier. |

### Noms de fichiers

`AAAA-MM-JJ_theme_role.ext` : le nom reste compréhensible quand le fichier circule seul (WhatsApp, Drive, plateformes).

| Rôle | Exemple | Usage |
|---|---|---|
| `horizontal-1920x1080` | `…_horizontal-1920x1080.mp4` | YouTube, Facebook, site |
| `vertical-1080x1920` | `…_vertical-1080x1920.mp4` | TikTok, Reels, Shorts, Stories, statut WhatsApp |
| `carre-1080x1080` | `…_carre-1080x1080.mp4` | Publication Facebook / Instagram dans le fil |
| `sous-titres` | `…_sous-titres.srt` | Sous-titres activables sur les plateformes |
| `voix-off` | `…_voix-off.wav` | Voix seule, pour remonter ou traduire |
| `musique` | `…_musique.wav` | Fond musical seul |
| `miniature` | `…_miniature.png` | Image de couverture (YouTube, Facebook) |

Thème : minuscules, sans accents, mots séparés par des tirets (`rentree-bac`, `infas-anciens-sujets`).

## Ranger une nouvelle vidéo (automatique)

Depuis `fatafalta-promo/` :

```bash
# Vidéo montée avec Remotion : range le dernier rendu (out/), daté d'aujourd'hui
npm run ranger -- --sujet "rentree-bac"

# Vidéo générée par une autre IA (Sora, Runway, Canva, ChatGPT…)
npm run ranger -- --sujet "infas-concours" --outil "Sora" --fichier ~/Downloads/clip.mp4

# Plusieurs fichiers, autre jour, en déplaçant au lieu de copier
npm run ranger -- --sujet "ensea" --date 2026-11-20 --deplacer \
  --fichier ~/Downloads/ensea.mp4 --fichier ~/Downloads/ensea.srt --fichier ~/Downloads/couverture.png
```

Le script :
1. crée `videos/AAAA-MM/AAAA-MM-JJ/NN-theme/`. Le même thème le même jour réutilise le même dossier ;
2. reconnaît le format (horizontal, vertical, carré) avec ffprobe et renomme chaque fichier ;
3. crée `fiche.md` à partir du modèle, avec la liste des fichiers et leur durée ;
4. **n'écrase jamais** un fichier existant (un doublon devient `…-2`) ;
5. signale une vidéo de plus de 2 minutes.

Il reste à **compléter la fiche** : objectif, script ou prompt, contrôle, publication, statut.

## Règles de contenu (à cocher dans chaque fiche)

- 2 minutes au plus.
- Uniquement les points forts : aucun écran qui révèle une faiblesse (organisme à 1 ou 2 sujets, classement « 3e sur 3 », score 0/20, progression 0 %, « corrigé pas encore publié »).
- Chiffres réels, jamais inventés, et à jour le jour de la vidéo.
- Le site web seulement pour l'instant (l'application mobile sera mise en avant plus tard).
- Droits vérifiés : voix, musique, images et vidéos de tiers.

## Git

Les vidéos et les sons sont **lourds** : ils ne sont pas envoyés dans Git (voir `.gitignore` à la racine du projet). Seuls ce `README.md`, le modèle et les `fiche.md` sont versionnés : l'historique de ce qui a été produit et publié est conservé, les fichiers eux-mêmes restent sur ce Mac.
**Pense à sauvegarder `videos/` ailleurs** (disque externe, Google Drive…) : sans Git, une suppression est définitive.
