# Publicité web 86 s — 2026-11-21

## Identité

- **Date** : 2026-11-21
- **Thème** : publicité générale de fatafalta.com (première vidéo)
- **Outil de génération** : Remotion (montage par programme), voix edge-tts `fr-FR-RemyMultilingualNeural`, musique originale générée (`scripts/music.py`), photos générées par IA
- **Objectif** : faire connaître la plateforme : anciens sujets de tous les concours ivoiriens, corrigés, leçons vidéo, exercices corrigés, concours blancs, progression
- **Public visé** : élèves et candidats aux concours (BAC, BEPC, CAFOP, INFAS, grandes écoles)

## Fichiers

| Fichier | Contenu |
|---|---|
| `2026-11-21_publicite-web-86s_horizontal-1920x1080.mp4` | 16:9, 86 s, sous-titres incrustés — YouTube, Facebook |
| `2026-11-21_publicite-web-86s_vertical-1080x1920.mp4` | 9:16, 86 s, sous-titres incrustés — TikTok, Reels, Shorts, Stories |
| `2026-11-21_publicite-web-86s_sous-titres.srt` | Sous-titres activables |
| `2026-11-21_publicite-web-86s_voix-off.wav` | Voix off seule (48 kHz) |

## Script / prompt utilisé

Découpage complet scène par scène : `fatafalta-promo/storyboard.md`. Texte de la voix : `SCENES` dans `fatafalta-promo/scripts/voice.py`.
Pour régénérer : voir « Régénérer » dans `fatafalta-promo/README.md`, puis `npm run ranger -- --sujet "…"`.

## Contrôle avant publication

- [x] 2 minutes au plus (86 s)
- [x] Seulement des points forts (sélection resserrée de captures, gros chiffres)
- [x] Chiffres réels au 21-11-2026 : 1 174 sujets publiés, 25 organismes
- [x] Le site web seulement
- [x] Sous-titres incrustés, lisibles sans le son
- [ ] Droits à vérifier :
  - la scène 4 montre la vidéo YouTube d'un tiers (chaîne Yvan Monka) : obtenir son accord, ou la remplacer par une vidéo appartenant à Fatafalta ;
  - pour un usage commercial de la voix edge-tts, vérifier les conditions, ou passer à Azure TTS (même voix, sous licence).
- [x] Logo et couleurs Fatafalta respectés

## Publication

| Plateforme | Format | Date | Lien |
|---|---|---|---|
| | | | |

## Statut

**brouillon** (droits de la scène 4 et de la voix à régler avant diffusion publicitaire)

## Notes

Données de démonstration (progression, rang) issues du compte de test local. Mettre les chiffres du catalogue à jour s'ils évoluent (`src/scenes/S3Sujets.tsx`).
