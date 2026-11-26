# Fatafalta — publicité vidéo (web)

Publicité de 86 s pour fatafalta.com, montée par programme avec Remotion (React/TypeScript).

## Livrables

Toutes les vidéos produites sont rangées **par jour** dans [`videos/`](videos/README.md) : `videos/AAAA-MM/AAAA-MM-JJ/NN-theme/`, avec une `fiche.md` par vidéo.
Pour ranger un nouveau rendu : `npm run ranger -- --sujet "theme"`. Le mode d'emploi complet est dans `videos/README.md`.

Première vidéo (21-11-2026) : `videos/2026-11/2026-11-21/01-publicite-web-86s/`

| Fichier | Contenu |
|---|---|
| `…_horizontal-1920x1080.mp4` | 1920×1080, 16:9, 30 i/s, H.264 + AAC — YouTube, Facebook |
| `…_vertical-1080x1920.mp4` | 1080×1920, 9:16, 30 i/s, H.264 + AAC — TikTok, Reels, Shorts, Stories |
| `…_voix-off.wav` | Voix off seule, calée sur la timeline (48 kHz) |
| `…_sous-titres.srt` | Sous-titres synchronisés (les mêmes que ceux incrustés) |
| `storyboard.md` | Découpage scène par scène et règles appliquées |
| `assets/` | Médias utilisés : captures réelles, photos générées, voix, musique |

`out/` ne sert que de zone de rendu temporaire (ignorée par Git).

Les deux vidéos ont les sous-titres incrustés, ce qui les rend lisibles sans le son. Le SRT sert aux plateformes qui proposent des sous-titres activables, en plus ou à la place.

## Régénérer

Prérequis : Node 20+, ffmpeg, Google Chrome (captures), Python 3 avec `edge-tts` et `numpy`.

```bash
cd fatafalta-promo
npm install

# 1. Captures (facultatif, déjà présentes dans public/captures)
#    Public : fatafalta.com, lecture seule. Préparation : environnement de test local,
#    site sur :3001 et API sur :5001 (base fatafalta-test-web, compte eleve.test.web@example.com).
node scripts/capture.mjs             # pages web, ordinateur
node scripts/capture-orgs.mjs        # pages « anciens sujets » ENA, INPHB, ESATIC, INFJ, ENSEA, EAMAC, ENS…
node scripts/capture-mobile.mjs      # préparation au format iPhone
node scripts/capture-correction.mjs  # exercice corrigé
#    Accueil et catalogue iPhone : Safari du simulateur iOS
#    (xcrun simctl openurl … puis xcrun simctl io … screenshot → public/captures/ios/)

# 2. Voix off par scène + timings mot à mot → public/voice/, src/voice-timings.json
python3 -m pip install edge-tts numpy
python3 scripts/voice.py

# 3. Musique originale → public/music/bed.wav
python3 scripts/music.py 92

# 4. Rendu
npx remotion render src/index.ts Horizontal out/fatafalta-promo-1080p.mp4 --codec h264 --audio-codec aac --crf 16 --pixel-format yuv420p
npx remotion render src/index.ts Vertical   out/fatafalta-promo-vertical.mp4 --codec h264 --audio-codec aac --crf 16 --pixel-format yuv420p
node scripts/srt.mjs            # out/subtitles.srt
node scripts/voiceover-wav.mjs  # out/voiceover.wav

# Aperçu interactif, timeline image par image
npx remotion studio src/index.ts
```

## Modifier
- **Texte de la voix** : `SCENES` dans `scripts/voice.py`. `text` est le sous-titre affiché, `spoken` la graphie phonétique (« I.N.F.J. », « fatafalta point com »). Relancer l'étape 2. La timeline (`src/timeline.ts`) se recale toute seule sur les nouvelles durées. Si un nouveau mot se prononce autrement qu'il ne s'écrit, l'ajouter à `FIX` dans `src/captions.mjs`.
- **Voix** : `VOICE`, `RATE` et `PITCH` dans `scripts/voice.py`. Autres voix masculines : `fr-FR-HenriNeural`, `fr-BE-GerardNeural`, `fr-CH-FabriceNeural`.
- **Respirations entre scènes** : `PRE` et `POST` dans `src/timeline.ts`. Les reporter dans `scripts/srt.mjs` et `scripts/voiceover-wav.mjs`.
- **Scènes** : `src/scenes/S1Hook.tsx` … `S8Cta.tsx`. Chaque animation est accrochée à un mot de la voix avec `wordAt(scene, 'mot')`.
- **Identité** : `src/theme.ts` reprend DESIGN.md (papier `#FCFAF5`, encre `#0D1B32`, or `#B48A48`, Inter). Le logo vectoriel officiel est dans `src/components/ui.tsx`.

## Architecture
- `src/timeline.ts` : durée de chaque scène = respiration + durée mesurée de la voix + respiration ; fondu enchaîné de 10 images.
- `src/Main.tsx` : scènes, voix, musique avec ducking (0,42 → 0,12 pendant la parole, fondu final), sous-titres.
- `src/components/Captions.tsx` : sous-titres mot à mot, le mot prononcé passe en or.
- Une seule base de code pour les deux formats : `useVertical()` adapte chaque composition. Ce n'est pas un recadrage.

## Points à connaître
- **Données de démonstration** : la progression et le rang visibles viennent du compte de test local, alimenté par de vraies réponses notées par le serveur local. Les chiffres du catalogue (1 174 sujets, 25 organismes) sont ceux de fatafalta.com le 21-11-2026 ; les mettre à jour s'ils évoluent (`src/scenes/S3Sujets.tsx`).
- **Vidéo de la leçon** : la miniature et le lecteur montrés en scène 4 sont ceux d'une vidéo YouTube d'un tiers (chaîne Yvan Monka), créditée dans l'interface. Pour une diffusion publicitaire, obtenir son accord ou choisir une leçon dont la vidéo appartient à Fatafalta.
- **Voix** : edge-tts utilise le service de synthèse neuronale de Microsoft Edge. Pour un usage commercial, vérifier les conditions d'utilisation, ou régénérer avec Azure TTS (même voix, sous licence) ou une voix humaine en remplaçant `public/voice/sN.mp3` puis en recalculant les timings.
- **Musique** : composition originale générée par `scripts/music.py`, sans droits tiers.
